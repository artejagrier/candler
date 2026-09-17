import type { CloudPlan } from "@/lib/cloud/quota";
import { isLiveSubscription, type SubscriptionRow } from "@/lib/billing/entitlements";

export const PLAN_COPY: Record<CloudPlan, { chip: string; title: string; quota: string }> = {
  free: { chip: "Free", title: "Free", quota: "10 GB" },
  pro: { chip: "Pro", title: "Candler Pro", quota: "50 GB Cloud" },
  cloud500: { chip: "Cloud 500", title: "Pro + Cloud 500", quota: "500 GB Cloud" },
  cloud1tb: { chip: "Cloud 1 TB", title: "Pro + Cloud 1 TB", quota: "1 TB Cloud" },
};

export function planChipLabel(plan: CloudPlan, trialing = false) {
  const base = PLAN_COPY[plan].chip;
  return trialing && plan !== "free" ? `${base} · Trial` : base;
}

export function formatUsedGb(bytes: number) {
  const gb = bytes / 1024 ** 3;
  if (gb <= 0) return "0";
  if (gb < 0.1) return gb.toFixed(2);
  return gb.toFixed(1);
}

export function quotaLabel(bytes: number) {
  const gb = bytes / 1024 ** 3;
  if (gb >= 1000) return "1 TB";
  return `${Math.round(gb)} GB`;
}

export function pickDisplaySubscription(rows: SubscriptionRow[], now = new Date()) {
  const rank: Record<string, number> = { free: 0, pro: 1, cloud500: 2, cloud1tb: 3 };
  const live = rows.filter((row) => isLiveSubscription(row.status, row.current_period_end, now));
  const pool = live.length ? live : rows;
  return [...pool].sort((a, b) => (rank[a.cloud_plan ?? "free"] ?? 0) - (rank[b.cloud_plan ?? "free"] ?? 0)).at(-1) ?? null;
}

export function isTrialingSubscription(rows: SubscriptionRow[], now = new Date()) {
  return rows.some(
    (row) =>
      row.status === "trialing" &&
      row.entitlement_pro &&
      isLiveSubscription(row.status, row.current_period_end, now),
  );
}

function formatDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export function subscriptionFacts(row: SubscriptionRow | null) {
  if (!row?.status) return [];
  const facts: string[] = [];
  if (row.status === "active") facts.push("Active");
  if (row.status === "trialing") facts.push("Trialing");
  if (row.status === "past_due") facts.push("Past Due");
  if (row.status === "canceled") facts.push("Canceled");

  const cancelsAt =
    row.scheduled_change_action === "cancel" && row.scheduled_change_effective_at
      ? formatDate(row.scheduled_change_effective_at)
      : null;
  if (cancelsAt) facts.push(`Cancels ${cancelsAt}`);

  const renewsAt =
    (row.status === "active" || row.status === "trialing") &&
    !cancelsAt &&
    row.current_period_end
      ? formatDate(row.current_period_end)
      : null;
  if (renewsAt) facts.push(`Renews ${renewsAt}`);

  return facts;
}
