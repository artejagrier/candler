import type { Metadata } from "next";

import { WorkspacePlaceholder } from "@/components/workspace/WorkspacePlaceholder";

export const metadata: Metadata = { title: "Activity" };

export default function ActivityPage() {
  return (
    <WorkspacePlaceholder
      eyebrow="Workspace"
      title="Activity"
      description="A timeline of everything that changed — secrets created and updated, integrations connected, environments changed, and deployments recorded."
      phase="Phase 1C"
      zones={[
        { title: "Timeline", note: "Chronological, filterable activity across projects." },
        { title: "Audit trail", note: "Who did what, and when — for security review." },
      ]}
    />
  );
}
