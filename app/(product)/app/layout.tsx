import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ProductShell } from "@/components/product/ProductShell";
import { LegalReconsentDialog } from "@/components/legal/LegalReconsentDialog";
import { getCurrentUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env";
import { getWorkspaceContext } from "@/lib/data/workspace";
import { userNeedsLegalReconsent } from "@/lib/legal/consent";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard" };

export default async function ProductLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (isSupabaseConfigured && !user) redirect("/login?next=/app");
  if (!user) return <ProductShell userName="Preview" workspaceName="Connect Supabase to use Candler">{children}</ProductShell>;
  const workspace = await getWorkspaceContext();
  const userName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : user.email?.split("@")[0] ?? "Developer";
  let projects: { id: string; name: string }[] = [];
  if (workspace && isSupabaseConfigured) {
    const supabase = await createClient();
    const { data } = await supabase.from("projects").select("id,name").eq("workspace_id", workspace.workspaceId).order("name");
    projects = data ?? [];
  }
  const needsReconsent = isSupabaseConfigured ? await userNeedsLegalReconsent(user.id) : false;
  return (
    <ProductShell userName={userName} workspaceName={workspace?.workspaceName ?? "Personal workspace"} projects={projects}>
      {needsReconsent ? <LegalReconsentDialog /> : null}
      {children}
    </ProductShell>
  );
}
