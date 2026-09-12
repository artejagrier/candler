import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceContext, type WorkspaceContext } from "@/lib/data/workspace";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function requireCloudActor(): Promise<{ context: WorkspaceContext; admin: SupabaseClient }> {
  const context = await getWorkspaceContext();
  if (!context) throw new Error("Authentication required.");
  return { context, admin: createAdminClient() };
}

export async function ensureFolderPath(
  admin: SupabaseClient,
  input: { workspaceId: string; ownerId: string; projectId: string | null; parentId: string | null; relativePath: string | null },
): Promise<string | null> {
  const parts = (input.relativePath ?? "").split("/").filter(Boolean);
  parts.pop();
  let parentId = input.parentId;
  for (const name of parts) {
    let query = admin
      .from("cloud_folders")
      .select("id")
      .eq("workspace_id", input.workspaceId)
      .eq("owner_id", input.ownerId)
      .eq("name", name)
      .is("deleted_at", null);
    query = parentId ? query.eq("parent_id", parentId) : query.is("parent_id", null);
    const { data: existing } = await query.maybeSingle();
    if (existing) {
      parentId = existing.id;
      continue;
    }
    const { data, error } = await admin
      .from("cloud_folders")
      .insert({
        workspace_id: input.workspaceId,
        owner_id: input.ownerId,
        project_id: input.projectId,
        parent_id: parentId,
        name,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error("Folder path could not be created.");
    parentId = data.id;
  }
  return parentId;
}
