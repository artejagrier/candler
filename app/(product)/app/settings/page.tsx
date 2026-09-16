import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/product/PageHeader";
import { AppearanceSettings } from "@/components/theme/AppearanceSettings";
import { LegalSettings } from "@/components/legal/LegalSettings";
import { ReplayTutorial } from "@/components/workspace/ReplayTutorial";
import { getCurrentUser } from "@/lib/auth/session";
import { getLatestLegalConsent } from "@/lib/legal/consent";

export const metadata: Metadata = { title: "Settings" };

export default async function Settings() {
  const user = await getCurrentUser();
  const email = user?.email ?? "Connect Supabase to load your account.";
  const consent = user ? await getLatestLegalConsent(user.id).catch(() => null) : null;
  return (
    <>
      <PageHeader eyebrow="Workspace" title="Settings" description="Appearance, account, security, and billing." />
      <AppearanceSettings />
      <ReplayTutorial />
      <LegalSettings consent={consent} />
      <div className="settings-list">
        <div>
          <p><b>Account</b><small>{email}</small></p>
        </div>
        {[
          ["Account", "Password, MFA, sessions, and recovery", "/app/settings/security"],
          ["Billing", "Subscriptions, cloud plans, and invoices", "/app/settings/billing"],
        ].map(([title, detail, href]) => (
          <Link href={href} key={title}>
            <p><b>{title}</b><small>{detail}</small></p>
            <ArrowRight />
          </Link>
        ))}
      </div>
    </>
  );
}
