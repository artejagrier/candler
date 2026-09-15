import type { Metadata } from "next";
import Link from "next/link";

import { AUTH_ROUTES } from "@/lib/auth/routes";
import { AUTH_ERROR_MESSAGES, type AuthErrorCode } from "@/lib/auth/oauth";
import { param, type SearchParams } from "@/lib/utilities/params";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthConfigNotice } from "@/components/auth/AuthConfigNotice";
import { FormStatus } from "@/components/auth/FormStatus";
import { SignInForm } from "@/components/auth/SignInForm";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Candler workspace.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const next = param(sp, "next");
  const errorCode = param(sp, "error");
  const errorMessage =
    errorCode && errorCode in AUTH_ERROR_MESSAGES
      ? AUTH_ERROR_MESSAGES[errorCode as AuthErrorCode]
      : errorCode
        ? AUTH_ERROR_MESSAGES.oauth
        : null;

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
      {errorMessage ? (
        <div className="mb-4">
          <FormStatus type="error" message={errorMessage} />
        </div>
      ) : null}
      <SignInForm next={next} />
    </AuthCard>
  );
}
