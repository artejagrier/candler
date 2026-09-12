import "server-only";
import { createClient } from "@/lib/supabase/server";
import { CLOUD_PLANS, type CloudPlan } from "@/lib/cloud/quota";
import { highestCloudPlan, storageQuotaBytes } from "@/lib/billing/entitlements";

export const MAX_FILE_BYTES = Number(process.env.CLOUD_MAX_FILE_BYTES ?? 5 * 1024 ** 3);
export const MAX_UPLOAD_AUTHORIZATIONS_PER_MINUTE = 20;

export async function getCurrentStorageUsage(workspaceId: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cloud_files")
    .select("size_bytes")
    .eq("workspace_id", workspaceId)
    .eq("status", "backed_up")
    .is("deleted_at", null);
  if (error) throw new Error("Storage usage could not be calculated.");
  return (data ?? []).reduce((sum, row) => sum + Number(row.size_bytes), 0);
}

export async function getStorageQuota(workspaceId: string): Promise<{ plan: CloudPlan; bytes: number }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("cloud_plan,status,current_period_end")
    .eq("workspace_id", workspaceId);
  const plan = highestCloudPlan(data ?? []);
  return { plan, bytes: storageQuotaBytes(plan) };
}

export { CLOUD_PLANS };
