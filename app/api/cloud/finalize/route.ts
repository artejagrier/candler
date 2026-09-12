import { z } from "zod";
import { inspectObject } from "@/lib/cloud/storage";
import { emitAuditEvent } from "@/lib/audit/events";
import { safeErrorResponse } from "@/lib/security/redaction";
import { requireCloudActor } from "@/lib/cloud/operations";

export async function POST(request: Request) {
  try {
    const { context, admin } = await requireCloudActor();
    const { id } = z.object({ id: z.uuid() }).parse(await request.json());
    const { data: file } = await admin
      .from("cloud_files")
      .select("id,object_key,original_filename,size_bytes,checksum_sha256,status")
      .eq("id", id)
      .eq("workspace_id", context.workspaceId)
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!file) return safeErrorResponse("Upload not found.", 404);
    if (file.status === "backed_up") return Response.json({ status: "backed_up" });

    await admin.from("cloud_files").update({ status: "verifying", updated_at: new Date().toISOString() }).eq("id", id);

    const object = await inspectObject(file.object_key);
    const sizeMatches = object.size === Number(file.size_bytes);
    const checksumMatches = !object.checksumSha256 || object.checksumSha256 === file.checksum_sha256;
    if (!sizeMatches || !checksumMatches) {
      await admin.from("cloud_files").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", id);
      return safeErrorResponse("Upload verification failed.", 422);
    }

    await admin.from("cloud_files").update({ status: "backed_up", updated_at: new Date().toISOString() }).eq("id", id);
    await emitAuditEvent({
      workspaceId: context.workspaceId,
      actorId: context.userId,
      eventType: "cloud.uploaded",
      targetType: "cloud_file",
      targetId: id,
      metadata: { filename: file.original_filename, sizeBytes: file.size_bytes, checksumVerified: Boolean(object.checksumSha256) },
    });
    return Response.json({ status: "backed_up" });
  } catch {
    return safeErrorResponse("Upload could not be verified.", 503);
  }
}
