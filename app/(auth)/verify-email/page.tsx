import type { Metadata } from "next";
import { MailCheck } from "lucide-react";
import Link from "next/link";

import { AUTH_ROUTES } from "@/lib/auth/routes";
import { param, type SearchParams } from "@/lib/utilities/params";
import { AuthCard } from "@/components/auth/AuthCard";
import { VerifyEmailPanel } from "@/components/auth/VerifyEmailPanel";

export const metadata: Metadata = {
  title: "Verify your email",
  description: "Confirm your email address to activate your Candler workspace.",
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const email = param(sp, "email");

  return (
    <AuthCard
      icon={MailCheck}
      title="Check your email"
      subtitle="Verification email requested. Check your inbox and spam folder. Click the confirmation link to activate your account."
      footer={
        <Link
          href={AUTH_ROUTES.signIn}
          className="font-medium text-lavender transition-colors hover:text-white"
        >
          ← Back to sign in
        </Link>
      }
    >
      <VerifyEmailPanel email={email} />
    </AuthCard>
  );
}
