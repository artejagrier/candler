import type { Metadata } from "next";
import { PageHeader } from "@/components/product/PageHeader";
import { getWorkspaceData } from "@/lib/data/queries";
import { isSupabaseConfigured } from "@/lib/env";
import { activityKind, activityLabel } from "@/lib/product/activity-copy";

export const metadata: Metadata = { title: "Activity" };

export default async function Activity() {
  const data = isSupabaseConfigured ? await getWorkspaceData() : null;
  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Activity"
        description="A redacted history of Vault, Cloud, Agent, security, and project events."
      />
      {data?.activity.length ? (
        <div className="activity-list">
          {data.activity.map((event) => (
            <div key={event.id}>
              <span>·</span>
              <p>
                <b>{activityLabel(event.event_type)}</b>
                <small>{activityKind(event.event_type)}</small>
              </p>
              <time>{new Date(event.created_at).toLocaleString()}</time>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>No activity yet.</h2>
          <p>Security-relevant actions appear here without sensitive values.</p>
        </div>
      )}
    </>
  );
}
