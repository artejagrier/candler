import { z } from "zod";
import { objectKey } from "@/lib/cloud/quota";
import { signedUploadUrl } from "@/lib/cloud/storage";
import { safeErrorResponse } from "@/lib/security/redaction";
import { requireProjectAccess } from "@/lib/data/workspace";
import { getCurrentStorageUsage, getStorageQuota, MAX_FILE_BYTES, MAX_UPLOAD_AUTHORIZATIONS_PER_MINUTE } from "@/lib/cloud/server";
import { ensureFolderPath, requireCloudActor } from "@/lib/cloud/operations";
import { canUpload } from "@/lib/cloud/quota";
import { randomUUID } from "node:crypto";

const input = z.object({
  projectId: z.uuid().nullable().optional(),
  folderId: z.uuid().nullable().optional(),
  filename: z.string().trim().min(1).max(512),
  relativePath: z.string().max(2048).nullable().optional(),
  contentType: z.string().min(1).max(255),
  size: z.number().int().positive(),
  checksumSha256: z.string().regex(/^[A-Za-z0-9+/]{43}=$/),
});

export async function POST(request: Request) {
  try {
    const { context, admin } = await requireCloudActor();
    const body = input.parse(await request.json());
    if (body.projectId) await requireProjectAccess(body.projectId);
    if (body.size > MAX_FILE_BYTES) return safeErrorResponse("File exceeds the configured upload limit.", 413);

    const since = new Date(Date.now() - 60_000).toISOString();
    const { count, error: rateError } = await admin
      .from("cloud_upload_authorizations")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", context.userId)
      .gte("created_at", since);
    if (rateError) throw new Error("Upload rate could not be checked.");
    if ((count ?? 0) >= MAX_UPLOAD_AUTHORIZATIONS_PER_MINUTE) {
      return safeErrorResponse("Too many upload attempts. Try again in a minute.", 429);
    }

    const [usage, quota] = await Promise.all([
      getCurrentStorageUsage(context.workspaceId),
      getStorageQuota(context.workspaceId),
    ]);
    if (!canUpload(usage, body.size, quota.plan)) {
      return safeErrorResponse("Storage quota exceeded.", 413);
    }

    if (body.folderId) {
      const { data: folder } = await admin
        .from("cloud_folders")
        .select("id")
        .eq("id", body.folderId)
        .eq("workspace_id", context.workspaceId)
        .eq("owner_id", context.userId)
        .is("deleted_at", null)
        .maybeSingle();
      if (!folder) return safeErrorResponse("Folder not found.", 404);
    }

    const folderId = await ensureFolderPath(admin, {
      workspaceId: context.workspaceId,
      ownerId: context.userId,
      projectId: body.projectId ?? null,
      parentId: body.folderId ?? null,
      relativePath: body.relativePath ?? null,
    });

    const fileId = randomUUID();
    const key = objectKey(context.userId, context.workspaceId, fileId);
    const expiresAt = new Date(Date.now() + 900_000).toISOString();

    const { error: fileError } = await admin.from("cloud_files").insert({
      id: fileId,
      workspace_id: context.workspaceId,
      project_id: body.projectId ?? null,
      folder_id: folderId,
      owner_id: context.userId,
      original_filename: body.filename,
      relative_path: body.relativePath ?? null,
      object_key: key,
      mime_type: body.contentType,
      size_bytes: body.size,
      checksum_sha256: body.checksumSha256,
      status: "uploading",
    });
    if (fileError) throw new Error("Upload metadata could not be created.");

    const { error: authError } = await admin.from("cloud_upload_authorizations").insert({
      workspace_id: context.workspaceId,
      owner_id: context.userId,
      file_id: fileId,
      size_bytes: body.size,
      expires_at: expiresAt,
    });
    if (authError) throw new Error("Upload authorization could not be recorded.");

    const uploadUrl = await signedUploadUrl(key, body.contentType, body.checksumSha256);
    return Response.json({
      fileId,
      uploadUrl,
      expiresIn: 900,
      status: "uploading",
      quota: { usedBytes: usage, quotaBytes: quota.bytes, plan: quota.plan },
    });
  } catch (error) {
    return safeErrorResponse(error instanceof Error ? error.message : undefined);
  }
}
