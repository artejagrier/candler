import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/product/PageHeader";
import { getWorkspaceData } from "@/lib/data/queries";
import { getCurrentUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env";
import { getProjectSecretsMetadata } from "@/lib/agent/context";
import { deriveHealthFindings, healthScore } from "@/lib/health/findings";
import { createClient } from "@/lib/supabase/server";
import { activityKind, activityLabel } from "@/lib/product/activity-copy";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const data = isSupabaseConfigured ? await getWorkspaceData() : null;
  const user = await getCurrentUser();
  if (user && isSupabaseConfigured) {
    const supabase = await createClient();
    const { data: pref } = await supabase
      .from("user_preferences")
      .select("onboarding_completed_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!pref?.onboarding_completed_at) redirect("/app/onboarding");
  }

  const raw = (data?.secrets ?? []).map((r) => ({
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
  const metadataRows = getProjectSecretsMetadata(raw);
  const findings = deriveHealthFindings(
    metadataRows.map((m, i) => ({
      ...m,
      expiresAt: raw[i].expiresAt,
      projectId: raw[i].projectId,
      serviceId: raw[i].serviceId,
      environmentId: raw[i].environmentId,
      lastAccessedAt: raw[i].lastAccessedAt,
    })),
  );
  const bytes = (data?.files ?? [])
    .filter((f) => f.status === "backed_up")
    .reduce((n, f) => n + Number(f.size_bytes), 0);

  const score = healthScore(findings);
  const highCount = findings.filter((f) => f.severity === "high").length;
  const state = !findings.length ? "protected" : highCount ? "action" : "watching";
  const ringColor =
    state === "protected"
      ? "var(--color-green)"
      : state === "watching"
        ? "var(--color-purple-bright)"
        : "var(--color-warning)";
  const gb = (bytes / 1024 ** 3).toFixed(2);
  const plural = (n: number) => (n === 1 ? "" : "s");
  const badgeLabel =
    state === "protected" ? "Protected" : state === "watching" ? "Watching" : "Action needed";
  const headline =
    state === "protected" ? (
      <>Everything is <em>protected</em>.</>
    ) : state === "watching" ? (
      <>Candler is <em>watching</em> {findings.length} item{plural(findings.length)}.</>
    ) : (
      <>{highCount} item{plural(highCount)} <em>need action</em>.</>
    );
  const sub =
    state === "protected"
      ? `All ${data?.secrets.length ?? 0} stored credential${plural(data?.secrets.length ?? 0)} verified · ${gb} GB backed up across ${data?.projects.length ?? 0} project${plural(data?.projects.length ?? 0)}.`
      : state === "watching"
        ? `${findings.length} metadata finding${plural(findings.length)} tracked across your credentials. Review them with Candler before any become urgent.`
        : `${highCount} high-priority finding${plural(highCount)} in your stored credentials. Resolve these first — Candler can walk you through each one.`;

  const recentProjects = [...(data?.projects ?? [])]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 6);

  return (
    <>
      <PageHeader
        eyebrow={data?.context.workspaceName ?? "Workspace"}
        title="Dashboard"
        description={
          data
            ? "Command center for projects, protection, Cloud, and Agent."
            : "Connect Supabase to begin using Candler."
        }
        actions={
          <Link className="primary-button" href="/app/agent">
            Ask Candler <ArrowRight />
          </Link>
        }
      />
      {!data?.projects.length ? (
        <div className="empty-state">
          <h2>No projects yet.</h2>
          <p>Create a project to start securing credentials and backing up files.</p>
          <Link className="primary-button" href="/app/projects">
            Create project
          </Link>
        </div>
      ) : (
        <>
          <section className="system-health" aria-label="System health">
            <div className="health-state">
              <span className="health-badge" data-state={state}>
                <span className="dot" aria-hidden="true" />
                {badgeLabel}
              </span>
              <h2 className="health-headline" data-state={state}>
                {headline}
              </h2>
              <p className="health-sub">
                {sub}{" "}
                {state !== "protected" ? (
                  <Link href="/app/agent">Review with Candler →</Link>
                ) : null}
              </p>
            </div>
            <div className="health-aside">
              <div
                className="health-ring"
                style={{ ["--p"]: score, ["--ring-color"]: ringColor } as React.CSSProperties}
                role="img"
                aria-label={`Health score ${score} out of 100`}
              >
                <div>
                  <b>{score}</b>
                  <small>Health</small>
                </div>
              </div>
              <p className="health-sub" style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
                <ShieldCheck className="size-4" style={{ color: "var(--color-green)" }} aria-hidden="true" />
                Candler protected
              </p>
            </div>
          </section>

          <section className="dash-facts" aria-label="Workspace summary">
            <div>
              <small>Cloud storage</small>
              <b>{gb} GB</b>
              <small>verified backup</small>
            </div>
            <div>
              <small>Vault</small>
              <b>{data.secrets.length}</b>
              <small>secret{plural(data.secrets.length)} encrypted</small>
            </div>
            <div>
              <small>Agent</small>
              <b>{data.conversations.length}</b>
              <small>conversation{plural(data.conversations.length)}</small>
            </div>
          </section>

          <section>
            <div className="section-heading">
              <div>
                <p className="eyebrow">Projects</p>
                <h2>Recent</h2>
              </div>
              <Link href="/app/projects">All projects</Link>
            </div>
            <div className="dash-projects">
              {recentProjects.map((project) => (
                <Link href={`/app/projects/${project.id}`} key={project.id}>
                  <b>{project.name}</b>
                  <span>{project.environments?.length ?? 0} env</span>
                  <time dateTime={project.updated_at}>
                    {new Date(project.updated_at).toLocaleDateString()}
                  </time>
                </Link>
              ))}
            </div>
          </section>

          <section className="dashboard-split">
            <div>
              <div className="section-heading">
                <div>
                  <p className="eyebrow">History</p>
                  <h2>Recent activity</h2>
                </div>
                <Link href="/app/activity">View all</Link>
              </div>
              {data.activity.length ? (
                <div className="activity-list">
                  {data.activity.slice(0, 6).map((event) => (
                    <div key={event.id}>
                      <span>·</span>
                      <p>
                        <b>{activityLabel(event.event_type)}</b>
                        <small>{activityKind(event.event_type)}</small>
                      </p>
                      <time>{new Date(event.created_at).toLocaleDateString()}</time>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-copy">No activity yet.</p>
              )}
            </div>
            <aside className="attention-list">
              <p className="eyebrow">Needs attention</p>
              <h2>{findings.length ? `${findings.length} finding${plural(findings.length)}` : "All clear"}</h2>
              {findings.length ? (
                findings.slice(0, 4).map((f, i) => (
                  <div key={`${f.code}-${i}`}>
                    <b>{f.title}</b>
                    <small>{f.severity} priority</small>
                  </div>
                ))
              ) : (
                <p className="empty-copy">No metadata findings. Candler will surface anything new here.</p>
              )}
            </aside>
          </section>
        </>
      )}
    </>
  );
}
