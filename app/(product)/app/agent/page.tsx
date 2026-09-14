import type { Metadata } from "next";
import { PageHeader } from "@/components/product/PageHeader";
import { AgentPanel } from "@/components/agent/AgentPanel";

export const metadata: Metadata = { title: "Agent" };

export default function AgentPage() {
  const configured = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_AGENT_MODEL);
  return (
    <>
      <PageHeader
        eyebrow="Candler Agent"
        title="Agent"
        description="Metadata-only analysis of your stack. Purple while Candler reasons. Green when something is verified or resolved."
      />
      <AgentPanel configured={configured} />
    </>
  );
}
