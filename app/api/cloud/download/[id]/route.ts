import { signedDownloadUrl } from "@/lib/cloud/storage";
import { safeErrorResponse } from "@/lib/security/redaction";
import { emitAuditEvent } from "@/lib/audit/events";
import { requireCloudActor } from "@/lib/cloud/operations";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { context, admin } = await requireCloudActor();
    const { id } = await params;
    const { data } = await admin
      .from("cloud_files")
      .select("object_key,original_filename,status,deleted_at,size_bytes")
      .eq("id", id)
      .eq("workspace_id", context.workspaceId)
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!data || data.deleted_at || data.status !== "backed_up") {
      return safeErrorResponse("File is unavailable.", 404);
    }
    const downloadUrl = await signedDownloadUrl(data.object_key, data.original_filename);
    await emitAuditEvent({
      workspaceId: context.workspaceId,
      actorId: context.userId,
      eventType: "cloud.downloaded",
      targetType: "cloud_file",
      targetId: id,
      metadata: { filename: data.original_filename, sizeBytes: data.size_bytes },
    });
    return Response.json({ downloadUrl, expiresIn: 300 });
  } catch {
    return safeErrorResponse("Download could not be prepared.", 503);
  }
}
