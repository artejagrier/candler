import { PageHeader } from "@/components/product/PageHeader";
import { SecurityClient } from "@/components/product/SecurityClient";
import { getAssuranceLevel, getCurrentUser } from "@/lib/auth/session";

export default async function Security() {
  const [aal, user] = await Promise.all([getAssuranceLevel(), getCurrentUser()]);
  return (
    <>
      <PageHeader eyebrow="Settings" title="Security" description="Password, MFA, and real Supabase session controls." />
      <SecurityClient aal={aal.current} email={user?.email ?? null} />
      <p className="security-note">
        Sensitive reveals require an MFA-assured session or a password re-check valid for 15 minutes.
        Access-token refresh is not treated as recent authentication.
      </p>
    </>
  );
}
