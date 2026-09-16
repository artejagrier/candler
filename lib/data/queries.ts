import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/data/workspace";

export async function getWorkspaceData() {
  const context = await getWorkspaceContext();
  if (!context) return null;
  const supabase = await createClient();
  const [projects, secrets, files, folders, conversations, activity, subscription, authenticators, recovery] = await Promise.all([
    supabase.from("projects").select("id,name,slug,created_at,updated_at,environments(id,name,kind),services(id,name,provider)").eq("workspace_id", context.workspaceId).order("created_at"),
    supabase.from("secrets").select("id,name,project_id,environment_id,service_id,secret_type,notes,tags,expires_at,rotate_at,last_accessed_at,created_at,updated_at,projects(name),environments(name,kind),services(name,provider)").eq("workspace_id", context.workspaceId).order("updated_at", { ascending: false }),
    supabase.from("cloud_files").select("id,original_filename,mime_type,size_bytes,status,project_id,folder_id,relative_path,deleted_at,created_at,updated_at,projects(name)").eq("workspace_id", context.workspaceId).is("deleted_at", null).order("updated_at", { ascending: false }),
    supabase.from("cloud_folders").select("id,name,parent_id,project_id,deleted_at,created_at,updated_at").eq("workspace_id",context.workspaceId).is("deleted_at",null).order("name"),
    supabase.from("agent_conversations").select("id,title,project_id,created_at,updated_at").eq("workspace_id", context.workspaceId).order("updated_at", { ascending: false }),
    supabase.from("audit_events").select("id,event_type,target_type,target_id,metadata,created_at").eq("workspace_id", context.workspaceId).order("created_at", { ascending: false }).limit(20),
    supabase.from("subscriptions").select("product_key,status,current_period_end,storage_quota_bytes,entitlement_pro,cloud_plan,paddle_customer_id").eq("workspace_id", context.workspaceId).order("updated_at", { ascending: false }),
    supabase.from("authenticator_entries").select("id,issuer,account_name,pinned,last_used_at,created_at,updated_at").eq("workspace_id", context.workspaceId).eq("owner_id", context.userId).order("issuer"),
    supabase.from("recovery_code_sets").select("id,service,account_name,total_count,remaining_count,created_at,updated_at").eq("workspace_id", context.workspaceId).order("updated_at", { ascending: false }),
  ]);
  let authenticatorRows = authenticators.data ?? [];
  if (authenticators.error) {
    const fallback = await supabase.from("authenticator_entries").select("id,issuer,account_name,created_at,updated_at").eq("workspace_id", context.workspaceId).eq("owner_id", context.userId).order("issuer");
    authenticatorRows = (fallback.data ?? []).map((row) => ({ ...row, pinned: false, last_used_at: null }));
  }
  return { context, projects: projects.data ?? [], secrets: secrets.data ?? [], files: files.data ?? [], folders:folders.data??[], conversations: conversations.data ?? [], activity: activity.data ?? [], subscriptions: subscription.data ?? [], authenticators: authenticatorRows, recovery: recovery.data ?? [] };
}
