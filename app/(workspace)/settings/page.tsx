import type { Metadata } from "next";

import { WorkspacePlaceholder } from "@/components/workspace/WorkspacePlaceholder";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <WorkspacePlaceholder
      eyebrow="Workspace"
      title="Settings"
      description="Workspace, appearance, and timezone. A saved timezone preference will drive the dynamic sky instead of your browser's local time."
      phase="Phase 1E"
      zones={[
        { title: "Appearance", note: "Theme and the time-of-day sky." },
        { title: "Timezone", note: "Choose the timezone that sets your sky." },
        { title: "Workspace", note: "Name, plan, and members." },
      ]}
    />
  );
}
