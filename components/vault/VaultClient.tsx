"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Eye, EyeOff, Lock, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { createSecretAction, deleteSecretAction, importEnvAction, updateSecretAction } from "@/lib/product/actions";
import { parseEnvFile } from "@/lib/vault/env-import";
import { observeCopy } from "@/lib/product/client-security";
import { vaultSearchHaystack, vaultUserError, type VaultPendingAuth } from "@/lib/vault/client-copy";
import { StepUpDialog } from "@/components/product/StepUpDialog";
import { VaultDialog } from "@/components/vault/VaultDialog";
import { ProtectVaultDialog, UnlockVaultDialog } from "@/components/vault/VaultPhraseDialogs";
import { SmartImportDialog } from "@/components/vault/SmartImportDialog";
import { useHideSecretsOnVaultLock, useVaultUnlock } from "@/components/vault/VaultUnlockContext";
import { VAULT_PHRASE_MISMATCH } from "@/lib/vault/recovery-phrase";
import { readUnlockExpiresAt } from "@/lib/vault/unlock-timer";

type Project = { id: string; name: string; environments: { id: string; name: string; kind: string }[] };
type Secret = {
  id: string;
  name: string;
  notes: string | null;
  expires_at: string | null;
  rotate_at: string | null;
  updated_at: string;
  project_id: string | null;
  environment_id: string | null;
  projects: { name: string } | null;
  environments: { name: string } | null;
  services: { name: string } | null;
};

type PhraseGate = { id: string; intent: VaultPendingAuth["intent"]; stage: "setup" | "unlock" };
type BusyKey = string | null;

export function VaultClient({
  secrets,
  projects,
  initialProjectId,
  recoveryPhraseConfigured = false,
}: {
  secrets: Secret[];
  projects: Project[];
  initialProjectId?: string;
  recoveryPhraseConfigured?: boolean;
}) {
  const router = useRouter();
  const [added, setAdded] = useState<Secret[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [patches, setPatches] = useState<Record<string, Partial<Secret>>>({});
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Secret | null>(null);
  const [deleting, setDeleting] = useState<Secret | null>(null);
  const [envOpen, setEnvOpen] = useState(false);
  const [envText, setEnvText] = useState("");
  const [deselected, setDeselected] = useState<Record<string, boolean>>({});
  const [smartOpen, setSmartOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [pendingAuth, setPendingAuth] = useState<VaultPendingAuth | null>(null);
  const [phraseGate, setPhraseGate] = useState<PhraseGate | null>(null);
  const [phraseError, setPhraseError] = useState("");
  const [phraseConfigured, setPhraseConfigured] = useState(recoveryPhraseConfigured);
  const [busy, setBusy] = useState<BusyKey>(null);
  const { applyGrant } = useVaultUnlock();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const [query, setQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState(initialProjectId ?? "");
  const [environmentFilter, setEnvironmentFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [draftProjectId, setDraftProjectId] = useState(projects[0]?.id ?? "");
  const [draftEnvironmentId, setDraftEnvironmentId] = useState(projects[0]?.environments[0]?.id ?? "");
  const [importProjectId, setImportProjectId] = useState(projects[0]?.id ?? "");
  const [importEnvironmentId, setImportEnvironmentId] = useState(projects[0]?.environments[0]?.id ?? "");
  const inflight = useRef(new Set<string>());
  const copiedTimer = useRef<number | null>(null);
  const entries = useMemo(() => parseEnvFile(envText), [envText]);
  const first = projects[0];
  const draftEnvironments = projects.find((project) => project.id === draftProjectId)?.environments ?? [];
  const importEnvironments = projects.find((project) => project.id === importProjectId)?.environments ?? [];

  const rows = useMemo(() => {
    const removed = new Set(removedIds);
    const fromServer = secrets
      .filter((row) => !removed.has(row.id))
      .map((row) => (patches[row.id] ? { ...row, ...patches[row.id] } : row));
    const extras = added.filter((row) => !secrets.some((item) => item.id === row.id) && !removed.has(row.id));
    return [...extras, ...fromServer];
  }, [secrets, added, removedIds, patches]);

  useEffect(() => () => {
    if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
  }, []);

  const environmentOptions = useMemo(() => {
    const names = new Set<string>();
    for (const row of rows) {
      if (projectFilter && row.project_id !== projectFilter) continue;
      if (row.environments?.name) names.add(row.environments.name);
    }
    return [...names].sort();
  }, [rows, projectFilter]);

  const serviceOptions = useMemo(() => {
    const names = new Set<string>();
    for (const row of rows) {
      if (projectFilter && row.project_id !== projectFilter) continue;
      if (environmentFilter && (row.environments?.name ?? "") !== environmentFilter) continue;
      if (row.services?.name) names.add(row.services.name);
    }
    return [...names].sort();
  }, [rows, projectFilter, environmentFilter]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (projectFilter && row.project_id !== projectFilter) return false;
      if (environmentFilter && (row.environments?.name ?? "") !== environmentFilter) return false;
      if (serviceFilter && (row.services?.name ?? "") !== serviceFilter) return false;
      if (!q) return true;
      return vaultSearchHaystack(row).includes(q);
    });
  }, [rows, query, projectFilter, environmentFilter, serviceFilter]);

  const DAY = 86_400_000;
  function secretState(row: Secret): { label: string; cls: string } {
    if (row.expires_at && new Date(row.expires_at).getTime() < now) return { label: "Expired", cls: "failed" };
    if (row.rotate_at && new Date(row.rotate_at).getTime() < now) return { label: "Rotate due", cls: "warning" };
    if (row.expires_at && new Date(row.expires_at).getTime() - now < 14 * DAY) return { label: "Expires soon", cls: "warning" };
    return { label: "Encrypted", cls: "verified" };
  }

  useEffect(() => {
    if (!Object.keys(revealed).length) return;
    const id = window.setTimeout(() => setRevealed({}), 15_000);
    return () => window.clearTimeout(id);
  }, [revealed]);

  const hideRevealed = useRef(() => setRevealed({}));
  hideRevealed.current = () => setRevealed({});
  useHideSecretsOnVaultLock(() => hideRevealed.current(), revealed);

  function claim(key: string) {
    if (inflight.current.has(key)) return false;
    inflight.current.add(key);
    setBusy(key);
    return true;
  }

  function release(key: string) {
    inflight.current.delete(key);
    setBusy((current) => (current === key ? null : current));
  }

  function hideValue(id: string) {
    setRevealed((current) => {
      if (!(id in current)) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  async function requestReveal(id: string, intent: VaultPendingAuth["intent"], phrase?: string) {
    const response = await fetch(`/api/vault/secrets/${id}/reveal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent, recoveryPhrase: phrase ?? "" }),
    });
    const body = await response.json().catch(() => ({})) as {
      value?: string;
      error?: string;
      code?: string;
      unlockExpiresAt?: number;
      unlockServerNow?: number;
    };
    const expiresAt = readUnlockExpiresAt(body);
    if (expiresAt) applyGrant(expiresAt, body.unlockServerNow);
    if (response.status === 403 && body.code === "REAUTH_REQUIRED") {
      setPendingAuth({ id, intent });
      return "auth" as const;
    }
    if (body.code === "PHRASE_SETUP_REQUIRED") {
      setPhraseGate({ id, intent, stage: "setup" });
      return "setup" as const;
    }
    if (body.code === "UNLOCK_REQUIRED") {
      setPhraseError("");
      setPhraseGate({ id, intent, stage: "unlock" });
      return "unlock" as const;
    }
    if (body.code === "PHRASE_MISMATCH" || body.code === "PHRASE_THROTTLED") {
      setPhraseError(body.error ?? VAULT_PHRASE_MISMATCH);
      setPhraseGate({ id, intent, stage: "unlock" });
      return "unlock" as const;
    }
    if (!response.ok || !body.value) {
      setMessage(vaultUserError("Unable to reveal secret.", body.error, response.status));
      return null;
    }
    setPhraseGate(null);
    setPhraseError("");
    return body.value;
  }

  async function revealSecret(id: string) {
    if (revealed[id]) {
      hideValue(id);
      return;
    }
    const key = `reveal:${id}`;
    if (!claim(key)) return;
    setMessage("");
    try {
      const value = await requestReveal(id, "reveal");
      if (value && value !== "auth" && value !== "setup" && value !== "unlock") {
        setRevealed((current) => ({ ...current, [id]: value }));
      }
    } catch {
      setMessage("Unable to reveal secret.");
    } finally {
      release(key);
    }
  }

  function markCopied(id: string) {
    setCopiedId(id);
    if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
    copiedTimer.current = window.setTimeout(() => {
      setCopiedId((current) => (current === id ? null : current));
    }, 2000);
  }

  async function copySecret(id: string) {
    const key = `copy:${id}`;
    if (!claim(key)) return;
    setMessage("");
    try {
      const fetched = await requestReveal(id, "copy");
      if (!fetched || fetched === "auth" || fetched === "setup" || fetched === "unlock") return;
      const value = fetched;
      await navigator.clipboard.writeText(value);
      void observeCopy("secret.copied", id);
      markCopied(id);
    } catch {
      setMessage("Unable to copy secret.");
    } finally {
      release(key);
    }
  }

  function resumeAfterStepUp() {
    const pending = pendingAuth;
    setPendingAuth(null);
    if (!pending) return;
    if (pending.intent === "copy") void copySecret(pending.id);
    else void revealSecret(pending.id);
  }

  function openAdd() {
    const projectId = projectFilter || first?.id || "";
    const environments = projects.find((project) => project.id === projectId)?.environments ?? [];
    setDraftProjectId(projectId);
    setDraftEnvironmentId(environments[0]?.id ?? "");
    setMessage("");
    setOpen(true);
  }

  // kept for .env import fallback; primary path is Smart Import
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function openImport() {
    const projectId = projectFilter || first?.id || "";
    const environments = projects.find((project) => project.id === projectId)?.environments ?? [];
    setImportProjectId(projectId);
    setImportEnvironmentId(environments[0]?.id ?? "");
    setEnvText("");
    setDeselected({});
    setMessage("");
    setEnvOpen(true);
  }

  function openSmartImport() {
    setMessage("");
    setSmartOpen(true);
  }

  function showCreatedRow(input: {
    id: string;
    name: string;
    notes: string;
    projectId: string;
    environmentId: string | null;
    serviceName: string;
  }) {
    const project = projects.find((item) => item.id === input.projectId);
    const environment = project?.environments.find((item) => item.id === input.environmentId);
    const next: Secret = {
      id: input.id,
      name: input.name,
      notes: input.notes || null,
      expires_at: null,
      rotate_at: null,
      updated_at: new Date().toISOString(),
      project_id: input.projectId,
      environment_id: input.environmentId,
      projects: project ? { name: project.name } : null,
      environments: environment ? { name: environment.name } : null,
      services: { name: input.serviceName },
    };
    setAdded((current) => [next, ...current.filter((row) => row.id !== next.id)]);
    if (projectFilter && projectFilter !== input.projectId) setProjectFilter(input.projectId);
    if (environmentFilter && environmentFilter !== (environment?.name ?? "")) setEnvironmentFilter("");
    if (serviceFilter && serviceFilter !== input.serviceName) setServiceFilter("");
  }

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!claim("save")) return;
    const form = new FormData(event.currentTarget);
    const payload = {
      projectId: String(form.get("projectId")),
      environmentId: String(form.get("environmentId")) || null,
      serviceName: String(form.get("serviceName")),
      name: String(form.get("name")),
      value: String(form.get("value")),
      notes: String(form.get("notes")),
    };
    setMessage("");
    try {
      const result = await createSecretAction(payload);
      if (!result.ok) {
        setMessage(vaultUserError("Unable to save secret.", result.error));
        return;
      }
      if (result.data?.id) showCreatedRow({ ...payload, id: result.data.id });
      setOpen(false);
      router.refresh();
    } catch {
      setMessage("Unable to save secret.");
    } finally {
      release("save");
    }
  }

  async function onUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || !claim("update")) return;
    const form = new FormData(event.currentTarget);
    const value = String(form.get("value"));
    const expires = String(form.get("expiresAt"));
    const rotate = String(form.get("rotateAt"));
    const name = String(form.get("name"));
    const notes = String(form.get("notes"));
    const id = editing.id;
    setMessage("");
    try {
      const result = await updateSecretAction({
        id,
        name,
        notes,
        expiresAt: expires ? new Date(expires).toISOString() : null,
        rotateAt: rotate ? new Date(rotate).toISOString() : null,
        value: value || undefined,
      });
      if (!result.ok) {
        setMessage(vaultUserError("Unable to save secret.", result.error));
        return;
      }
      setPatches((current) => ({
        ...current,
        [id]: {
          name,
          notes: notes || null,
          expires_at: expires ? new Date(expires).toISOString() : null,
          rotate_at: rotate ? new Date(rotate).toISOString() : null,
          updated_at: new Date().toISOString(),
        },
      }));
      if (value) hideValue(id);
      setEditing(null);
      router.refresh();
    } catch {
      setMessage("Unable to save secret.");
    } finally {
      release("update");
    }
  }

  async function onDelete() {
    if (!deleting || !claim(`delete:${deleting.id}`)) return;
    const target = deleting;
    setRemovedIds((current) => (current.includes(target.id) ? current : [...current, target.id]));
    hideValue(target.id);
    setMessage("");
    try {
      const result = await deleteSecretAction(target.id);
      if (!result.ok) {
        setRemovedIds((current) => current.filter((id) => id !== target.id));
        setMessage(vaultUserError("Unable to delete secret.", result.error));
        return;
      }
      setDeleting(null);
      router.refresh();
    } catch {
      setRemovedIds((current) => current.filter((id) => id !== target.id));
      setMessage("Unable to delete secret.");
    } finally {
      release(`delete:${target.id}`);
    }
  }

  async function onImport() {
    if (!claim("import")) return;
    const chosen = entries.filter((entry) => !deselected[entry.name]);
    setMessage("");
    try {
      const result = await importEnvAction({
        projectId: importProjectId,
        environmentId: importEnvironmentId,
        entries: chosen.map((entry) => ({ name: entry.name, value: entry.value, serviceName: entry.serviceName })),
      });
      if (!result.ok) {
        setMessage(vaultUserError("Unable to save secret.", result.error));
        return;
      }
      setEnvOpen(false);
      setEnvText("");
      setDeselected({});
      setMessage(`Imported ${result.data?.created ?? 0}; skipped ${result.data?.duplicates.length ?? 0} duplicates.`);
      router.refresh();
    } catch {
      setMessage("Unable to save secret.");
    } finally {
      release("import");
    }
  }

  function onProjectFilter(value: string) {
    setProjectFilter(value);
    setEnvironmentFilter("");
    setServiceFilter("");
  }

  const saving = busy === "save";
  const updating = busy === "update";
  const importing = busy === "import";

  return (
    <>
      <div className="data-toolbar vault-toolbar">
        <span>{visible.length} secret{visible.length === 1 ? "" : "s"}</span>
        <input
          className="vault-filter"
          type="search"
          placeholder="Filter secrets…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Filter secrets"
        />
        {projects.length > 1 ? (
          <select
            className="vault-project-filter"
            aria-label="Filter by project"
            value={projectFilter}
            onChange={(e) => onProjectFilter(e.target.value)}
          >
            <option value="">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        ) : null}
        {environmentOptions.length ? (
          <select
            className="vault-project-filter"
            aria-label="Filter by environment"
            value={environmentFilter}
            onChange={(e) => {
              setEnvironmentFilter(e.target.value);
              setServiceFilter("");
            }}
          >
            <option value="">All environments</option>
            {environmentOptions.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        ) : null}
        {serviceOptions.length ? (
          <select
            className="vault-project-filter"
            aria-label="Filter by service"
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
          >
            <option value="">All services</option>
            {serviceOptions.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        ) : null}
        {(query || projectFilter || environmentFilter || serviceFilter) ? (
          <button type="button" className="text-link" onClick={() => { setQuery(""); setProjectFilter(""); setEnvironmentFilter(""); setServiceFilter(""); }}>
            Clear filters
          </button>
        ) : null}
        <Link className="quiet-link" href="/app/vault/recovery">Recovery</Link>
        <div className="flex gap-2">
          <button type="button" className="secondary-button" onClick={openSmartImport} disabled={!projects.length}><Upload />Smart Import</button>
          <button type="button" className="primary-button" onClick={openAdd} disabled={!projects.length}><Plus />Add secret</button>
        </div>
      </div>
      {/* Project context — shows which project is in scope */}
      {projects.length > 0 && (
        <div className="vault-project-strip">
          <span className="vault-project-strip-for">Secrets for</span>
          {projects.length === 1 ? (
            <strong>{projects[0].name}</strong>
          ) : (
            <select
              className="vault-project-inline-select"
              value={projectFilter || ""}
              onChange={(e) => onProjectFilter(e.target.value)}
              aria-label="Select project"
            >
              <option value="">All projects</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          {environmentFilter && <><span className="vault-project-strip-sep">·</span><span>{environmentFilter}</span></>}
          {projects.length > 1 && (
            <span className="vault-project-strip-hint">
              {projectFilter ? `${visible.length} secret${visible.length !== 1 ? "s" : ""}` : `${rows.length} across ${projects.length} projects`}
            </span>
          )}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="empty-state">
          <h2>{rows.length ? "No matching secrets." : "No secrets yet."}</h2>
          <p>{projects.length ? "Add a credential or import a .env file, or use Smart Import." : "Create a project before adding credentials."}</p>
        </div>
      ) : (
        <div className="table-wrap vault-table">
          <table>
            <thead>
              <tr><th>Name</th><th>Service</th><th>Project / Environment</th><th>State</th><th>Updated</th><th></th></tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const revealing = busy === `reveal:${row.id}`;
                const copying = busy === `copy:${row.id}`;
                const rowDeleting = busy === `delete:${row.id}`;
                const shown = revealed[row.id];
                return (
                  <tr key={row.id}>
                    <td>
                      <div className="secret-name">
                        <span className="service-mark">{row.services?.name?.[0] ?? "?"}</span>
                        <span>
                          <b>{row.name}</b>
                          <code className="secret-masked">
                            {shown ? (
                              shown
                            ) : (
                              <>
                                <Lock aria-hidden="true" />
                                ••••••••••••
                              </>
                            )}
                          </code>
                        </span>
                      </div>
                    </td>
                    <td>{row.services?.name ?? "Unassigned"}</td>
                    <td>
                      {row.projects?.name ?? "Unassigned"}
                      <small>{row.environments?.name ?? "No environment"}</small>
                    </td>
                    <td>
                      {(() => {
                        const st = secretState(row);
                        return <span className={`status ${st.cls} status-cell`}>{st.label}</span>;
                      })()}
                    </td>
                    <td>{new Date(row.updated_at).toLocaleDateString()}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          onClick={() => void revealSecret(row.id)}
                          aria-label={shown ? "Hide" : revealing ? "Revealing…" : "Reveal"}
                          disabled={revealing || rowDeleting}
                        >
                          {shown ? <EyeOff /> : <Eye />}
                        </button>
                        <button
                          type="button"
                          onClick={() => void copySecret(row.id)}
                          aria-label={copiedId === row.id ? "Copied" : copying ? "Copying…" : "Copy"}
                          disabled={copying || rowDeleting}
                        >
                          {copiedId === row.id ? "Copied" : <Copy />}
                        </button>
                        <button type="button" onClick={() => { setMessage(""); setEditing(row); }} aria-label="Edit" disabled={rowDeleting}>
                          <Pencil />
                        </button>
                        <button type="button" onClick={() => setDeleting(row)} aria-label="Delete" disabled={rowDeleting}>
                          <Trash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {message ? <p className="security-note" role="alert">{message}</p> : <p className="security-note">Values stay encrypted until you confirm your identity and enter your Vault Phrase. Your Vault stays unlocked for five minutes after a successful unlock. Revealed values hide after 15 seconds or when the Vault locks. Keep important recovery information somewhere secure and separate from Candler—such as a reputable password manager, secure offline storage, or a written copy stored safely.</p>}

      {open && first ? (
        <VaultDialog
          open
          title="Add secret"
          preventClose={saving}
          onClose={() => { if (!saving) setOpen(false); }}
          footer={(
            <>
              <button type="button" className="secondary-button" onClick={() => setOpen(false)} disabled={saving}>Cancel</button>
              <button form="vault-add-form" type="submit" className="primary-button" disabled={saving}>{saving ? "Saving…" : "Encrypt & save"}</button>
            </>
          )}
        >
          <form id="vault-add-form" onSubmit={(event) => void onCreate(event)}>
            <label>Project
              <select
                name="projectId"
                value={draftProjectId}
                onChange={(event) => {
                  const next = event.target.value;
                  setDraftProjectId(next);
                  setDraftEnvironmentId(projects.find((project) => project.id === next)?.environments[0]?.id ?? "");
                }}
              >
                {projects.map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}
              </select>
            </label>
            <label>Environment
              <select name="environmentId" value={draftEnvironmentId} onChange={(event) => setDraftEnvironmentId(event.target.value)}>
                {draftEnvironments.map((environment) => <option value={environment.id} key={environment.id}>{environment.name}</option>)}
              </select>
            </label>
            <label>Service<input name="serviceName" required placeholder="Stripe" autoComplete="off" /></label>
            <label>Name<input name="name" required placeholder="STRIPE_SECRET_KEY" autoComplete="off" /></label>
            <label>Secret value<textarea name="value" required autoComplete="off" /></label>
            <label>Notes<textarea name="notes" /></label>
          </form>
        </VaultDialog>
      ) : null}

      {editing ? (
        <VaultDialog
          open
          title="Edit secret"
          preventClose={updating}
          onClose={() => { if (!updating) setEditing(null); }}
          footer={(
            <>
              <button type="button" className="secondary-button" onClick={() => setEditing(null)} disabled={updating}>Cancel</button>
              <button form="vault-edit-form" type="submit" className="primary-button" disabled={updating}>{updating ? "Updating…" : "Save"}</button>
            </>
          )}
        >
          <form id="vault-edit-form" onSubmit={(event) => void onUpdate(event)}>
            <label>Name<input name="name" required defaultValue={editing.name} /></label>
            <label>Notes<textarea name="notes" defaultValue={editing.notes ?? ""} /></label>
            <label>Expires<input name="expiresAt" type="datetime-local" defaultValue={editing.expires_at?.slice(0, 16) ?? ""} /></label>
            <label>Rotate after<input name="rotateAt" type="datetime-local" defaultValue={editing.rotate_at?.slice(0, 16) ?? ""} /></label>
            <label>Rotate value<textarea name="value" placeholder="Leave blank to keep the current value" autoComplete="off" /></label>
          </form>
        </VaultDialog>
      ) : null}

      {deleting ? (
        <VaultDialog
          open
          title="Delete secret"
          description={`Delete ${deleting.name}? This cannot be undone.`}
          preventClose={busy === `delete:${deleting.id}`}
          onClose={() => { if (busy !== `delete:${deleting.id}`) setDeleting(null); }}
          footer={(
            <>
              <button type="button" className="secondary-button" onClick={() => setDeleting(null)} disabled={busy === `delete:${deleting.id}`}>Cancel</button>
              <button type="button" className="primary-button" onClick={() => void onDelete()} disabled={busy === `delete:${deleting.id}`} data-autofocus>
                {busy === `delete:${deleting.id}` ? "Deleting…" : "Delete"}
              </button>
            </>
          )}
        >
          <p>The encrypted credential will be removed from this workspace. It cannot be revealed after deletion.</p>
        </VaultDialog>
      ) : null}

      {envOpen && first ? (
        <VaultDialog
          open
          title="Import .env"
          preventClose={importing}
          onClose={() => { if (!importing) setEnvOpen(false); }}
          footer={(
            <>
              <button type="button" className="secondary-button" onClick={() => setEnvOpen(false)} disabled={importing}>Cancel</button>
              <button
                type="button"
                className="primary-button"
                disabled={!entries.some((entry) => !deselected[entry.name]) || importing}
                onClick={() => void onImport()}
              >
                {importing ? "Importing…" : "Import selected"}
              </button>
            </>
          )}
        >
          <label>Project
            <select
              value={importProjectId}
              onChange={(event) => {
                const next = event.target.value;
                setImportProjectId(next);
                setImportEnvironmentId(projects.find((project) => project.id === next)?.environments[0]?.id ?? "");
              }}
            >
              {projects.map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}
            </select>
          </label>
          <label>Environment
            <select value={importEnvironmentId} onChange={(event) => setImportEnvironmentId(event.target.value)}>
              {importEnvironments.map((environment) => <option value={environment.id} key={environment.id}>{environment.name}</option>)}
            </select>
          </label>
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
        </VaultDialog>
      ) : null}

      {pendingAuth ? (
        <StepUpDialog
          onClose={() => setPendingAuth(null)}
          onVerified={resumeAfterStepUp}
        />
      ) : null}

      {phraseGate?.stage === "setup" ? (
        <ProtectVaultDialog
          onClose={() => setPhraseGate(null)}
          onProtected={() => {
            const pending = phraseGate;
            setPhraseConfigured(true);
            setPhraseGate(null);
            setMessage("Your Vault is protected.");
            if (pending.intent === "copy") void copySecret(pending.id);
            else void revealSecret(pending.id);
          }}
        />
      ) : null}

      {phraseGate?.stage === "unlock" ? (
        <UnlockVaultDialog
          busy={busy === `reveal:${phraseGate.id}` || busy === `copy:${phraseGate.id}`}
          error={phraseError}
          onClose={() => { setPhraseGate(null); setPhraseError(""); }}
          onUnlock={(phrase) => {
            const pending = phraseGate;
            void (async () => {
              const key = pending.intent === "copy" ? `copy:${pending.id}` : `reveal:${pending.id}`;
              if (!claim(key)) return;
              try {
                const value = await requestReveal(pending.id, pending.intent, phrase);
                if (!value || value === "auth" || value === "setup" || value === "unlock") return;
                if (pending.intent === "copy") {
                  await navigator.clipboard.writeText(value);
                  void observeCopy("secret.copied", pending.id);
                  markCopied(pending.id);
                } else {
                  setRevealed((current) => ({ ...current, [pending.id]: value }));
                }
              } catch {
                setMessage(pending.intent === "copy" ? "Unable to copy secret." : "Unable to reveal secret.");
              } finally {
                release(key);
              }
            })();
          }}
        />
      ) : null}

      {smartOpen ? (
        <SmartImportDialog
          open
          onClose={() => setSmartOpen(false)}
          onImported={() => { setSmartOpen(false); router.refresh(); }}
          projects={projects}
          secrets={rows}
          defaultProjectId={projectFilter || first?.id}
        />
      ) : null}
    </>
  );
}
