import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/AuthCard";
import { AuthConfigNotice } from "@/components/auth/AuthConfigNotice";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Set a new password",
  description: "Choose a new password for your Candler account.",
};

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="Set a new password"
      subtitle="Choose a strong password you don't use anywhere else."
    >
      <AuthConfigNotice />
      <ResetPasswordForm />
    </AuthCard>
  );
}
