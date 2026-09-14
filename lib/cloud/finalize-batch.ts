import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { inspectObject } from "@/lib/cloud/storage";
import { emitAuditEvent } from "@/lib/audit/events";
import type { WorkspaceContext } from "@/lib/data/workspace";
import { runPool } from "@/lib/cloud/transfer";

export type FinalizeItemResult =
  | { id: string; status: "backed_up" }
  | { id: string; status: "failed"; error: string };

export async function finalizeUploadBatch(input: {
  context: WorkspaceContext;
  admin: SupabaseClient;
  ids: string[];
}): Promise<FinalizeItemResult[]> {
  const { context, admin, ids } = input;
  const { data: rows } = await admin
    .from("cloud_files")
    .select("id,object_key,original_filename,size_bytes,checksum_sha256,status")
    .in("id", ids)
    .eq("workspace_id", context.workspaceId)
    .eq("owner_id", context.userId);

  const byId = new Map((rows ?? []).map((row) => [row.id, row]));
  const results: FinalizeItemResult[] = [];

  await runPool(ids, 8, async (id) => {
    const file = byId.get(id);
    if (!file) {
      results.push({ id, status: "failed", error: "Upload not found." });
      return;
    }
    if (file.status === "backed_up") {
      results.push({ id, status: "backed_up" });
      return;
    }
    try {
      await admin.from("cloud_files").update({ status: "verifying", updated_at: new Date().toISOString() }).eq("id", id).eq("owner_id", context.userId);
      const object = await inspectObject(file.object_key);
      const sizeMatches = object.size === Number(file.size_bytes);
      const checksumMatches = !object.checksumSha256 || object.checksumSha256 === file.checksum_sha256;
      if (!sizeMatches || !checksumMatches) {
        await admin.from("cloud_files").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", id).eq("owner_id", context.userId);
        results.push({ id, status: "failed", error: "Upload verification failed." });
        return;
      }
      await admin.from("cloud_files").update({ status: "backed_up", updated_at: new Date().toISOString() }).eq("id", id).eq("owner_id", context.userId);
      await emitAuditEvent({
        workspaceId: context.workspaceId,
        actorId: context.userId,
        eventType: "cloud.uploaded",
        targetType: "cloud_file",
        targetId: id,
        metadata: { filename: file.original_filename, sizeBytes: file.size_bytes, checksumVerified: Boolean(object.checksumSha256) },
      });
      results.push({ id, status: "backed_up" });
    } catch {
      results.push({ id, status: "failed", error: "Upload could not be verified." });
    }
  });

  const order = new Map(ids.map((id, index) => [id, index]));
  results.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  return results;
}
