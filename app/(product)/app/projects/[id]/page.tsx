import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader, Stat } from "@/components/product/PageHeader";
import { requireProjectAccess } from "@/lib/data/workspace";
import { createClient } from "@/lib/supabase/server";
import { getProjectSecretsMetadata } from "@/lib/agent/context";
import { deriveHealthFindings, healthScore } from "@/lib/health/findings";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let access;
  try {
    access = await requireProjectAccess(id);
  } catch {
    notFound();
  }
  const supabase = await createClient();
  const [envs, services, secrets, files] = await Promise.all([
    supabase.from("environments").select("id,name,kind").eq("project_id", id),
    supabase.from("services").select("id,name,provider").eq("project_id", id),
    supabase
      .from("secrets")
      .select("id,name,service_id,environment_id,project_id,created_at,expires_at,rotate_at,last_accessed_at,services(name),environments(name)")
      .eq("project_id", id)
      .eq("workspace_id", access.workspaceId),
    supabase
      .from("cloud_files")
      .select("id,size_bytes")
      .eq("project_id", id)
      .eq("workspace_id", access.workspaceId)
      .eq("status", "backed_up")
      .is("deleted_at", null),
  ]);
  const raw = (secrets.data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    service: (r.services as unknown as { name: string } | null)?.name ?? null,
    environment: (r.environments as unknown as { name: string } | null)?.name ?? null,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
    rotationDueAt: r.rotate_at,
    projectId: r.project_id,
    serviceId: r.service_id,
    environmentId: r.environment_id,
    lastAccessedAt: r.last_accessed_at,
  }));
  const metadata = getProjectSecretsMetadata(raw);
  const findings = deriveHealthFindings(
    metadata.map((m, i) => ({
      ...m,
      expiresAt: raw[i].expiresAt,
      projectId: id,
      serviceId: raw[i].serviceId,
      environmentId: raw[i].environmentId,
      lastAccessedAt: raw[i].lastAccessedAt,
    })),
  );
  const bytes = (files.data ?? []).reduce((n, f) => n + Number(f.size_bytes), 0);

  return (
    <>
      <PageHeader
        eyebrow="Project"
        title={access.project.name}
        description={(envs.data ?? []).map((e) => e.name).join(" · ") || "No environments"}
      />

      {/* Overview */}
      <section className="stat-row">
        <Stat label="Health" value={String(healthScore(findings))} detail={`${findings.length} finding${findings.length === 1 ? "" : "s"}`} />
        <Stat label="Secrets" value={String(metadata.length)} detail={`across ${envs.data?.length ?? 0} environments`} />
        <Stat label="Cloud" value={`${(bytes / 1024 ** 3).toFixed(2)} GB`} detail="verified backup" />
        <Stat label="Services" value={String(services.data?.length ?? 0)} detail="connected" />
      </section>

      {/* Issues — real health findings for this project */}
      <section className="flow-section">
        <p className="eyebrow">Issues</p>
        {findings.length ? (
          <div className="issue-flow">
            {findings.map((f, i) => (
              <div key={`${f.code}-${i}`}>
                <span className={`sev sev--${f.severity}`} aria-hidden="true" />
                <b>{f.title}</b>
                <small>{f.severity} priority</small>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-copy">
            No issues. Candler verified this project&apos;s metadata — nothing needs your attention.
          </p>
        )}
      </section>

      {/* Services */}
      <section className="flow-section">
        <p className="eyebrow">Connected services</p>
        {services.data?.length ? (
          services.data.map((x) => (
            <span className="service-chip" key={x.id}>
              {x.name}
            </span>
          ))
        ) : (
          <p className="empty-copy">No services connected yet.</p>
        )}
      </section>

      {/* Quiet jumps into this project's tools — the sidebar is the primary nav. */}
      <section className="flow-section project-links">
        <p className="eyebrow">Open in Candler</p>
        <Link href={`/app/vault?project=${id}`}>Vault</Link>
        <Link href={`/app/cloud?project=${id}`}>Cloud</Link>
        <Link href={`/app/agent?project=${id}`}>Agent</Link>
      </section>
    </>
  );
}
