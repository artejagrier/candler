import type Stripe from "stripe";
import { stripeClient } from "@/lib/billing/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeErrorResponse } from "@/lib/security/redaction";
import { productFromPriceId } from "@/lib/billing/entitlements";

function periodEnd(subscription: Stripe.Subscription): string | null {
  const itemEnd = subscription.items.data[0]?.current_period_end;
  const fallback = "current_period_end" in subscription ? Number(subscription.current_period_end) : NaN;
  const seconds = itemEnd ?? (Number.isFinite(fallback) ? fallback : null);
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

async function syncSubscription(subscription: Stripe.Subscription) {
  const admin = createAdminClient();
  const workspaceId = subscription.metadata.workspace_id;
  const ownerId = subscription.metadata.owner_id;
  const priceId = subscription.items.data[0]?.price.id;
  const product = productFromPriceId(priceId);
  if (!workspaceId || !ownerId || !product) {
    throw new Error("Subscription metadata or price mapping is incomplete.");
  }
  const customer = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const { error } = await admin.from("subscriptions").upsert(
    {
      workspace_id: workspaceId,
      owner_id: ownerId,
      stripe_customer_id: customer,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      ...product,
      status: subscription.status,
      current_period_end: periodEnd(subscription),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );
  if (error) throw error;
  await admin.from("audit_events").insert({
    workspace_id: workspaceId,
    actor_id: ownerId,
    event_type: "billing.subscription_changed",
    target_type: "subscription",
    metadata: { productKey: product.product_key, status: subscription.status },
  });
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return safeErrorResponse("Invalid webhook.", 400);

  try {
    const raw = await request.text();
    const stripe = stripeClient();
    const event = stripe.webhooks.constructEvent(raw, signature, secret);
    const admin = createAdminClient();

    const { error: claimError } = await admin.from("stripe_webhook_events").insert({
      id: event.id,
      event_type: event.type,
    });
    if (claimError?.code === "23505") return Response.json({ received: true, duplicate: true });
    if (claimError) throw claimError;

    try {
      switch (event.type) {
        case "customer.subscription.created":
        case "customer.subscription.updated":
        case "customer.subscription.deleted":
          await syncSubscription(event.data.object);
          break;
        case "checkout.session.completed": {
          const session = event.data.object;
          if (session.subscription) {
            const id = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
            const subscription = await stripe.subscriptions.retrieve(id);
            if (!subscription.metadata.workspace_id && session.metadata?.workspace_id) {
              await stripe.subscriptions.update(id, {
                metadata: {
                  workspace_id: session.metadata.workspace_id,
                  owner_id: session.metadata.owner_id ?? "",
                  product_key: session.metadata.product_key ?? "",
                },
              });
            }
            await syncSubscription(await stripe.subscriptions.retrieve(id));
          }
          break;
        }
        case "invoice.payment_failed":
        case "invoice.paid": {
          const invoice = event.data.object;
          const details = invoice.parent?.subscription_details;
          const subscriptionId = details?.subscription;
          if (subscriptionId) {
            const id = typeof subscriptionId === "string" ? subscriptionId : subscriptionId.id;
            await syncSubscription(await stripe.subscriptions.retrieve(id));
          }
          break;
        }
        default:
          break;
      }
    } catch (error) {
      await admin.from("stripe_webhook_events").delete().eq("id", event.id);
      throw error;
    }

    return Response.json({ received: true });
  } catch {
    return safeErrorResponse("Invalid or unprocessable webhook.", 400);
  }
}
