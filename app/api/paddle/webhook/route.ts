import { EventName } from "@paddle/paddle-node-sdk";
import type { SubscriptionNotification, TransactionNotification } from "@paddle/paddle-node-sdk";
import { paddleClient } from "@/lib/billing/paddle";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeErrorResponse } from "@/lib/security/redaction";
import { productFromPriceId } from "@/lib/billing/entitlements";

// Paddle-Signature header: "ts=TIMESTAMP;h1=HMAC_HEX"
export const dynamic = "force-dynamic";

async function syncSubscription(subscription: SubscriptionNotification) {
  const admin = createAdminClient();
  const customData = subscription.customData as {
    workspace_id?: string;
    owner_id?: string;
    product_key?: string;
  } | null;
  const workspaceId = customData?.workspace_id;
  const ownerId = customData?.owner_id;
  const priceId = subscription.items[0]?.price?.id;
  const product = productFromPriceId(priceId);

  if (!workspaceId || !ownerId || !product) {
    throw new Error("Subscription custom_data or price mapping is incomplete.");
  }

  const currentPeriodEnd = subscription.currentBillingPeriod?.endsAt ?? null;

  // Mirror scheduled change so the app can show "cancels on <date>" without
  // revoking access — the subscription remains active until effectiveAt.
  const scheduledChangeAction = subscription.scheduledChange?.action ?? null;
  const scheduledChangeEffectiveAt = subscription.scheduledChange?.effectiveAt ?? null;

  const { error } = await admin.from("subscriptions").upsert(
    {
      workspace_id: workspaceId,
      owner_id: ownerId,
      paddle_customer_id: subscription.customerId,
      paddle_subscription_id: subscription.id,
      paddle_price_id: priceId,
      ...product,
      status: subscription.status,
      current_period_end: currentPeriodEnd,
      scheduled_change_action: scheduledChangeAction,
      scheduled_change_effective_at: scheduledChangeEffectiveAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "paddle_subscription_id" },
  );
  if (error) throw error;

  await admin.from("audit_events").insert({
    workspace_id: workspaceId,
    actor_id: ownerId,
    event_type: "billing.subscription_changed",
    target_type: "subscription",
    metadata: {
      productKey: product.product_key,
      status: subscription.status,
      scheduledChangeAction,
    },
  });
}

// Ensures paddle_customer_id is linked before subscription.created may arrive.
async function syncTransactionCompleted(transaction: TransactionNotification) {
  if (!transaction.subscriptionId || !transaction.customerId) return;
  const customData = transaction.customData as {
    workspace_id?: string;
    owner_id?: string;
  } | null;
  if (!customData?.workspace_id || !customData?.owner_id) return;

  const admin = createAdminClient();
  // Only patches rows where customer_id is still null — subscription events are authoritative.
  await admin
    .from("subscriptions")
    .update({ paddle_customer_id: transaction.customerId })
    .eq("paddle_subscription_id", transaction.subscriptionId)
    .is("paddle_customer_id", null);
}

export async function POST(request: Request) {
  const signature = request.headers.get("Paddle-Signature");
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!signature || !secret) return safeErrorResponse("Invalid webhook.", 400);

  try {
    const raw = await request.text();
    const paddle = paddleClient();
    const event = await paddle.webhooks.unmarshal(raw, secret, signature);
    const admin = createAdminClient();

    const { error: claimError } = await admin.from("paddle_webhook_events").insert({
      id: event.eventId,
      event_type: event.eventType,
    });
    if (claimError?.code === "23505") return Response.json({ received: true, duplicate: true });
    if (claimError) throw claimError;

    try {
      switch (event.eventType) {
        case EventName.SubscriptionCreated:
        case EventName.SubscriptionActivated:
        case EventName.SubscriptionUpdated:
        case EventName.SubscriptionResumed:
        case EventName.SubscriptionTrialing:
        case EventName.SubscriptionCanceled:
        case EventName.SubscriptionPaused:
        case EventName.SubscriptionPastDue:
          await syncSubscription(event.data as SubscriptionNotification);
          break;
        case EventName.TransactionCompleted:
          await syncTransactionCompleted(event.data as TransactionNotification);
          break;
        case EventName.CustomerCreated:
        case EventName.CustomerUpdated:
          // Subscription events carry all state we need; acknowledge and continue.
          break;
        default:
          break;
      }
    } catch {
      await admin.from("paddle_webhook_events").delete().eq("id", event.eventId);
      return safeErrorResponse("Webhook processing failed.", 500);
    }

    return Response.json({ received: true });
  } catch {
    return safeErrorResponse("Invalid webhook.", 400);
  }
}
