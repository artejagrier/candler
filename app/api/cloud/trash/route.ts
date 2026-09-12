import { requireCloudActor } from "@/lib/cloud/operations";
import { safeErrorResponse } from "@/lib/security/redaction";

export async function GET() {
  try {
    const { context, admin } = await requireCloudActor();
    const [files, folders] = await Promise.all([
      admin
        .from("cloud_files")
        .select("id,original_filename,size_bytes,deleted_at,status")
        .eq("workspace_id", context.workspaceId)
        .eq("owner_id", context.userId)
        .not("deleted_at", "is", null),
      admin
        .from("cloud_folders")
        .select("id,name,deleted_at")
        .eq("workspace_id", context.workspaceId)
        .eq("owner_id", context.userId)
        .not("deleted_at", "is", null),
    ]);
    return Response.json({ files: files.data ?? [], folders: folders.data ?? [] });
  } catch {
    return safeErrorResponse("Authentication required.", 401);
  }
}
