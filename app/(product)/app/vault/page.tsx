import type { Metadata } from "next";
import { PageHeader } from "@/components/product/PageHeader";
import { VaultClient } from "@/components/vault/VaultClient";
import { getWorkspaceData } from "@/lib/data/queries";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Vault" };

export default async function VaultPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const { project } = await searchParams;
  const data = isSupabaseConfigured ? await getWorkspaceData() : null;
  return (
    <>
      <PageHeader
        eyebrow="Candler Vault"
        title="Vault"
        description="Encrypted credentials by project and environment. Values stay sealed until you step up."
      />
      <VaultClient
        secrets={(data?.secrets ?? []) as never[]}
        projects={(data?.projects ?? []) as never[]}
        initialProjectId={project}
      />
    </>
  );
}
