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
        eyebrow="Security"
        title="Authenticator"
        description="Encrypted TOTP seeds. Codes are generated on the server and never persist in the browser."
      />
      <AuthenticatorClient entries={(data?.authenticators ?? []) as never[]} />
      <p className="security-note">Seeds are decrypted only long enough to generate a code and are never returned to the browser.</p>
    </>
  );
}
