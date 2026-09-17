import type { Metadata } from "next";
import { PageHeader } from "@/components/product/PageHeader";
import { AuthenticatorClient } from "@/components/vault/AuthenticatorClient";
import { VaultUnlockBar } from "@/components/vault/VaultUnlockBar";
import { CandlerTotpEnrollment } from "@/components/auth/CandlerTotpEnrollment";
import { getWorkspaceData } from "@/lib/data/queries";
import { isSupabaseConfigured } from "@/lib/env";
import { hasVerifiedTotpFactor } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Authenticator" };

export default async function AuthenticatorPage() {
  const data = isSupabaseConfigured ? await getWorkspaceData() : null;
  const totpEnrolled = isSupabaseConfigured ? await hasVerifiedTotpFactor() : false;
  return (
    <>
      <PageHeader
        eyebrow="Candler Authenticator"
        title="Authenticator"
        description="Your verification codes, protected by Candler."
      />
      <VaultUnlockBar />
      <CandlerTotpEnrollment enrolled={totpEnrolled} variant="vault" />
      <AuthenticatorClient entries={(data?.authenticators ?? []) as never[]} recoveryPhraseConfigured={Boolean(data?.recoveryPhraseConfigured)} />
    </>
  );
}
