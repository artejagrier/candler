"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Copy, Eye, EyeOff, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { createSecretAction, deleteSecretAction, importEnvAction, updateSecretAction } from "@/lib/product/actions";
import { parseEnvFile } from "@/lib/vault/env-import";
import { observeCopy } from "@/lib/product/client-security";
import { StepUpDialog } from "@/components/product/StepUpDialog";

type Project = { id: string; name: string; environments: { id: string; name: string; kind: string }[] };
type Secret = {
  id: string;
  name: string;
  notes: string | null;
  expires_at: string | null;
  rotate_at: string | null;
  updated_at: string;
  projects: { name: string } | null;
  environments: { name: string } | null;
  services: { name: string } | null;
};

export function VaultClient({ secrets, projects }: { secrets: Secret[]; projects: Project[] }) {
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Secret | null>(null);
  const [envOpen, setEnvOpen] = useState(false);
  const [envText, setEnvText] = useState("");
  const [deselected, setDeselected] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState("");
  const [pendingReveal, setPendingReveal] = useState<null | (() => Promise<void>)>(null);
  const [pending, start] = useTransition();
  const entries = useMemo(() => parseEnvFile(envText), [envText]);
  const first = projects[0];

  useEffect(() => {
    if (!Object.keys(revealed).length) return;
    const id = setTimeout(() => setRevealed({}), 15_000);
    return () => clearTimeout(id);
  }, [revealed]);

  async function reveal(id: string) {
    if (revealed[id]) {
      setRevealed((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      return;
    }
    const response = await fetch(`/api/vault/secrets/${id}/reveal`, { method: "POST" });
    const body = await response.json() as { value?: string; error?: string; code?: string };
    if (response.status === 403 && body.code === "REAUTH_REQUIRED") {
      setPendingReveal(() => () => reveal(id));
      return;
    }
    if (response.ok && body.value) setRevealed((current) => ({ ...current, [id]: body.value! }));
    else setMessage(body.error ?? "Secret could not be revealed.");
  }

  return (
    <>
      <div className="segmented">
        <button className="active">All Secrets</button>
        <Link href="/app/projects">Projects</Link>
        <Link href="/app/vault/authenticator">Authenticator</Link>
        <Link href="/app/vault/recovery">Recovery Codes</Link>
      </div>
      <div className="data-surface">
        <div className="data-toolbar">
          <span>{secrets.length} secret{secrets.length === 1 ? "" : "s"}</span>
          <div className="flex gap-2">
            <button className="secondary-button" onClick={() => setEnvOpen(true)} disabled={!projects.length}><Upload />Import .env</button>
            <button className="primary-button" onClick={() => setOpen(true)} disabled={!projects.length}><Plus />Add secret</button>
          </div>
        </div>
        {secrets.length === 0 ? (
          <div className="empty-state">
            <h2>No secrets yet.</h2>
            <p>{projects.length ? "Add your first credential or import a .env file." : "Create a project before adding credentials."}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Name</th><th>Service</th><th>Project / Environment</th><th>Updated</th><th></th></tr>
              </thead>
              <tbody>
                {secrets.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="secret-name">
                        <span className="service-mark">{row.services?.name?.[0] ?? "?"}</span>
                        <span>
                          <b>{row.name}</b>
                          <code>{revealed[row.id] ?? "••••••••••••••••"}</code>
                        </span>
                      </div>
                    </td>
                    <td>{row.services?.name ?? "Unassigned"}</td>
                    <td>
                      {row.projects?.name ?? "Unassigned"}
                      <small>{row.environments?.name ?? "No environment"}</small>
                    </td>
                    <td>{new Date(row.updated_at).toLocaleDateString()}</td>
                    <td>
                      <div className="row-actions">
                        <button onClick={() => start(() => reveal(row.id))} aria-label="Reveal">{revealed[row.id] ? <EyeOff /> : <Eye />}</button>
                        <button
                          onClick={() => {
                            const value = revealed[row.id];
                            if (!value) return;
                            void navigator.clipboard.writeText(value);
                            void observeCopy("secret.copied", row.id);
                          }}
                          aria-label="Copy"
                          disabled={!revealed[row.id]}
                        >
                          <Copy />
                        </button>
                        <button onClick={() => setEditing(row)} aria-label="Edit"><Pencil /></button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete ${row.name}? This cannot be undone.`)) {
                              start(async () => {
                                const result = await deleteSecretAction(row.id);
                                if (!result.ok) setMessage(result.error);
                              });
                            }
                          }}
                          aria-label="Delete"
                        >
                          <Trash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {message ? <p className="security-note">{message}</p> : <p className="security-note">Values are decrypted only after password confirmation or MFA, and automatically hidden after 15 seconds.</p>}

      {open && first ? (
        <div className="modal-backdrop">
          <form
            className="workflow-dialog"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              start(async () => {
                const result = await createSecretAction({
                  projectId: String(form.get("projectId")),
                  environmentId: String(form.get("environmentId")) || null,
                  serviceName: String(form.get("serviceName")),
                  name: String(form.get("name")),
                  value: String(form.get("value")),
                  notes: String(form.get("notes")),
                });
                if (result.ok) setOpen(false);
                else setMessage(result.error);
              });
            }}
          >
            <h2>Add secret</h2>
            <label>Project<select name="projectId" defaultValue={first.id}>{projects.map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}</select></label>
            <label>Environment<select name="environmentId">{projects.flatMap((project) => project.environments.map((environment) => <option value={environment.id} key={environment.id}>{project.name} · {environment.name}</option>))}</select></label>
            <label>Service<input name="serviceName" required placeholder="Stripe" /></label>
            <label>Name<input name="name" required placeholder="STRIPE_SECRET_KEY" /></label>
            <label>Secret value<textarea name="value" required autoComplete="off" /></label>
            <label>Notes<textarea name="notes" /></label>
            <div>
              <button type="button" className="secondary-button" onClick={() => setOpen(false)}>Cancel</button>
              <button className="primary-button" disabled={pending}>Encrypt & save</button>
            </div>
          </form>
        </div>
      ) : null}

      {editing ? (
        <div className="modal-backdrop">
          <form
            className="workflow-dialog"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const value = String(form.get("value"));
              start(async () => {
                const expires = String(form.get("expiresAt"));
                const rotate = String(form.get("rotateAt"));
                const result = await updateSecretAction({
                  id: editing.id,
                  name: String(form.get("name")),
                  notes: String(form.get("notes")),
                  expiresAt: expires ? new Date(expires).toISOString() : null,
                  rotateAt: rotate ? new Date(rotate).toISOString() : null,
                  value: value || undefined,
                });
                if (result.ok) setEditing(null);
                else setMessage(result.error);
              });
            }}
          >
            <h2>Edit secret</h2>
            <label>Name<input name="name" required defaultValue={editing.name} /></label>
            <label>Notes<textarea name="notes" defaultValue={editing.notes ?? ""} /></label>
            <label>Expires<input name="expiresAt" type="datetime-local" defaultValue={editing.expires_at?.slice(0, 16) ?? ""} /></label>
            <label>Rotate after<input name="rotateAt" type="datetime-local" defaultValue={editing.rotate_at?.slice(0, 16) ?? ""} /></label>
            <label>Rotate value<textarea name="value" placeholder="Leave blank to keep the current value" autoComplete="off" /></label>
            <div>
              <button type="button" className="secondary-button" onClick={() => setEditing(null)}>Cancel</button>
              <button className="primary-button" disabled={pending}>Save</button>
            </div>
          </form>
        </div>
      ) : null}

      {envOpen && first ? (
        <div className="modal-backdrop">
          <div className="workflow-dialog">
            <h2>Import .env</h2>
            <label>Project<select id="env-project" defaultValue={first.id}>{projects.map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}</select></label>
            <label>Environment<select id="env-environment">{first.environments.map((environment) => <option value={environment.id} key={environment.id}>{environment.name}</option>)}</select></label>
            <label>.env contents<textarea value={envText} onChange={(event) => setEnvText(event.target.value)} autoComplete="off" /></label>
            <div className="env-preview">
              {entries.length ? entries.map((entry) => (
                <label key={entry.name}>
                  <input type="checkbox" checked={!deselected[entry.name]} onChange={(event) => setDeselected((current) => ({ ...current, [entry.name]: !event.target.checked }))} />
                  <b>{entry.name}</b>
                  <span>{entry.serviceName}{entry.isPublic ? " · public" : ""}</span>
                </label>
              )) : <p>No valid entries detected.</p>}
            </div>
            <div>
              <button className="secondary-button" onClick={() => setEnvOpen(false)}>Cancel</button>
              <button
                className="primary-button"
                disabled={!entries.some((entry) => !deselected[entry.name]) || pending}
                onClick={() => start(async () => {
                  const projectId = (document.getElementById("env-project") as HTMLSelectElement).value;
                  const environmentId = (document.getElementById("env-environment") as HTMLSelectElement).value;
                  const chosen = entries.filter((entry) => !deselected[entry.name]);
                  const result = await importEnvAction({
                    projectId,
                    environmentId,
                    entries: chosen.map((entry) => ({ name: entry.name, value: entry.value, serviceName: entry.serviceName })),
                  });
                  if (result.ok) {
                    setEnvOpen(false);
                    setEnvText("");
                    setMessage(`Imported ${result.data?.created ?? 0}; skipped ${result.data?.duplicates.length ?? 0} duplicates.`);
                  } else setMessage(result.error);
                })}
              >
                Import selected
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingReveal ? (
        <StepUpDialog
          onClose={() => setPendingReveal(null)}
          onVerified={() => {
            const retry = pendingReveal;
            setPendingReveal(null);
            void retry();
          }}
        />
      ) : null}
    </>
  );
}
