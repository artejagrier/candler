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
  const already: FinalizeItemResult[] = [];
  const pending: string[] = [];
  for (const id of ids) {
    const file = byId.get(id);
    if (!file) {
      already.push({ id, status: "failed", error: "Upload not found." });
      continue;
    }
    if (file.status === "backed_up") {
      already.push({ id, status: "backed_up" });
      continue;
    }
    pending.push(id);
  }

  if (pending.length) {
    await admin
      .from("cloud_files")
      .update({ status: "verifying", updated_at: new Date().toISOString() })
      .in("id", pending)
      .eq("owner_id", context.userId)
      .eq("workspace_id", context.workspaceId);
  }

  const verified: Array<{ id: string; filename: string; sizeBytes: number; checksumVerified: boolean }> = [];
  const failed: FinalizeItemResult[] = [];

  await runPool(pending, 16, async (id) => {
    const file = byId.get(id);
    if (!file) {
      failed.push({ id, status: "failed", error: "Upload not found." });
      return;
    }
    try {
      const object = await inspectObject(file.object_key);
      const sizeMatches = object.size === Number(file.size_bytes);
      const checksumMatches = !object.checksumSha256 || object.checksumSha256 === file.checksum_sha256;
      if (!sizeMatches || !checksumMatches) {
        failed.push({ id, status: "failed", error: "Upload verification failed." });
        return;
      }
      verified.push({
        id,
        filename: file.original_filename,
        sizeBytes: Number(file.size_bytes),
        checksumVerified: Boolean(object.checksumSha256),
      });
    } catch {
      failed.push({ id, status: "failed", error: "Upload could not be verified." });
    }
  });

  if (verified.length) {
    await admin
      .from("cloud_files")
      .update({ status: "backed_up", updated_at: new Date().toISOString() })
      .in("id", verified.map((row) => row.id))
      .eq("owner_id", context.userId)
      .eq("workspace_id", context.workspaceId);
    await Promise.all(verified.map((row) => emitAuditEvent({
      workspaceId: context.workspaceId,
      actorId: context.userId,
      eventType: "cloud.uploaded",
      targetType: "cloud_file",
      targetId: row.id,
      metadata: { filename: row.filename, sizeBytes: row.sizeBytes, checksumVerified: row.checksumVerified },
    })));
  }
  if (failed.length) {
    await admin
      .from("cloud_files")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .in("id", failed.map((row) => row.id))
      .eq("owner_id", context.userId)
      .eq("workspace_id", context.workspaceId);
  }

  const results: FinalizeItemResult[] = [
    ...already,
    ...verified.map((row) => ({ id: row.id, status: "backed_up" as const })),
    ...failed,
  ];
  const order = new Map(ids.map((id, index) => [id, index]));
  results.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  return results;
}
