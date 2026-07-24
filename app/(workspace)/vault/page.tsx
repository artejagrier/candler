import type { Metadata } from "next";

import { WorkspacePlaceholder } from "@/components/workspace/WorkspacePlaceholder";

export const metadata: Metadata = { title: "Vault" };

export default function VaultPage() {
  return (
    <WorkspacePlaceholder
      eyebrow="Workspace"
      title="Vault"
      description="Secrets, API keys, environment variables, SSH keys, and certificates — masked by default, searchable, and organized beneath each project."
      phase="Phase 1D"
      zones={[
        { title: "Secret list", note: "Masked values with copy, reveal, and access history." },
        { title: "Create secret", note: "Typed secrets with tags, environment, and rotation." },
        { title: "Security", note: "Designed for client-side encryption and envelope keys." },
      ]}
    />
  );
}
