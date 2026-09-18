import { requireProjectAccess } from "@/lib/data/workspace";
import { safeErrorResponse } from "@/lib/security/redaction";
import { requireCloudActor } from "@/lib/cloud/operations";
import { authorizeUploadBatch } from "@/lib/cloud/authorize";
import { uploadBatchInput } from "@/lib/cloud/batch-schema";
import { MAX_BATCH_AUTHORIZED_FILES_PER_MINUTE } from "@/lib/cloud/limits";
import { publicCloudError } from "@/lib/cloud/errors";

export const maxDuration = 60;

function rateLimited(error: unknown) {
  return Boolean(error && typeof error === "object" && "status" in error && (error as { status?: number }).status === 429);
}

export async function POST(request: Request) {
  const started = performance.now();
  try {
    const actorStarted = performance.now();
    const { context, admin } = await requireCloudActor();
    const actorMs = performance.now() - actorStarted;
    const body = uploadBatchInput.parse(await request.json());
    const projectStarted = performance.now();
    if (body.projectId) await requireProjectAccess(body.projectId);
    const projectMs = performance.now() - projectStarted;
    const { results, quota, timings } = await authorizeUploadBatch({
      context,
      admin,
      projectId: body.projectId ?? null,
      folderId: body.folderId ?? null,
      files: body.files,
      rateCap: MAX_BATCH_AUTHORIZED_FILES_PER_MINUTE,
    });
    return Response.json({
      results,
      quota,
      timings: {
        ...timings,
        actorMs,
        projectMs,
        totalMs: performance.now() - started,
      },
    });
  } catch (error) {
    if (rateLimited(error)) {
      return new Response(JSON.stringify({ error: "Too many upload attempts. Try again shortly." }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": "5" },
      });
    }
    const mapped = publicCloudError(error);
    return safeErrorResponse(mapped.message, mapped.status);
  }
}
