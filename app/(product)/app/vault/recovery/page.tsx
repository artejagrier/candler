import type { Metadata } from "next";
import { PageHeader } from "@/components/product/PageHeader";
import { RecoveryClient } from "@/components/vault/RecoveryClient";
import { VaultUnlockBar } from "@/components/vault/VaultUnlockBar";
import { getWorkspaceData } from "@/lib/data/queries";
import { isSupabaseConfigured } from "@/lib/env";
import { param, type SearchParams } from "@/lib/utilities/params";

export const metadata: Metadata = { title: "Recovery codes" };

export default async function RecoveryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const data = isSupabaseConfigured ? await getWorkspaceData() : null;
  const sp = await searchParams;
  return (
    <>
      <PageHeader
        eyebrow="Vault"
        title="Recovery codes"
        description="Encrypted backup codes for when everything else fails."
      />
      <VaultUnlockBar />
      <RecoveryClient
        sets={(data?.recovery ?? []) as never[]}
        initialService={param(sp, "service")?.slice(0, 120) ?? ""}
        initialAccount={param(sp, "account")?.slice(0, 120) ?? ""}
        recoveryPhraseConfigured={Boolean(data?.recoveryPhraseConfigured)}
      />
    </>
  );
}
