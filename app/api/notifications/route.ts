import { getWorkspaceContext } from "@/lib/data/workspace";
import { createClient } from "@/lib/supabase/server";
import { safeErrorResponse } from "@/lib/security/redaction";
import { highestCloudPlan, storageQuotaBytes } from "@/lib/billing/entitlements";

/**
 * Live "needs attention" items derived from real workspace state — never
 * fabricated. Metadata only (expiry/rotation timestamps, upload status, sizes,
 * subscription status); no secret values are read. Read-state persistence and a
 * durable notifications table are a documented backend follow-up; this computes
 * current signals on demand.
 */
const DAY = 86_400_000;

type Severity = "info" | "warning" | "critical";
interface Notification {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  href: string;
}

const BILLING_PROBLEMS = new Set(["past_due", "unpaid", "incomplete", "incomplete_expired"]);

export async function GET() {
  const context = await getWorkspaceContext();
  if (!context) return safeErrorResponse("Authentication required.", 401);

  const supabase = await createClient();
  const [secrets, files, subs] = await Promise.all([
    supabase.from("secrets").select("expires_at,rotate_at").eq("workspace_id", context.workspaceId),
    supabase.from("cloud_files").select("status,size_bytes").eq("workspace_id", context.workspaceId).is("deleted_at", null),
    supabase.from("subscriptions").select("status,cloud_plan,current_period_end,storage_quota_bytes").eq("workspace_id", context.workspaceId),
  ]);

  const now = Date.now();
  const notifications: Notification[] = [];

  let expired = 0;
  let expiring = 0;
  let rotation = 0;
  for (const s of secrets.data ?? []) {
    if (s.expires_at) {
      const t = new Date(s.expires_at).getTime();
      if (t < now) expired++;
      else if (t - now < 14 * DAY) expiring++;
    }
    if (s.rotate_at && new Date(s.rotate_at).getTime() <= now) rotation++;
  }
  if (expired) notifications.push({ id: "sec-expired", severity: "critical", title: `${expired} credential${expired > 1 ? "s" : ""} expired`, detail: "Rotate or replace expired secrets in Vault.", href: "/app/vault" });
  if (expiring) notifications.push({ id: "sec-expiring", severity: "warning", title: `${expiring} credential${expiring > 1 ? "s" : ""} expiring soon`, detail: "These expire within 14 days.", href: "/app/vault" });
  if (rotation) notifications.push({ id: "sec-rotation", severity: "warning", title: `${rotation} secret${rotation > 1 ? "s" : ""} due for rotation`, detail: "Rotation is past due.", href: "/app/vault" });

  const failed = (files.data ?? []).filter((f) => f.status === "failed").length;
  if (failed) notifications.push({ id: "cloud-failed", severity: "critical", title: `${failed} upload${failed > 1 ? "s" : ""} failed`, detail: "Retry to finish backing these up.", href: "/app/cloud" });

  const used = (files.data ?? []).filter((f) => f.status === "backed_up").reduce((n, f) => n + (f.size_bytes ?? 0), 0);
  const quota = storageQuotaBytes(highestCloudPlan(subs.data ?? []));
  if (quota > 0 && used / quota >= 0.9) {
    const atLimit = used >= quota;
    notifications.push({
      id: "cloud-quota",
      severity: atLimit ? "critical" : "warning",
      title: atLimit ? "Storage quota reached" : "Storage nearly full",
      detail: `${Math.round((used / quota) * 100)}% of your plan used.`,
      href: "/app/settings/billing",
    });
  }

  if ((subs.data ?? []).some((s) => BILLING_PROBLEMS.has(s.status))) {
    notifications.push({ id: "billing", severity: "critical", title: "Billing needs attention", detail: "Update your payment method to keep your plan active.", href: "/app/settings/billing" });
  }

  const order: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };
  notifications.sort((a, b) => order[a.severity] - order[b.severity]);

  return Response.json({ notifications: notifications.slice(0, 8) }, { headers: { "Cache-Control": "no-store" } });
}
