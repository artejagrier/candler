import type { Metadata } from "next";
import { UserPlus } from "lucide-react";

import { AuthCard } from "@/components/auth/AuthCard";
import { AuthConfigNotice } from "@/components/auth/AuthConfigNotice";
import { InvitationForm } from "@/components/auth/InvitationForm";

export const metadata: Metadata = {
  title: "Accept your invitation",
  description: "Set a password to join your team's Candler workspace.",
};

export default function InvitationPage() {
  return (
    <AuthCard
      icon={UserPlus}
      title="You've been invited"
      subtitle="Set a password to activate your account and join your team's workspace."
    >
      <AuthConfigNotice />
      <InvitationForm />
    </AuthCard>
  );
}
