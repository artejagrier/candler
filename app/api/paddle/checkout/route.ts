import { z } from "zod";
import { PRODUCTS, isLiveSubscription } from "@/lib/billing/entitlements";
import { paddleClient } from "@/lib/billing/paddle";
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
    const priceId = process.env[product.envPriceId];
    if (!priceId) throw new Error("Missing price configuration.");

    const supabase = await createClient();
    const { data: rows } = await supabase
      .from("subscriptions")
      .select("paddle_customer_id, paddle_subscription_id, status, current_period_end")
      .eq("workspace_id", context.workspaceId)
      .not("paddle_customer_id", "is", null);

    const live = (rows ?? []).find(
      (row) => isLiveSubscription(row.status, row.current_period_end) && row.paddle_subscription_id,
    );

    const paddle = paddleClient();

    // Upgrade/downgrade existing subscription inline (no new checkout flow needed)
    if (live?.paddle_subscription_id) {
      await paddle.subscriptions.update(live.paddle_subscription_id, {
        items: [{ priceId, quantity: 1 }],
        prorationBillingMode: "prorated_immediately",
      });
      return Response.json({ upgraded: true });
    }

    // New subscription — create a server-side transaction with verified custom_data.
    // The workspace_id is injected here and cannot be forged by the client.
    const paddleCustomerId =
      (rows ?? []).find((r) => r.paddle_customer_id)?.paddle_customer_id ?? undefined;

    const transaction = await paddle.transactions.create({
      items: [{ priceId, quantity: 1 }],
      customerId: paddleCustomerId ?? null,
      customData: {
        workspace_id: context.workspaceId,
        owner_id: context.userId,
        product_key: body.product,
      },
    });

    return Response.json({ transactionId: transaction.id });
  } catch {
    return safeErrorResponse("Checkout could not be started.", 503);
  }
}
