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

const VALID_PLANS = new Set(["candler_pro", "cloud_500", "cloud_1tb"]);

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  const validPlan = plan && VALID_PLANS.has(plan) ? plan : undefined;

  const signInHref = validPlan
    ? `${AUTH_ROUTES.signIn}?next=${encodeURIComponent(`/app/settings/billing?plan=${validPlan}`)}`
    : AUTH_ROUTES.signIn;

  return (
    <AuthCard
      title="Create your workspace"
      subtitle="Start organizing every project, secret, and service in one secure home."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href={signInHref}
            className="font-medium text-lavender transition-colors hover:text-white"
          >
            Sign in
          </Link>
        </>
      }
    >
      <AuthConfigNotice />
      <SignUpForm plan={validPlan} />
    </AuthCard>
  );
}
