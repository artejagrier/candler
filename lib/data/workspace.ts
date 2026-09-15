import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";

export interface WorkspaceContext { userId: string; workspaceId: string; workspaceName: string; }

export async function getWorkspaceContext({ create = true }: { create?: boolean } = {}): Promise<WorkspaceContext | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data: membership } = await supabase.from("workspace_members").select("workspace_id,workspaces(name)").eq("user_id", user.id).limit(1).maybeSingle();
  if (membership) {
    const relation = membership.workspaces as unknown as { name: string } | null;
    return { userId: user.id, workspaceId: membership.workspace_id, workspaceName: relation?.name ?? "Personal workspace" };
  }
  const { data: owned } = await supabase.from("workspaces").select("id,name").eq("owner_id", user.id).limit(1).maybeSingle();
  if (owned) {
    await supabase.from("workspace_members").upsert({ workspace_id: owned.id, user_id: user.id, role: "owner" });
    return { userId: user.id, workspaceId: owned.id, workspaceName: owned.name };
  }
  if (!create) return null;
  const displayName = typeof user.user_metadata?.full_name === "string" ? `${user.user_metadata.full_name}'s workspace` : "Personal workspace";
  const { data: workspace, error } = await supabase.from("workspaces").insert({ name: displayName, owner_id: user.id }).select("id,name").single();
  if (error || !workspace) {
    const { data: existing } = await supabase.from("workspaces").select("id,name").eq("owner_id", user.id).limit(1).maybeSingle();
    if (existing) {
      await supabase.from("workspace_members").upsert({ workspace_id: existing.id, user_id: user.id, role: "owner" });
      return { userId: user.id, workspaceId: existing.id, workspaceName: existing.name };
    }
    throw new Error("Unable to create workspace.");
  }
  const { error: memberError } = await supabase.from("workspace_members").insert({ workspace_id: workspace.id, user_id: user.id, role: "owner" });
  if (memberError) {
    const { data: membership } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", user.id).eq("workspace_id", workspace.id).maybeSingle();
    if (!membership) throw new Error("Unable to initialize workspace membership.");
  }
  return { userId: user.id, workspaceId: workspace.id, workspaceName: workspace.name };
}

export async function requireWorkspaceAccess(workspaceId: string): Promise<WorkspaceContext> {
  const context = await getWorkspaceContext();
  if (!context || context.workspaceId !== workspaceId) throw new Error("Not authorized for this workspace.");
  return context;
}

export async function requireProjectAccess(projectId: string) {
  const context = await getWorkspaceContext();
  if (!context) throw new Error("Workspace unavailable.");
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("id,name,workspace_id").eq("id", projectId).eq("workspace_id", context.workspaceId).maybeSingle();
  if (!data) throw new Error("Project not found.");
  return { ...context, project: data };
}
