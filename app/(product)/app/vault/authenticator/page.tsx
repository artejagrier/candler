import type { Metadata } from "next";
import { PageHeader } from "@/components/product/PageHeader";
import { AuthenticatorClient } from "@/components/vault/AuthenticatorClient";
import { getWorkspaceData } from "@/lib/data/queries";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Authenticator" };

export default async function AuthenticatorPage() {
  const data = isSupabaseConfigured ? await getWorkspaceData() : null;
  return (
    <>
      <PageHeader
        eyebrow="Candler Authenticator"
        title="Authenticator"
        description="Your verification codes, protected by Candler."
      />
      <AuthenticatorClient entries={(data?.authenticators ?? []) as never[]} />
    </>
  );
}
