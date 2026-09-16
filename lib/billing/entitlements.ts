import { CLOUD_PLANS, type CloudPlan } from "@/lib/cloud/quota";

export const PRODUCTS = {
  candler_pro: { name: "Candler Pro", price: 18, envPriceId: "PADDLE_PRICE_CANDLER_PRO" },
  cloud_500: { name: "Candler Pro + Cloud 500", price: 29, envPriceId: "PADDLE_PRICE_CLOUD_500" },
  cloud_1tb: { name: "Candler Pro + Cloud 1 TB", price: 39, envPriceId: "PADDLE_PRICE_CLOUD_1TB" },
} as const;

export type ProductKey = keyof typeof PRODUCTS;
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "paused";

export interface MappedProduct {
  product_key: ProductKey;
  entitlement_pro: boolean;
  cloud_plan: CloudPlan;
  storage_quota_bytes: number;
}

export interface SubscriptionRow {
  product_key?: string | null;
  status: string;
  current_period_end: string | Date | null;
  cloud_plan?: string | null;
  entitlement_pro?: boolean | null;
  paddle_customer_id?: string | null;
  storage_quota_bytes?: number | null;
}

const PLAN_RANK: Record<CloudPlan, number> = { free: 0, pro: 1, cloud500: 2, cloud1tb: 3 };

export function hasEntitlement(status: SubscriptionStatus, currentPeriodEnd: Date, now = new Date()): boolean {
  return (status === "active" || status === "trialing") && currentPeriodEnd > now;
}

export function isLiveSubscription(status: string, currentPeriodEnd: string | Date | null, now = new Date()): boolean {
  if (status !== "active" && status !== "trialing") return false;
  if (!currentPeriodEnd) return true;
  return new Date(currentPeriodEnd) > now;
}

export function productFromPriceId(
  priceId: string | undefined,
  prices: { pro?: string; cloud500?: string; cloud1tb?: string } = {
    pro: process.env.PADDLE_PRICE_CANDLER_PRO,
    cloud500: process.env.PADDLE_PRICE_CLOUD_500,
    cloud1tb: process.env.PADDLE_PRICE_CLOUD_1TB,
  },
): MappedProduct | null {
  if (!priceId) return null;
  if (prices.pro && priceId === prices.pro) {
    return { product_key: "candler_pro", entitlement_pro: true, cloud_plan: "pro", storage_quota_bytes: CLOUD_PLANS.pro.bytes };
  }
  if (prices.cloud500 && priceId === prices.cloud500) {
    return { product_key: "cloud_500", entitlement_pro: true, cloud_plan: "cloud500", storage_quota_bytes: CLOUD_PLANS.cloud500.bytes };
  }
  if (prices.cloud1tb && priceId === prices.cloud1tb) {
    return { product_key: "cloud_1tb", entitlement_pro: true, cloud_plan: "cloud1tb", storage_quota_bytes: CLOUD_PLANS.cloud1tb.bytes };
  }
  return null;
}

export function highestCloudPlan(rows: SubscriptionRow[], now = new Date()): CloudPlan {
  let plan: CloudPlan = "free";
  for (const row of rows) {
    if (!isLiveSubscription(row.status, row.current_period_end, now)) continue;
    const candidate = row.cloud_plan;
    if (candidate === "pro" || candidate === "cloud500" || candidate === "cloud1tb" || candidate === "free") {
      if (PLAN_RANK[candidate] > PLAN_RANK[plan]) plan = candidate;
    }
  }
  return plan;
}

export function hasProEntitlement(rows: SubscriptionRow[], now = new Date()): boolean {
  return rows.some((row) => row.entitlement_pro && isLiveSubscription(row.status, row.current_period_end, now));
}

export function storageQuotaBytes(plan: CloudPlan): number {
  return CLOUD_PLANS[plan].bytes;
}
