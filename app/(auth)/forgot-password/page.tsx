import type { Metadata } from "next";
import Link from "next/link";

import { AUTH_ROUTES } from "@/lib/auth/routes";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthConfigNotice } from "@/components/auth/AuthConfigNotice";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Reset your password",
  description: "We'll email you a secure link to reset your Candler password.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Forgot your password?"
      subtitle="Enter your email and we'll send a secure link to reset it."
      footer={
        <Link
          href={AUTH_ROUTES.signIn}
          className="font-medium text-lavender transition-colors hover:text-white"
        >
          ← Back to sign in
        </Link>
      }
    >
      <AuthConfigNotice />
      <ForgotPasswordForm />
    </AuthCard>
  );
}
