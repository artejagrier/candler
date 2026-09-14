import type { Metadata } from "next";
import { PageHeader } from "@/components/product/PageHeader";
import { CloudBrowser } from "@/components/cloud/CloudBrowser";
import { getWorkspaceData } from "@/lib/data/queries";
import { isSupabaseConfigured } from "@/lib/env";
import { formatUsageSummary } from "@/lib/cloud/display";
import { CLOUD_PLANS } from "@/lib/cloud/quota";
import { getCurrentStorageUsage, getStorageQuota } from "@/lib/cloud/server";

export const metadata: Metadata = { title: "Cloud" };

export default async function CloudPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const { project } = await searchParams;
  const data = isSupabaseConfigured ? await getWorkspaceData() : null;
  const [usage, quota] = data
    ? await Promise.all([getCurrentStorageUsage(data.context.workspaceId), getStorageQuota(data.context.workspaceId)])
    : [0, { bytes: CLOUD_PLANS.free.bytes, plan: "free" as const }];
  const files = data?.files ?? [];
  const protectedProjects = new Set(files.filter((f) => f.status === "backed_up" && f.project_id).map((f) => f.project_id)).size;
  const recent = files.filter((f) => f.status === "backed_up")[0];
  const failed = files.filter((f) => f.status === "failed").length;
  const backed = files.filter((f) => f.status === "backed_up").length;
  const usageSummary = formatUsageSummary(usage, quota.bytes);

  return (
    <>
      <PageHeader
        eyebrow="Candler Cloud"
        title="Cloud"
        description="Verified backups for project files and folders. Restore to Device downloads a copy. The Cloud original stays backed up."
      />
      <section className="cloud-health" aria-label="Cloud overview">
        <div>
          <span>Used storage</span>
          <strong>{usageSummary.usedLabel} / {usageSummary.quotaLabel}</strong>
          <small>{usageSummary.percent}{usageSummary.secondary ? ` · ${usageSummary.secondary}` : ""}</small>
        </div>
        <div>
          <span>Protected projects</span>
          <strong>{protectedProjects}</strong>
          <small>{protectedProjects === 1 ? "project backed up" : "projects backed up"}</small>
        </div>
        <div>
          <span>Backups verified</span>
          <strong>{backed}</strong>
          <small>{failed ? `${failed} need attention` : "all clear"}</small>
        </div>
        <div>
          <span>Recent activity</span>
          <strong>{recent ? "Live" : "Idle"}</strong>
          <small>{recent ? recent.original_filename : "no uploads yet"}</small>
        </div>
      </section>
      <CloudBrowser
        workspaceId={data?.context.workspaceId ?? null}
        files={files as never[]}
        folders={(data?.folders ?? []) as never[]}
        projects={(data?.projects ?? []) as never[]}
        filterProjectId={project}
      />
    </>
  );
}
