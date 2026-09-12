import { z } from "zod";
import { emitAuditEvent } from "@/lib/audit/events";
import { safeErrorResponse } from "@/lib/security/redaction";
import { requireCloudActor } from "@/lib/cloud/operations";

export async function POST(request: Request) {
  try {
    const { context, admin } = await requireCloudActor();
    const input = z.object({
      name: z.string().trim().min(1).max(255),
      parentId: z.uuid().nullable().optional(),
      projectId: z.uuid().nullable().optional(),
    }).parse(await request.json());

    if (input.parentId) {
      const { data } = await admin
        .from("cloud_folders")
        .select("id")
        .eq("id", input.parentId)
        .eq("owner_id", context.userId)
        .eq("workspace_id", context.workspaceId)
        .is("deleted_at", null)
        .maybeSingle();
      if (!data) return safeErrorResponse("Parent folder not found.", 404);
    }

    const { data, error } = await admin
      .from("cloud_folders")
      .insert({
        workspace_id: context.workspaceId,
        owner_id: context.userId,
        name: input.name,
        parent_id: input.parentId ?? null,
        project_id: input.projectId ?? null,
      })
      .select("id,name")
      .single();
    if (error || !data) throw new Error();
    await emitAuditEvent({
      workspaceId: context.workspaceId,
      actorId: context.userId,
      eventType: "cloud.folder_created",
      targetType: "cloud_folder",
      targetId: data.id,
      metadata: { name: data.name },
    });
    return Response.json(data, { status: 201 });
  } catch {
    return safeErrorResponse("Folder could not be created.");
  }
}
