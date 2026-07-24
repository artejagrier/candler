import type { Metadata } from "next";

import { WorkspacePlaceholder } from "@/components/workspace/WorkspacePlaceholder";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return (
    <WorkspacePlaceholder
      eyebrow="Workspace"
      title="Projects"
      description="Every software project you build and maintain, each with its own connected services, environments, vault, and documentation."
      phase="Phase 1D"
      zones={[
        { title: "Project directory", note: "Browse and search all your projects." },
        { title: "Connected services", note: "GitHub, Vercel, Supabase, Stripe, Cloudflare." },
        { title: "Environments", note: "Development, Preview, Staging, Production." },
      ]}
    />
  );
}
