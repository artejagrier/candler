import { z } from "zod";
import { PRODUCTS, isLiveSubscription } from "@/lib/billing/entitlements";
import { stripeClient } from "@/lib/billing/stripe";
import { SITE_URL } from "@/lib/env";
import { safeErrorResponse } from "@/lib/security/redaction";
import { getWorkspaceContext } from "@/lib/data/workspace";
import { createClient } from "@/lib/supabase/server";

const input = z.object({ product: z.enum(["candler_pro", "cloud_500", "cloud_1tb"]) }).strict();

export async function POST(request: Request) {
  const context = await getWorkspaceContext();
  if (!context) return safeErrorResponse("Authentication required.", 401);

  try {
    const body = input.parse(await request.json());
    const product = PRODUCTS[body.product];
    const price = process.env[product.envPriceId];
    if (!price) throw new Error("Missing price");

    const supabase = await createClient();
    const { data: rows } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id, stripe_subscription_id, status, current_period_end")
      .eq("workspace_id", context.workspaceId)
      .not("stripe_customer_id", "is", null);

    const live = (rows ?? []).find((row) => isLiveSubscription(row.status, row.current_period_end) && row.stripe_subscription_id);
    const customerId = live?.stripe_customer_id ?? rows?.find((row) => row.stripe_customer_id)?.stripe_customer_id ?? null;
    const stripe = stripeClient();
    const metadata = { workspace_id: context.workspaceId, owner_id: context.userId, product_key: body.product };

    if (live?.stripe_subscription_id) {
      const subscription = await stripe.subscriptions.retrieve(live.stripe_subscription_id);
      const itemId = subscription.items.data[0]?.id;
      if (!itemId) throw new Error("Subscription item missing.");
      if (subscription.items.data[0]?.price.id !== price) {
        await stripe.subscriptions.update(live.stripe_subscription_id, {
          items: [{ id: itemId, price }],
          metadata,
          proration_behavior: "create_prorations",
        });
      }
      return Response.json({ url: `${SITE_URL}/app/settings/billing?checkout=success` });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      ...(customerId
        ? { customer: customerId }
        : { customer_email: (await supabase.auth.getUser()).data.user?.email }),
      line_items: [{ price, quantity: 1 }],
      success_url: `${SITE_URL}/app/settings/billing?checkout=success`,
      cancel_url: `${SITE_URL}/app/settings/billing`,
      client_reference_id: context.userId,
      metadata,
      subscription_data: { metadata },
    });
    return Response.json({ url: session.url });
  } catch {
    return safeErrorResponse("Checkout could not be started.", 503);
  }
}
