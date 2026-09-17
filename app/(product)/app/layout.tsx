import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ProductShell } from "@/components/product/ProductShell";
import { LegalReconsentDialog } from "@/components/legal/LegalReconsentDialog";
import { getCurrentUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env";
import { getWorkspaceContext } from "@/lib/data/workspace";
import { userNeedsLegalReconsent } from "@/lib/legal/consent";
import { createClient } from "@/lib/supabase/server";
import { highestCloudPlan } from "@/lib/billing/entitlements";
import { isTrialingSubscription, planChipLabel } from "@/lib/billing/plan-display";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function ProductLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (isSupabaseConfigured && !user) redirect("/login?next=/app");
  if (!user) return <ProductShell userName="Preview" workspaceName="Connect Supabase to use Candler">{children}</ProductShell>;
  const workspace = await getWorkspaceContext();
  const userName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : user.email?.split("@")[0] ?? "Developer";
  let projects: { id: string; name: string }[] = [];
  let planLabel: string | undefined;
  if (workspace && isSupabaseConfigured) {
    const supabase = await createClient();
    const [{ data }, { data: subscriptions }] = await Promise.all([
      supabase.from("projects").select("id,name").eq("workspace_id", workspace.workspaceId).order("name"),
      supabase.from("subscriptions").select("status,current_period_end,cloud_plan,entitlement_pro").eq("workspace_id", workspace.workspaceId),
    ]);
    projects = data ?? [];
    const rows = subscriptions ?? [];
    planLabel = planChipLabel(highestCloudPlan(rows), isTrialingSubscription(rows));
  }
  const needsReconsent = isSupabaseConfigured ? await userNeedsLegalReconsent(user.id) : false;
  return (
    <ProductShell userName={userName} workspaceName={workspace?.workspaceName ?? "Personal workspace"} projects={projects} planLabel={planLabel}>
      {needsReconsent ? <LegalReconsentDialog /> : null}
      {children}
    </ProductShell>
  );
}
