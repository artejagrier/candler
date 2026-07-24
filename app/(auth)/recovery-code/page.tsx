import type { Metadata } from "next";
import { LifeBuoy } from "lucide-react";

import { param, type SearchParams } from "@/lib/utilities/params";
import { AuthCard } from "@/components/auth/AuthCard";
import { RecoveryCodeForm } from "@/components/auth/RecoveryCodeForm";

export const metadata: Metadata = {
  title: "Use a recovery code",
  description: "Regain access with one of your saved MFA recovery codes.",
};

export default async function RecoveryCodePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const next = param(sp, "next");

  return (
    <AuthCard
      icon={LifeBuoy}
      title="Use a recovery code"
      subtitle="Lost access to your authenticator? Enter a backup code to regain access. Using a code removes the lost authenticator so you can enroll a new one."
    >
      <RecoveryCodeForm next={next} />
    </AuthCard>
  );
}
