import "server-only";

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { objectKey, canUpload } from "@/lib/cloud/quota";
import { signedUploadUrl, isObjectStorageConfigured } from "@/lib/cloud/storage";
import { CloudQuotaError, CloudStorageUnavailableError } from "@/lib/cloud/errors";
import { getCurrentStorageUsage, getStorageQuota, MAX_FILE_BYTES } from "@/lib/cloud/server";
import { MAX_BATCH_AUTHORIZED_FILES_PER_MINUTE, MAX_UPLOAD_AUTHORIZATIONS_PER_MINUTE } from "@/lib/cloud/limits";
import { ensureFolderPath, primeFolderPathCache, type FolderPathCache } from "@/lib/cloud/operations";
import type { AuthorizeServerTimings } from "@/lib/cloud/transfer";
import type { WorkspaceContext } from "@/lib/data/workspace";
import type { UploadFileDescriptor } from "@/lib/cloud/batch-schema";

export type AuthorizeResult =
  | { relativePath: string; skipped: true; fileId: string; reason: "unchanged" }
  | { relativePath: string; skipped: false; fileId: string; uploadUrl: string; expiresIn: 900; status: "uploading" }
  | { relativePath: string; skipped: false; error: string; status: "failed" };

export async function countRecentAuthorizations(admin: SupabaseClient, ownerId: string) {
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count, error } = await admin
    .from("cloud_upload_authorizations")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId)
    .gte("created_at", since);
  if (error) throw new Error("Upload rate could not be checked.");
  return count ?? 0;
}

function tooMany(count: number, incoming: number, cap: number) {
  return count + incoming > cap;
}

export async function authorizeUploadBatch(input: {
  context: WorkspaceContext;
  admin: SupabaseClient;
  projectId?: string | null;
  folderId?: string | null;
  files: UploadFileDescriptor[];
  rateCap: number;
}): Promise<{
  results: AuthorizeResult[];
  quota: { usedBytes: number; quotaBytes: number; plan: string };
  timings: AuthorizeServerTimings;
}> {
  const started = performance.now();
  const { context, admin, files } = input;
  if (files.some((file) => file.size > MAX_FILE_BYTES)) {
    throw new Error("File exceeds the configured upload limit.");
  }

  const rateStarted = performance.now();
  const recent = await countRecentAuthorizations(admin, context.userId);
  const rateLimitMs = performance.now() - rateStarted;
  const cap = input.rateCap;
  if (recent >= cap) {
    const error = new Error("Too many upload attempts. Try again shortly.");
    (error as Error & { status: number }).status = 429;
    throw error;
  }

  if (input.folderId) {
    const { data: folder } = await admin
      .from("cloud_folders")
      .select("id")
      .eq("id", input.folderId)
      .eq("workspace_id", context.workspaceId)
      .eq("owner_id", context.userId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!folder) throw new Error("Folder not found.");
  }

  const quotaStarted = performance.now();
  const [usage, quota] = await Promise.all([
    getCurrentStorageUsage(context.workspaceId, admin),
    getStorageQuota(context.workspaceId, admin),
  ]);
  const quotaMs = performance.now() - quotaStarted;

  if (!isObjectStorageConfigured()) {
    throw new CloudStorageUnavailableError();
  }

  const existingStarted = performance.now();
  const paths = [...new Set(files.map((file) => file.relativePath))];
  const { data: existingRows } = await admin
    .from("cloud_files")
    .select("id,relative_path,size_bytes,checksum_sha256,status,updated_at")
    .eq("workspace_id", context.workspaceId)
    .eq("owner_id", context.userId)
    .eq("status", "backed_up")
    .is("deleted_at", null)
    .in("relative_path", paths);
  const existingMs = performance.now() - existingStarted;

  const existingByPath = new Map<string, { id: string; size_bytes: number; checksum_sha256: string | null }>();
  for (const row of existingRows ?? []) {
    if (!row.relative_path) continue;
    const current = existingByPath.get(row.relative_path);
    if (!current) {
      existingByPath.set(row.relative_path, {
        id: row.id,
        size_bytes: Number(row.size_bytes),
        checksum_sha256: row.checksum_sha256,
      });
    }
  }

  const cache: FolderPathCache = new Map();
  const folderStarted = performance.now();
  await primeFolderPathCache(admin, {
    workspaceId: context.workspaceId,
    ownerId: context.userId,
    parentId: input.folderId ?? null,
  }, cache);
  const results: AuthorizeResult[] = [];
  const inserts: Array<{
    id: string;
    workspace_id: string;
    project_id: string | null;
    folder_id: string | null;
    owner_id: string;
    original_filename: string;
    relative_path: string;
    object_key: string;
    mime_type: string;
    size_bytes: number;
    checksum_sha256: string;
    status: "uploading";
  }> = [];
  const authRows: Array<{
    workspace_id: string;
    owner_id: string;
    file_id: string;
    size_bytes: number;
    expires_at: string;
  }> = [];
  const toSign: Array<{ relativePath: string; fileId: string; key: string; contentType: string; checksumSha256: string }> = [];

  let used = usage;
  let reserved = 0;
  let incomingBytes = 0;
  let incomingCount = 0;
  const expiresAt = new Date(Date.now() + 900_000).toISOString();

  for (const file of files) {
    const match = existingByPath.get(file.relativePath);
    if (
      match
      && match.size_bytes === file.size
      && match.checksum_sha256 === file.checksumSha256
    ) {
      results.push({ relativePath: file.relativePath, skipped: true, fileId: match.id, reason: "unchanged" });
      continue;
    }
    incomingBytes += file.size;
    incomingCount += 1;
  }

  if (incomingCount > 0 && !canUpload(usage, incomingBytes, quota.plan)) {
    throw new CloudQuotaError(incomingBytes, Math.max(0, quota.bytes - usage));
  }

  for (const file of files) {
    const match = existingByPath.get(file.relativePath);
    if (
      match
      && match.size_bytes === file.size
      && match.checksum_sha256 === file.checksumSha256
    ) {
      continue;
    }
    if (tooMany(recent, reserved + 1, cap)) {
      results.push({ relativePath: file.relativePath, skipped: false, error: "Too many upload attempts. Try again shortly.", status: "failed" });
      continue;
    }
    if (!canUpload(used, file.size, quota.plan)) {
      results.push({ relativePath: file.relativePath, skipped: false, error: "Storage quota exceeded.", status: "failed" });
      continue;
    }

    const folderId = await ensureFolderPath(admin, {
      workspaceId: context.workspaceId,
      ownerId: context.userId,
      projectId: input.projectId ?? null,
      parentId: input.folderId ?? null,
      relativePath: file.relativePath,
    }, cache);
    const fileId = randomUUID();
    const key = objectKey(context.userId, context.workspaceId, fileId);
    inserts.push({
      id: fileId,
      workspace_id: context.workspaceId,
      project_id: input.projectId ?? null,
      folder_id: folderId,
      owner_id: context.userId,
      original_filename: file.filename,
      relative_path: file.relativePath,
      object_key: key,
      mime_type: file.contentType,
      size_bytes: file.size,
      checksum_sha256: file.checksumSha256,
      status: "uploading",
    });
    authRows.push({
      workspace_id: context.workspaceId,
      owner_id: context.userId,
      file_id: fileId,
      size_bytes: file.size,
      expires_at: expiresAt,
    });
    toSign.push({
      relativePath: file.relativePath,
      fileId,
      key,
      contentType: file.contentType,
      checksumSha256: file.checksumSha256,
    });
    used += file.size;
    reserved += 1;
  }
  const foldersMs = performance.now() - folderStarted;

  const insertStarted = performance.now();
  if (inserts.length) {
    const { error: fileError } = await admin.from("cloud_files").insert(inserts);
    if (fileError) throw new Error("Upload metadata could not be created.");
    const { error: authError } = await admin.from("cloud_upload_authorizations").insert(authRows);
    if (authError) throw new Error("Upload authorization could not be recorded.");
  }
  const insertMs = performance.now() - insertStarted;

  const signStarted = performance.now();
  const signed = await Promise.all(
    toSign.map(async (item) => {
      const uploadUrl = await signedUploadUrl(item.key, item.contentType, item.checksumSha256);
      return {
        relativePath: item.relativePath,
        skipped: false as const,
        fileId: item.fileId,
        uploadUrl,
        expiresIn: 900 as const,
        status: "uploading" as const,
      };
    }),
  );
  const signMs = performance.now() - signStarted;
  results.push(...signed);

  const order = new Map(files.map((file, index) => [file.relativePath, index]));
  results.sort((a, b) => (order.get(a.relativePath) ?? 0) - (order.get(b.relativePath) ?? 0));

  return {
    results,
    quota: { usedBytes: usage, quotaBytes: quota.bytes, plan: quota.plan },
    timings: {
      rateLimitMs,
      quotaMs,
      existingMs,
      foldersMs,
      insertMs,
      signMs,
      totalMs: performance.now() - started,
    },
  };
}

export { MAX_UPLOAD_AUTHORIZATIONS_PER_MINUTE, MAX_BATCH_AUTHORIZED_FILES_PER_MINUTE };
