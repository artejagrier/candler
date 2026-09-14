import type { Metadata } from "next";
import { PageHeader } from "@/components/product/PageHeader";
import { RecoveryClient } from "@/components/vault/RecoveryClient";
import { getWorkspaceData } from "@/lib/data/queries";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Recovery codes" };

export default async function RecoveryPage() {
  const data = isSupabaseConfigured ? await getWorkspaceData() : null;
  return (
    <>
      <PageHeader
        eyebrow="Vault"
        title="Recovery codes"
        description="Encrypted backup codes for when everything else fails."
      />
      <RecoveryClient sets={(data?.recovery ?? []) as never[]} />
    </>
  );
}
