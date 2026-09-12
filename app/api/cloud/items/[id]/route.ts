import { z } from "zod";
import { deleteObject } from "@/lib/cloud/storage";
import { emitAuditEvent } from "@/lib/audit/events";
import { safeErrorResponse } from "@/lib/security/redaction";
import { requireCloudActor } from "@/lib/cloud/operations";
import type { SupabaseClient } from "@supabase/supabase-js";

const patchSchema = z.object({
  kind: z.enum(["file", "folder"]),
  action: z.enum(["rename", "move", "trash", "restore"]),
  name: z.string().trim().min(1).max(512).optional(),
  parentId: z.uuid().nullable().optional(),
});

async function descendantFolderIds(admin: SupabaseClient, folderId: string, ownerId: string): Promise<string[]> {
  const ids = [folderId];
  const queue = [folderId];
  while (queue.length) {
    const current = queue.shift()!;
    const { data } = await admin.from("cloud_folders").select("id").eq("parent_id", current).eq("owner_id", ownerId);
    for (const row of data ?? []) {
      ids.push(row.id);
      queue.push(row.id);
    }
  }
  return ids;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { context, admin } = await requireCloudActor();
    const { id } = await params;
    const input = patchSchema.parse(await request.json());
    const table = input.kind === "file" ? "cloud_files" : "cloud_folders";
    const parentColumn = input.kind === "file" ? "folder_id" : "parent_id";
    const previousColumn = input.kind === "file" ? "previous_folder_id" : "previous_parent_id";
    const { data: item } = await admin
      .from(table)
      .select("*")
      .eq("id", id)
      .eq("workspace_id", context.workspaceId)
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!item) return safeErrorResponse("Item not found.", 404);

    const now = new Date().toISOString();
    const values: Record<string, unknown> = { updated_at: now };
    if (input.action === "rename") values[input.kind === "file" ? "original_filename" : "name"] = input.name;
    if (input.action === "move") values[parentColumn] = input.parentId ?? null;
    if (input.action === "trash") {
      values[previousColumn] = item[parentColumn];
      values.deleted_at = now;
    }
    if (input.action === "restore") {
      values[parentColumn] = item[previousColumn] ?? null;
      values.deleted_at = null;
      values[previousColumn] = null;
    }

    const { error } = await admin.from(table).update(values).eq("id", id).eq("owner_id", context.userId);
    if (error) throw new Error();

    if (input.kind === "folder" && (input.action === "trash" || input.action === "restore")) {
      const folderIds = await descendantFolderIds(admin, id, context.userId);
      const childUpdate = input.action === "trash"
        ? { deleted_at: now, updated_at: now }
        : { deleted_at: null, updated_at: now };
      await admin.from("cloud_folders").update(childUpdate).in("id", folderIds).eq("owner_id", context.userId);
      await admin.from("cloud_files").update(childUpdate).in("folder_id", folderIds).eq("owner_id", context.userId);
    }

    const safeName = item.original_filename ?? item.name;
    await emitAuditEvent({
      workspaceId: context.workspaceId,
      actorId: context.userId,
      eventType: `cloud.${input.action === "rename" ? "renamed" : input.action === "move" ? "moved" : input.action}`,
      targetType: `cloud_${input.kind}`,
      targetId: id,
      metadata: { name: safeName, newName: input.name, parentId: input.parentId },
    });
    return Response.json({ ok: true });
  } catch {
    return safeErrorResponse("Item could not be updated.");
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { context, admin } = await requireCloudActor();
    const { id } = await params;
    const input = z.object({
      kind: z.enum(["file", "folder"]),
      confirmation: z.literal("DELETE PERMANENTLY"),
    }).parse(await request.json());

    if (input.kind === "file") {
      const { data: file } = await admin
        .from("cloud_files")
        .select("id,object_key,original_filename")
        .eq("id", id)
        .eq("owner_id", context.userId)
        .eq("workspace_id", context.workspaceId)
        .not("deleted_at", "is", null)
        .maybeSingle();
      if (!file) return safeErrorResponse("Trashed file not found.", 404);
      await deleteObject(file.object_key);
      const { error } = await admin.from("cloud_files").delete().eq("id", id).eq("owner_id", context.userId);
      if (error) throw new Error();
      await emitAuditEvent({
        workspaceId: context.workspaceId,
        actorId: context.userId,
        eventType: "cloud.permanently_deleted",
        targetType: "cloud_file",
        targetId: id,
        metadata: { filename: file.original_filename },
      });
    } else {
      const { data: folder } = await admin
        .from("cloud_folders")
        .select("id,name")
        .eq("id", id)
        .eq("owner_id", context.userId)
        .eq("workspace_id", context.workspaceId)
        .not("deleted_at", "is", null)
        .maybeSingle();
      if (!folder) return safeErrorResponse("Trashed folder not found.", 404);
      const folderIds = await descendantFolderIds(admin, id, context.userId);
      const { data: files } = await admin.from("cloud_files").select("id,object_key").in("folder_id", folderIds).eq("owner_id", context.userId);
      for (const file of files ?? []) await deleteObject(file.object_key);
      await admin.from("cloud_files").delete().in("folder_id", folderIds).eq("owner_id", context.userId);
      await admin.from("cloud_folders").delete().in("id", folderIds).eq("owner_id", context.userId);
      await emitAuditEvent({
        workspaceId: context.workspaceId,
        actorId: context.userId,
        eventType: "cloud.permanently_deleted",
        targetType: "cloud_folder",
        targetId: id,
        metadata: { name: folder.name },
      });
    }
    return Response.json({ ok: true });
  } catch {
    return safeErrorResponse("Item could not be permanently deleted.");
  }
}
