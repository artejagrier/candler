import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";

import { param, type SearchParams } from "@/lib/utilities/params";
import { AuthCard } from "@/components/auth/AuthCard";
import { MfaForm } from "@/components/auth/MfaForm";

export const metadata: Metadata = {
  title: "Two-factor authentication",
  description: "Enter the code from your authenticator app to continue.",
};

export default async function MfaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const next = param(sp, "next");

  return (
    <AuthCard
      icon={ShieldCheck}
      title="Two-factor authentication"
      subtitle="Open your authenticator app and enter the current 6-digit code to continue."
    >
      <MfaForm next={next} />
    </AuthCard>
  );
}
