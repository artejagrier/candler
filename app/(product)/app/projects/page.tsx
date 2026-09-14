import type { Metadata } from "next";
import { PageHeader } from "@/components/product/PageHeader";
import { ProjectsClient, type ProjectRow } from "@/components/projects/ProjectsClient";
import { getWorkspaceData } from "@/lib/data/queries";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Projects" };

export default async function Projects() {
  const data = isSupabaseConfigured ? await getWorkspaceData() : null;
  const rows: ProjectRow[] = (data?.projects ?? []).map((project) => {
    const secrets = (data?.secrets ?? []).filter((s) => s.project_id === project.id);
    const files = (data?.files ?? []).filter((f) => f.project_id === project.id && f.status === "backed_up");
    const bytes = files.reduce((n, f) => n + Number(f.size_bytes), 0);
    const expiresAt = secrets.map((s) => s.expires_at).filter(Boolean).sort().at(0) ?? null;
    const rotateAt = secrets.map((s) => s.rotate_at).filter(Boolean).sort().at(0) ?? null;
    return {
      id: project.id,
      name: project.name,
      updated_at: project.updated_at,
      environments: project.environments,
      services: project.services,
      cloudBytes: bytes,
      expiresAt,
      rotateAt,
    };
  });

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Projects"
        description="Every project is a workspace for Vault, Cloud, and Agent. Storage quotas limit Cloud bytes, not how many projects you create."
      />
      <ProjectsClient projects={rows} />
    </>
  );
}
