import type { Metadata } from "next";

import { WorkspacePlaceholder } from "@/components/workspace/WorkspacePlaceholder";

export const metadata: Metadata = { title: "Security" };

export default function SecurityPage() {
  return (
    <WorkspacePlaceholder
      eyebrow="Workspace"
      title="Security"
      description="Security health, sessions, and audit trails. Built to support MFA, passkeys, device management, and secure sharing as the platform matures."
      phase="Phase 1E"
      zones={[
        { title: "Security center", note: "Health score and recommended actions." },
        { title: "Sessions & devices", note: "Review and revoke active sessions." },
        { title: "Audit trails", note: "A verifiable record of sensitive actions." },
      ]}
    />
  );
}
