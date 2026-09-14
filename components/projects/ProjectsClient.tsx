"use client";

import Link from "next/link";
import { Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { createProjectAction, deleteProjectAction, renameProjectAction } from "@/lib/product/actions";

export type ProjectRow = {
  id: string;
  name: string;
  updated_at?: string;
  environments: { id: string; name: string }[];
  services: { id: string; name: string }[];
  cloudBytes: number;
  expiresAt: string | null;
  rotateAt: string | null;
};

export function ProjectsClient({ projects }: { projects: ProjectRow[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [now] = useState(() => Date.now());

  function healthOf(p: ProjectRow) {
    if (p.expiresAt && new Date(p.expiresAt).getTime() < now) return "Action" as const;
    if (p.rotateAt && new Date(p.rotateAt).getTime() < now) return "Watching" as const;
    return "Protected" as const;
  }

  return (
    <>
      {projects.length === 0 ? (
        <div className="empty-state">
          <h2>No projects yet.</h2>
          <p>Create a project to connect Vault, Agent, and Cloud.</p>
          <button className="primary-button" onClick={() => setOpen(true)}>
            <Plus />
            Create project
          </button>
        </div>
      ) : (
        <div className="projects-index">
          <div className="project-entry project-entry--head" aria-hidden="true">
            <span />
            <span>Project</span>
            <span className="facts">
              <span>Health</span>
              <span>Services</span>
              <span>Cloud</span>
              <span>Activity</span>
            </span>
            <span />
          </div>
          {projects.map((p) => {
            const health = healthOf(p);
            return (
            <div className="project-entry" key={p.id}>
              <Link href={`/app/projects/${p.id}`} className="mono" aria-hidden="true" tabIndex={-1}>
                {p.name[0]}
              </Link>
              <div className="body">
                <Link href={`/app/projects/${p.id}`}>
                  <b>{p.name}</b>
                </Link>
                <div className="tags">
                  {p.environments.length ? (
                    p.environments.map((e) => (
                      <span className="env-chip" key={e.id}>
                        {e.name}
                      </span>
                    ))
                  ) : (
                    <span className="env-chip">No environments</span>
                  )}
                </div>
              </div>
              <div className="facts">
                <span className={health === "Protected" ? "protected-chip" : undefined}>
                  {health === "Protected" ? <ShieldCheck aria-hidden="true" /> : null}
                  {health}
                </span>
                <span>
                  {p.services.length} service{p.services.length === 1 ? "" : "s"}
                </span>
                <span>{(p.cloudBytes / 1024 ** 3).toFixed(2)} GB</span>
                {p.updated_at ? <span>{new Date(p.updated_at).toLocaleDateString()}</span> : <span>—</span>}
              </div>
              <div className="row-actions">
                <Link href={`/app/projects/${p.id}`} className="text-link">
                  Open
                </Link>
                <button
                  aria-label={`Rename ${p.name}`}
                  onClick={() => {
                    const next = prompt("Project name", p.name);
                    if (next)
                      start(async () => {
                        const r = await renameProjectAction({ id: p.id, name: next });
                        if (!r.ok) setError(r.error);
                      });
                  }}
                >
                  <Pencil />
                </button>
                <button
                  aria-label={`Delete ${p.name}`}
                  onClick={() =>
                    confirm(`Delete ${p.name} and all associated records?`) &&
                    start(async () => {
                      const r = await deleteProjectAction({ id: p.id });
                      if (!r.ok) setError(r.error);
                    })
                  }
                >
                  <Trash2 />
                </button>
              </div>
            </div>
            );
          })}
        </div>
      )}
      <button className="secondary-button mt-4" onClick={() => setOpen(true)}>
        <Plus />
        New project
      </button>
      {error ? <p className="security-note">{error}</p> : null}
      {open ? (
        <div className="modal-backdrop">
          <form
            className="workflow-dialog"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              start(async () => {
                const r = await createProjectAction({ name: String(f.get("name")) });
                if (r.ok) setOpen(false);
                else setError(r.error);
              });
            }}
          >
            <h2>Create project</h2>
            <label>
              Project name
              <input name="name" required autoFocus />
            </label>
            <p>Development, Preview, and Production environments will be created automatically.</p>
            <div>
              <button type="button" className="secondary-button" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className="primary-button" disabled={pending}>
                Create project
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
