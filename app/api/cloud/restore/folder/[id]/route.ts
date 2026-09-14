import { z } from "zod";
import { emitAuditEvent } from "@/lib/audit/events";
import { collectFolderRestore, streamRestoreZip } from "@/lib/cloud/restore";
import { requireCloudActor } from "@/lib/cloud/operations";
import { safeErrorResponse } from "@/lib/security/redaction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function contentDisposition(filename: string) {
  const fallback = filename.replace(/[^\x20-\x7E]+/g, "_");
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!z.uuid().safeParse(id).success) return safeErrorResponse("Folder is unavailable.", 404);
    let actor: Awaited<ReturnType<typeof requireCloudActor>>;
    try {
      actor = await requireCloudActor();
    } catch (error) {
      if (error instanceof Error && error.message === "Authentication required.") {
        return safeErrorResponse("Authentication required.", 401);
      }
      throw error;
    }
    const { context, admin } = actor;
    const plan = await collectFolderRestore({ context, admin, folderId: id });
    if ("error" in plan) return safeErrorResponse(plan.error, plan.status);
    if (request.signal.aborted) return new Response(null, { status: 499 });

    const manifest = new URL(request.url).searchParams.get("manifest") === "1"
      || (request.headers.get("accept") ?? "").includes("application/json");
    if (manifest) {
      return Response.json({
        folderName: plan.folderName,
        zipName: plan.zipName,
        files: plan.fileCount,
        bytes: plan.totalBytes,
      });
    }

    await emitAuditEvent({
      workspaceId: context.workspaceId,
      actorId: context.userId,
      eventType: "cloud.restored_to_device",
      targetType: "cloud_folder",
      targetId: plan.folderId,
      metadata: { name: plan.folderName, files: plan.fileCount, sizeBytes: plan.totalBytes },
    });

    return new Response(streamRestoreZip(plan, request.signal), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": contentDisposition(plan.zipName),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Restore-Files": String(plan.fileCount),
        "X-Restore-Bytes": String(plan.totalBytes),
      },
    });
  } catch {
    return safeErrorResponse("Restore could not be prepared.", 503);
  }
}
