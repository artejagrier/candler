import type { Metadata } from "next";

import { Greeting } from "@/components/workspace/Greeting";
import { WorkspacePlaceholder } from "@/components/workspace/WorkspacePlaceholder";

export const metadata: Metadata = { title: "Home" };

export default function DashboardPage() {
  return (
    <WorkspacePlaceholder
      eyebrow="Workspace"
      title="Home"
      header={<Greeting name="Arteja" />}
      description="Everything your projects need is connected here. The full dashboard — Workspace Orbit, security pulse, and activity rail — is built next."
      phase="Phase 1C"
      zones={[
        {
          title: "Workspace Orbit",
          note: "See how each project connects to GitHub, Vercel, Supabase, and more.",
        },
        {
          title: "Security pulse",
          note: "Health, upcoming rotations, and integrations needing attention.",
        },
        {
          title: "Recent activity",
          note: "A live rail of secrets, deployments, and team changes.",
        },
      ]}
    />
  );
}
