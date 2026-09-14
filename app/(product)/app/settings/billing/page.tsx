import type { Metadata } from "next";
import { PageHeader } from "@/components/product/PageHeader";
import { BillingClient } from "@/components/product/BillingClient";
import { getWorkspaceData } from "@/lib/data/queries";
import { getCurrentStorageUsage, getStorageQuota } from "@/lib/cloud/server";
import { isSupabaseConfigured } from "@/lib/env";
import { hasProEntitlement } from "@/lib/billing/entitlements";

export const metadata: Metadata = { title: "Billing" };

export default async function Billing() {
  const data = isSupabaseConfigured ? await getWorkspaceData() : null;
  const [usage, quota] = data
    ? await Promise.all([getCurrentStorageUsage(data.context.workspaceId), getStorageQuota(data.context.workspaceId)])
    : [0, { plan: "free" as const, bytes: 10 * 1024 ** 3 }];
  const proActive = hasProEntitlement(data?.subscriptions ?? []);
  const hasCustomer = (data?.subscriptions ?? []).some((subscription) => Boolean(subscription.stripe_customer_id));
  const configured = Boolean(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_WEBHOOK_SECRET &&
    process.env.STRIPE_PRICE_CANDLER_PRO &&
    process.env.STRIPE_PRICE_CLOUD_500 &&
    process.env.STRIPE_PRICE_CLOUD_1TB,
  );
  return (
    <>
      <PageHeader eyebrow="Settings" title="Billing" description="Free 10 GB · Pro $18/mo 50 GB · Cloud 500 $29/mo · Cloud 1 TB $39/mo. Storage quota is the limit — not project count." />
      <BillingClient
        proActive={proActive}
        cloudPlan={quota.plan}
        usedBytes={usage}
        quotaBytes={quota.bytes}
        hasCustomer={hasCustomer}
        configured={configured}
      />
    </>
  );
}
