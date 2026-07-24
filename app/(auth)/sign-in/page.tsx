import type { Metadata } from "next";
import Link from "next/link";

import { AUTH_ROUTES } from "@/lib/auth/routes";
import { param, type SearchParams } from "@/lib/utilities/params";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthConfigNotice } from "@/components/auth/AuthConfigNotice";
import { FormStatus } from "@/components/auth/FormStatus";
import { SignInForm } from "@/components/auth/SignInForm";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Candler workspace.",
};

const ERRORS: Record<string, string> = {
  auth_callback: "We couldn't complete sign-in. Please try again.",
  verify: "That verification link is invalid or has expired.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const next = param(sp, "next");
  const errorCode = param(sp, "error");

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to your Candler workspace."
      footer={
        <>
          New to Candler?{" "}
          <Link
            href={AUTH_ROUTES.signUp}
            className="font-medium text-lavender transition-colors hover:text-white"
          >
            Create an account
          </Link>
        </>
      }
    >
      <AuthConfigNotice />
      {errorCode ? (
        <div className="mb-4">
          <FormStatus
            type="error"
            message={ERRORS[errorCode] ?? "Something went wrong. Try again."}
          />
        </div>
      ) : null}
      <SignInForm next={next} />
    </AuthCard>
  );
}
