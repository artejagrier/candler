import type { Metadata } from "next";
import { PageHeader } from "@/components/product/PageHeader";
import { SecurityClient } from "@/components/product/SecurityClient";
import { getAssuranceLevel, getCurrentUser, hasVerifiedTotpFactor } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Account" };

export default async function Security() {
  const [aal, user, totpEnrolled] = await Promise.all([getAssuranceLevel(), getCurrentUser(), hasVerifiedTotpFactor()]);
  return (
    <>
      <PageHeader eyebrow="Settings" title="Account" description="Password, MFA, and session controls." />
      <SecurityClient aal={aal.current} email={user?.email ?? null} totpEnrolled={totpEnrolled} />
      <p className="security-note">
        Sensitive reveals require an MFA-assured session or a password re-check valid for 15 minutes.
        Access-token refresh is not treated as recent authentication.
      </p>
    </>
  );
}
