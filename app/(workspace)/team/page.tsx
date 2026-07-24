import type { Metadata } from "next";

import { WorkspacePlaceholder } from "@/components/workspace/WorkspacePlaceholder";

export const metadata: Metadata = { title: "Team" };

export default function TeamPage() {
  return (
    <WorkspacePlaceholder
      eyebrow="Workspace"
      title="Team"
      description="Members, roles, and workspace access — owners, admins, developers, and viewers, with project-level permissions and vault restrictions."
      phase="Phase 1E"
      zones={[
        { title: "Members", note: "Invite, manage roles, and review access." },
        { title: "Permissions", note: "Project-level and vault-level restrictions." },
        { title: "Workspaces", note: "Personal and team workspaces with switching." },
      ]}
    />
  );
}
