import type { Metadata } from "next";
import Link from "next/link";

import { AUTH_ROUTES } from "@/lib/auth/routes";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthConfigNotice } from "@/components/auth/AuthConfigNotice";
import { SignUpForm } from "@/components/auth/SignUpForm";

export const metadata: Metadata = {
  title: "Create your account",
  description: "Create a Candler workspace for every software project you build.",
};

export default function SignUpPage() {
  return (
    <AuthCard
      title="Create your workspace"
      subtitle="Start organizing every project, secret, and service in one secure home."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href={AUTH_ROUTES.signIn}
            className="font-medium text-lavender transition-colors hover:text-white"
          >
            Sign in
          </Link>
        </>
      }
    >
      <AuthConfigNotice />
      <SignUpForm />
      <p className="mt-4 text-center text-xs text-slate-muted">
        By creating an account you agree to our{" "}
        <Link href="/terms" className="text-fog hover:text-mist">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-fog hover:text-mist">
          Privacy Policy
        </Link>
        .
      </p>
    </AuthCard>
  );
}
