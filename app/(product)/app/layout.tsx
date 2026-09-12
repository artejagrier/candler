import { redirect } from "next/navigation";
import { ProductShell } from "@/components/product/ProductShell";
import { getCurrentUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env";
import { getWorkspaceContext } from "@/lib/data/workspace";

export default async function ProductLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (isSupabaseConfigured && !user) redirect("/login?next=/app");
  if (!user) return <ProductShell userName="Preview" workspaceName="Connect Supabase to use Candler">{children}</ProductShell>;
  const workspace=await getWorkspaceContext();
  const userName=typeof user.user_metadata?.full_name==="string"?user.user_metadata.full_name:user.email?.split("@")[0]??"Developer";
  return <ProductShell userName={userName} workspaceName={workspace?.workspaceName??"Personal workspace"}>{children}</ProductShell>;
}
