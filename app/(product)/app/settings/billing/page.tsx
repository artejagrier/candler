import type { Metadata } from "next";
import { PageHeader } from "@/components/product/PageHeader";
import { BillingClient } from "@/components/product/BillingClient";
import { getWorkspaceData } from "@/lib/data/queries";
import { getCurrentStorageUsage, getStorageQuota } from "@/lib/cloud/server";
import { isSupabaseConfigured } from "@/lib/env";
import { hasProEntitlement } from "@/lib/billing/entitlements";

export const metadata: Metadata = { title: "Billing" };

type Product = "candler_pro" | "cloud_500" | "cloud_1tb";
const VALID_PLANS = new Set<string>(["candler_pro", "cloud_500", "cloud_1tb"]);

export default async function Billing({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  const autoPlan: Product | undefined =
    plan && VALID_PLANS.has(plan) ? (plan as Product) : undefined;

  const data = isSupabaseConfigured ? await getWorkspaceData() : null;
  const [usage, quota] = data
    ? await Promise.all([getCurrentStorageUsage(data.context.workspaceId), getStorageQuota(data.context.workspaceId)])
    : [0, { plan: "free" as const, bytes: 10 * 1024 ** 3 }];
  const proActive = hasProEntitlement(data?.subscriptions ?? []);
  const hasCustomer = (data?.subscriptions ?? []).some((subscription) => Boolean(subscription.paddle_customer_id));
  const configured = Boolean(
    process.env.PADDLE_API_KEY &&
    process.env.PADDLE_WEBHOOK_SECRET &&
    process.env.PADDLE_PRICE_CANDLER_PRO &&
    process.env.PADDLE_PRICE_CLOUD_500 &&
    process.env.PADDLE_PRICE_CLOUD_1TB &&
    process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
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
        autoPlan={autoPlan}
      />
    </>
  );
}
