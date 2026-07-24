import type { Metadata } from "next";

import { WorkspacePlaceholder } from "@/components/workspace/WorkspacePlaceholder";

export const metadata: Metadata = { title: "Integrations" };

export default function IntegrationsPage() {
  return (
    <WorkspacePlaceholder
      eyebrow="Workspace"
      title="Integrations"
      description="Connect the services your stack already uses — GitHub, Vercel, Supabase, Stripe, and Cloudflare — and see their health at a glance."
      phase="Phase 1E"
      zones={[
        { title: "Integration directory", note: "Connected and disconnected services." },
        { title: "Connection detail", note: "Account, permissions, health, and last sync." },
        { title: "More providers", note: "OpenAI, Resend, Railway, Neon, AWS, and more." },
      ]}
    />
  );
}
