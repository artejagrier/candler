import { requireProjectAccess } from "@/lib/data/workspace";
import { safeErrorResponse } from "@/lib/security/redaction";
import { requireCloudActor } from "@/lib/cloud/operations";
import { authorizeUploadBatch } from "@/lib/cloud/authorize";
import { checksumSha256Schema } from "@/lib/cloud/batch-schema";
import { MAX_UPLOAD_AUTHORIZATIONS_PER_MINUTE } from "@/lib/cloud/limits";
import { z } from "zod";

const input = z.object({
  projectId: z.uuid().nullable().optional(),
  folderId: z.uuid().nullable().optional(),
  filename: z.string().trim().min(1).max(512),
  relativePath: z.string().max(2048).nullable().optional(),
  contentType: z.string().min(1).max(255),
  size: z.number().int().positive(),
  checksumSha256: checksumSha256Schema,
}).strict();

function rateLimited(error: unknown) {
  return Boolean(error && typeof error === "object" && "status" in error && (error as { status?: number }).status === 429);
}

export async function POST(request: Request) {
  try {
    const { context, admin } = await requireCloudActor();
    const body = input.parse(await request.json());
    if (body.projectId) await requireProjectAccess(body.projectId);
    const { results, quota } = await authorizeUploadBatch({
      context,
      admin,
      projectId: body.projectId ?? null,
      folderId: body.folderId ?? null,
      files: [{
        filename: body.filename,
        relativePath: (body.relativePath?.trim() || body.filename),
        contentType: body.contentType,
        size: body.size,
        checksumSha256: body.checksumSha256,
      }],
      rateCap: MAX_UPLOAD_AUTHORIZATIONS_PER_MINUTE,
    });
    const first = results[0];
    if (!first) throw new Error("Upload could not be authorized.");
    if ("error" in first && first.error) {
      const status = first.error.includes("quota") ? 413 : 400;
      return safeErrorResponse(first.error, status);
    }
    if (first.skipped) {
      return Response.json({ fileId: first.fileId, skipped: true, reason: first.reason, status: "backed_up", quota });
    }
    if (!("uploadUrl" in first) || !first.uploadUrl) throw new Error("Upload could not be authorized.");
    return Response.json({
      fileId: first.fileId,
      uploadUrl: first.uploadUrl,
      expiresIn: first.expiresIn,
      status: first.status,
      quota,
    });
  } catch (error) {
    if (rateLimited(error)) {
      return new Response(JSON.stringify({ error: "Too many upload attempts. Try again shortly." }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": "5" },
      });
    }
    return safeErrorResponse(error instanceof Error ? error.message : undefined);
  }
}
