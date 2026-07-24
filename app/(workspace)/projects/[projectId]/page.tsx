import type { Metadata } from "next";

import { MOCK_PROJECTS } from "@/lib/mock/projects";
import { WorkspacePlaceholder } from "@/components/workspace/WorkspacePlaceholder";

// Next.js 16: params is async and must be awaited.
export async function generateMetadata(
  props: PageProps<"/projects/[projectId]">,
): Promise<Metadata> {
  const { projectId } = await props.params;
  const project = MOCK_PROJECTS.find((p) => p.id === projectId);
  return { title: project?.name ?? "Project" };
}

export default async function ProjectDetailPage(
  props: PageProps<"/projects/[projectId]">,
) {
  const { projectId } = await props.params;
  const project = MOCK_PROJECTS.find((p) => p.id === projectId);
  const name = project?.name ?? projectId;

  return (
    <WorkspacePlaceholder
      eyebrow="Project"
      title={name}
      description={`The central home for ${name} — overview, environments, connected services, vault, documentation, domains, and activity — all in one place.`}
      phase="Phase 1D"
      zones={[
        { title: "Overview", note: "Status, framework, repository, and deployment URLs." },
        { title: "Vault", note: "API keys, environment variables, and credentials." },
        { title: "Documentation", note: "Setup, commands, deployment, and troubleshooting." },
      ]}
    />
  );
}
