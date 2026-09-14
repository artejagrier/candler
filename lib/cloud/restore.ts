import "server-only";

import { PassThrough, Readable } from "node:stream";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MAX_RESTORE_BYTES, MAX_RESTORE_FILES } from "@/lib/cloud/limits";
import { planFolderRestore } from "@/lib/cloud/restore-paths";
import { getObjectBody } from "@/lib/cloud/storage";
import { ZipStoreWriter } from "@/lib/cloud/zip-store";
import type { WorkspaceContext } from "@/lib/data/workspace";

export type RestorePlan = {
  folderId: string;
  folderName: string;
  zipName: string;
  fileCount: number;
  totalBytes: number;
  entries: Array<{ fileId: string; archivePath: string; sizeBytes: number; objectKey: string }>;
};

export async function collectFolderRestore(input: {
  context: WorkspaceContext;
  admin: SupabaseClient;
  folderId: string;
}): Promise<RestorePlan | { error: string; status: number }> {
  const { context, admin, folderId } = input;
  const { data: folder } = await admin
    .from("cloud_folders")
    .select("id,name,parent_id,deleted_at")
    .eq("id", folderId)
    .eq("workspace_id", context.workspaceId)
    .eq("owner_id", context.userId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!folder) return { error: "Folder is unavailable.", status: 404 };

  const { data: folders } = await admin
    .from("cloud_folders")
    .select("id,name,parent_id,deleted_at")
    .eq("workspace_id", context.workspaceId)
    .eq("owner_id", context.userId)
    .is("deleted_at", null);

  const { data: files } = await admin
    .from("cloud_files")
    .select("id,original_filename,relative_path,folder_id,size_bytes,status,deleted_at,object_key")
    .eq("workspace_id", context.workspaceId)
    .eq("owner_id", context.userId)
    .eq("status", "backed_up")
    .is("deleted_at", null);

  const planned = planFolderRestore({
    root: folder,
    folders: folders ?? [],
    files: files ?? [],
    maxFiles: MAX_RESTORE_FILES,
    maxBytes: MAX_RESTORE_BYTES,
  });
  if ("error" in planned) return planned;

  const byId = new Map((files ?? []).map((file) => [file.id, file]));
  const entries = [];
  for (const entry of planned.entries) {
    const file = byId.get(entry.fileId);
    if (!file?.object_key) continue;
    entries.push({
      fileId: entry.fileId,
      archivePath: entry.archivePath,
      sizeBytes: entry.sizeBytes,
      objectKey: file.object_key,
    });
  }
  if (!entries.length) return { error: "No backed-up files are available to restore.", status: 404 };

  return {
    folderId: folder.id,
    folderName: folder.name,
    zipName: planned.zipName,
    fileCount: entries.length,
    totalBytes: planned.totalBytes,
    entries,
  };
}

async function* objectChunks(key: string, signal?: AbortSignal) {
  if (signal?.aborted) return;
  const body = await getObjectBody(key, signal);
  for await (const chunk of body as AsyncIterable<Uint8Array | Buffer | string>) {
    if (signal?.aborted) return;
    if (typeof chunk === "string") yield Buffer.from(chunk);
    else yield chunk;
  }
}

export function streamRestoreZip(plan: RestorePlan, signal?: AbortSignal) {
  const pass = new PassThrough();
  const zip = new ZipStoreWriter(pass);
  const onAbort = () => {
    if (!pass.destroyed) pass.destroy();
  };
  signal?.addEventListener("abort", onAbort, { once: true });
  void (async () => {
    try {
      for (const entry of plan.entries) {
        if (signal?.aborted) break;
        await zip.addFile(entry.archivePath, objectChunks(entry.objectKey, signal));
      }
      if (signal?.aborted) {
        if (!pass.destroyed) pass.destroy();
        return;
      }
      await zip.finish();
      pass.end();
    } catch (error) {
      if (signal?.aborted || pass.destroyed) {
        if (!pass.destroyed) pass.destroy();
        return;
      }
      pass.destroy(error instanceof Error ? error : new Error("Restore failed."));
    } finally {
      signal?.removeEventListener("abort", onAbort);
    }
  })();
  return Readable.toWeb(pass) as ReadableStream<Uint8Array>;
}
