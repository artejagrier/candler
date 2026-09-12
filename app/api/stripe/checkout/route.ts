import { z } from "zod";
import { PRODUCTS } from "@/lib/billing/entitlements";
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
    const { data: existing } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("workspace_id", context.workspaceId)
      .not("stripe_customer_id", "is", null)
      .limit(1)
      .maybeSingle();

    const stripe = stripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      ...(existing?.stripe_customer_id
        ? { customer: existing.stripe_customer_id }
        : { customer_email: (await supabase.auth.getUser()).data.user?.email }),
      line_items: [{ price, quantity: 1 }],
      success_url: `${SITE_URL}/app/settings/billing?checkout=success`,
      cancel_url: `${SITE_URL}/app/settings/billing`,
      client_reference_id: context.userId,
      metadata: { workspace_id: context.workspaceId, owner_id: context.userId, product_key: body.product },
      subscription_data: {
        metadata: { workspace_id: context.workspaceId, owner_id: context.userId, product_key: body.product },
      },
    });
    return Response.json({ url: session.url });
  } catch {
    return safeErrorResponse("Checkout could not be started.", 503);
  }
}
