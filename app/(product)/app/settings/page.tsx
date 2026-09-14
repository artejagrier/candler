import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/product/PageHeader";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Settings" };

export default async function Settings() {
  const user = await getCurrentUser();
  const email = user?.email ?? "Connect Supabase to load your account.";
  return (
    <>
      <PageHeader eyebrow="Workspace" title="Settings" description="Account, security, and billing." />
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
