"use client";

import { useId, useRef, useState, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import {
  Eye, EyeOff, FileText, X,
  Clipboard, ChevronDown, Trash2, Check, AlertCircle,
} from "lucide-react";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import { CandlerProgress } from "@/components/ui/CandlerProgress";
import { smartImportAction } from "@/lib/product/actions";
import { parseImportText, detectEnvironmentFromFilename } from "@/lib/vault/smart-import";
import { KNOWN_SERVICES } from "@/lib/vault/env-import";
import { vaultUserError } from "@/lib/vault/client-copy";

// ── Types ────────────────────────────────────────────────────────────────────

type Tab = "paste" | "file";
type Step = "input" | "review" | "confirm" | "done";

interface DraftEntry {
  id: string;
  name: string;
  value: string;
  serviceName: string;
  isPublic: boolean;
  selected: boolean;
  replaceIfDuplicate: boolean;
  isDuplicate: boolean;
  existingId?: string;
  revealed: boolean;
  needsReview: boolean;
}

type Project = { id: string; name: string; environments: { id: string; name: string; kind: string }[] };
type Secret = { id: string; name: string; project_id: string | null; environment_id: string | null };

const CONFIRM_THRESHOLD = 20;

function makeDraftId() {
  return Math.random().toString(36).slice(2);
}

function recheckDuplicates(
  drafts: DraftEntry[],
  projectId: string,
  environmentId: string,
  secrets: Secret[],
): DraftEntry[] {
  return drafts.map((d) => {
    const match = secrets.find(
      (s) => s.name === d.name && s.project_id === projectId && s.environment_id === environmentId,
    );
    return { ...d, isDuplicate: !!match, existingId: match?.id };
  });
}

// ── Component ────────────────────────────────────────────────────────────────

export function SmartImportDialog({
  open,
  onClose,
  onImported,
  projects,
  secrets,
  defaultProjectId,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
  projects: Project[];
  secrets: Secret[];
  defaultProjectId?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Guards against concurrent import submits
  const inflight = useRef(false);

  const initialProjectId = defaultProjectId ?? projects[0]?.id ?? "";
  const initialEnvId =
    projects.find((p) => p.id === initialProjectId)?.environments[0]?.id ?? "";

  const [tab, setTab] = useState<Tab>("paste");
  const [step, setStep] = useState<Step>("input");

  // ── Input-step state ────────────────────────────────────────────────────────
  const [pasteText, setPasteText] = useState("");
  const [fileText, setFileText] = useState("");
  const [fileName, setFileName] = useState("");

  // ── Review-step state ───────────────────────────────────────────────────────
  const [drafts, setDrafts] = useState<DraftEntry[]>([]);
  const [projectId, setProjectId] = useState(initialProjectId);
  const [environmentId, setEnvironmentId] = useState(initialEnvId);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [importResult, setImportResult] = useState<{
    created: number;
    updated: number;
    skipped: number;
    failed: { name: string; reason: string }[];
  } | null>(null);

  function requestClose() {
    if (busy) return;
    onClose();
  }

  useDialogA11y(panelRef, requestClose);

  if (!open) return null;

  const projectEnvironments =
    projects.find((p) => p.id === projectId)?.environments ?? [];
  const selectedProject = projects.find((p) => p.id === projectId);
  const selectedEnv = projectEnvironments.find((e) => e.id === environmentId);
  const selectedDrafts = drafts.filter((d) => d.selected);
  const selectedCount = selectedDrafts.length;
  const allSelected = drafts.length > 0 && selectedCount === drafts.length;

  // ── Project / env selectors ─────────────────────────────────────────────────

  function onProjectChange(newId: string) {
    setProjectId(newId);
    const envs = projects.find((p) => p.id === newId)?.environments ?? [];
    const newEnvId = envs[0]?.id ?? "";
    setEnvironmentId(newEnvId);
    setDrafts((curr) => recheckDuplicates(curr, newId, newEnvId, secrets));
  }

  function onEnvChange(newEnvId: string) {
    setEnvironmentId(newEnvId);
    setDrafts((curr) => recheckDuplicates(curr, projectId, newEnvId, secrets));
  }

  // ── Draft helpers ───────────────────────────────────────────────────────────

  function updateDraft(id: string, patch: Partial<DraftEntry>) {
    setDrafts((curr) => curr.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  function removeDraft(id: string) {
    setDrafts((curr) => curr.filter((d) => d.id !== id));
  }

  function buildDrafts(rawText: string): DraftEntry[] {
    const entries = parseImportText(rawText);
    return recheckDuplicates(
      entries.map((e) => ({
        id: makeDraftId(),
        name: e.name,
        value: e.value,
        serviceName: e.serviceName,
        isPublic: e.isPublic,
        selected: true,
        replaceIfDuplicate: false,
        isDuplicate: false,
        existingId: undefined,
        revealed: false,
        needsReview: false,
      })),
      projectId,
      environmentId,
      secrets,
    );
  }

  // Root cause of previous silent-click bug: the Review Secrets button was conditionally disabled
  // when parsedFromInput was empty. Disabled HTML buttons receive NO click events — total silence.
  // Fix: button is always clickable; all empty/no-parse cases produce a visible message instead.
  function gotoReview(rawText: string) {
    if (!rawText.trim()) {
      setMessage("Paste some environment variables first.");
      return;
    }
    const built = buildDrafts(rawText);
    if (!built.length) {
      setMessage("Candler couldn't find any environment variables in that text.");
      return;
    }
    setMessage("");
    setDrafts(built);
    setStep("review");
  }

  // ── File upload ─────────────────────────────────────────────────────────────

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_048_576) { setMessage("File must be under 1 MB."); return; }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setFileText(text);
      const suggested = detectEnvironmentFromFilename(file.name);
      if (suggested) {
        const match = projectEnvironments.find(
          (env) => env.name.toLowerCase() === suggested.toLowerCase(),
        );
        if (match) setEnvironmentId(match.id);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // ── Import ──────────────────────────────────────────────────────────────────

  async function handleImportClick() {
    if (selectedCount === 0) return;
    if (selectedCount > CONFIRM_THRESHOLD) { setStep("confirm"); return; }
    await executeImport();
  }

  async function executeImport() {
    if (inflight.current) return;
    inflight.current = true;
    setBusy(true);
    setMessage("");
    try {
      const result = await smartImportAction({
        projectId,
        environmentId,
        source: tab,
        entries: selectedDrafts.map((d) => ({
          name: d.name,
          value: d.value,
          serviceName: d.serviceName,
          replace: d.replaceIfDuplicate,
        })),
      });
      if (!result.ok) {
        setMessage(vaultUserError("Import failed.", result.error));
        setStep("review");
        return;
      }
      setImportResult(result.data!);
      setStep("done");
    } catch {
      setMessage("Import could not be completed.");
      setStep("review");
    } finally {
      inflight.current = false;
      setBusy(false);
    }
  }

  function reset() {
    setStep("input");
    setTab("paste");
    setPasteText("");
    setFileText("");
    setFileName("");
    setDrafts([]);
    setMessage("");
    setImportResult(null);
  }

  // ── Derived (never stored) ──────────────────────────────────────────────────

  const inputText = tab === "paste" ? pasteText : fileText;
  const parsedFromInput = inputText.trim() ? parseImportText(inputText) : [];
  const parsedFromFile = fileText.trim() ? parseImportText(fileText) : [];

  return createPortal(
    <div className="modal-backdrop" role="presentation">
      <button
        type="button"
        className="modal-scrim"
        aria-label="Close dialog"
        onClick={requestClose}
        tabIndex={-1}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`workflow-dialog vault-dialog si-dialog${
          step === "review" || step === "confirm" ? " si-dialog--wide" : ""
        }`}
      >
        {/* ── Head ── */}
        <div className="vault-dialog-head">
          <div>
            <h2 id={titleId}>{step === "done" ? "Import complete" : "Import Secrets"}</h2>
            {step === "input" && (
              <p>Paste or upload a config file. Candler parses secrets before anything is saved.</p>
            )}
            {step === "review" && (
              <p>
                Review each entry. Values are masked until you reveal them. Nothing is saved
                until you click Import.
              </p>
            )}
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={requestClose}
            aria-label="Close"
            disabled={busy}
          >
            <X />
          </button>
        </div>

        <div className="vault-dialog-body">

          {/* ══ INPUT STEP ══════════════════════════════════════════════════════ */}
          {step === "input" && (
            <>
              {/* Tab bar */}
              <div className="segmented si-tabs" role="tablist">
                <button
                  role="tab" aria-selected={tab === "paste"}
                  className={tab === "paste" ? "active" : ""}
                  type="button"
                  onClick={() => { setTab("paste"); setMessage(""); }}
                >
                  <Clipboard aria-hidden /> Paste
                </button>
                <button
                  role="tab" aria-selected={tab === "file"}
                  className={tab === "file" ? "active" : ""}
                  type="button"
                  onClick={() => { setTab("file"); setMessage(""); }}
                >
                  <FileText aria-hidden /> Upload file
                </button>
              </div>

              {/* Project / env selectors */}
              <div className="si-selectors">
                <label>
                  Project
                  <select value={projectId} onChange={(e) => onProjectChange(e.target.value)}>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Environment
                  <select value={environmentId} onChange={(e) => onEnvChange(e.target.value)}>
                    {projectEnvironments.map((e) => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              {/* ── PASTE TAB ──────────────────────────────────────────────── */}
              {tab === "paste" && (
                <>
                  <label>
                    Paste your secrets
                    <textarea
                      className="si-paste-area"
                      value={pasteText}
                      onChange={(e) => setPasteText(e.target.value)}
                      placeholder={
                        "STRIPE_SECRET_KEY=your_value_here\n" +
                        "OPENAI_API_KEY=your_value_here\n" +
                        "DATABASE_URL=your_value_here"
                      }
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </label>
                  {!pasteText.trim() && (
                    <div className="si-paste-guide">
                      <p className="si-paste-guide-copy">
                        Paste one variable per line using <strong>NAME=value</strong>.
                      </p>
                      <p className="si-paste-guide-bulk">
                        You can paste dozens or hundreds of variables at once.
                      </p>
                      <p className="si-paste-example-label">Example format</p>
                      <pre className="si-paste-example">{`NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co
SUPABASE_SECRET_KEY=your_value_here
STRIPE_SECRET_KEY=your_value_here
OPENAI_API_KEY=your_value_here
R2_BUCKET=your_bucket_name`}</pre>
                    </div>
                  )}
                  {parsedFromInput.length > 0 && (
                    <p className="si-parse-hint">
                      {parsedFromInput.length} secret
                      {parsedFromInput.length !== 1 ? "s" : ""} recognized
                    </p>
                  )}
                </>
              )}

              {/* ── FILE TAB ───────────────────────────────────────────────── */}
              {tab === "file" && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".env,.env.local,.env.example,.env.production,.env.development,.env.staging,.env.test,.txt,.json,.yaml,.yml,text/plain,application/json,text/yaml"
                    onChange={handleFileSelect}
                    style={{ display: "none" }}
                    aria-label="Upload configuration file"
                  />
                  {!fileText ? (
                    <button
                      type="button"
                      className="si-drop-zone"
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files[0];
                        if (file)
                          handleFileSelect({
                            target: { files: e.dataTransfer.files, value: "" },
                          } as unknown as ChangeEvent<HTMLInputElement>);
                      }}
                    >
                      <FileText aria-hidden />
                      <span>Click to upload or drag and drop</span>
                      <small>
                        .env · .env.local · .env.production · .env.development · .txt · .json ·
                        .yaml
                      </small>
                    </button>
                  ) : (
                    <div className="si-file-loaded">
                      <FileText aria-hidden />
                      <span>{fileName}</span>
                      <span className="si-file-count">
                        {parsedFromFile.length} secrets recognized
                      </span>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label="Remove file"
                        onClick={() => { setFileText(""); setFileName(""); }}
                      >
                        <X />
                      </button>
                    </div>
                  )}
                </>
              )}

              {message ? <p className="si-error" role="alert">{message}</p> : null}
            </>
          )}

          {/* ══ REVIEW STEP ═════════════════════════════════════════════════════ */}
          {step === "review" && busy && (
            <div className="si-importing">
              <CandlerProgress label="Protecting your secrets…" />
            </div>
          )}
          {step === "review" && !busy && (
            <>
              <div className="si-review-header">
                <div className="si-selectors">
                  <label>
                    Project
                    <select value={projectId} onChange={(e) => onProjectChange(e.target.value)}>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Environment
                    <select value={environmentId} onChange={(e) => onEnvChange(e.target.value)}>
                      {projectEnvironments.map((e) => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <p className="si-review-found">
                  <strong>{drafts.length}</strong> secret
                  {drafts.length !== 1 ? "s" : ""} found
                  {drafts.filter((d) => d.isDuplicate).length > 0 && (
                    <span className="si-dup-count">
                      {" "}· {drafts.filter((d) => d.isDuplicate).length} already exist
                    </span>
                  )}
                  {drafts.filter((d) => d.needsReview).length > 0 && (
                    <span className="si-needs-review-count">
                      {" "}· {drafts.filter((d) => d.needsReview).length} need review
                    </span>
                  )}
                </p>
                <p className="si-review-dest-hint">
                  Importing into <strong>{selectedProject?.name}</strong> · <strong>{selectedEnv?.name}</strong>
                </p>
              </div>

              <div className="si-review-list">
                {drafts.length === 0 ? (
                  <p className="si-empty-review">All entries removed.</p>
                ) : (
                  drafts.map((draft) => (
                    <div
                      key={draft.id}
                      className={
                        "si-review-row" +
                        (draft.isDuplicate ? " si-review-row--dup" : "") +
                        (draft.needsReview ? " si-review-row--needs-review" : "")
                      }
                    >
                      <input
                        type="checkbox"
                        checked={draft.selected}
                        onChange={(e) => updateDraft(draft.id, { selected: e.target.checked })}
                        aria-label={`Select ${draft.name}`}
                      />
                      <span className="service-mark" aria-hidden="true">
                        {draft.serviceName[0]}
                      </span>
                      <input
                        className="si-name-input"
                        value={draft.name}
                        onChange={(e) => updateDraft(draft.id, { name: e.target.value })}
                        aria-label="Secret name"
                        pattern="[A-Za-z_][A-Za-z0-9_]*"
                        autoComplete="off"
                      />
                      <select
                        className="si-service-select"
                        value={draft.serviceName}
                        onChange={(e) => updateDraft(draft.id, { serviceName: e.target.value })}
                        aria-label="Service"
                      >
                        {KNOWN_SERVICES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <div className="si-value-cell">
                        {draft.revealed ? (
                          <input
                            className={
                              "si-value-input" +
                              (draft.needsReview ? " si-value-input--warn" : "")
                            }
                            value={draft.value}
                            onChange={(e) =>
                              updateDraft(draft.id, { value: e.target.value, needsReview: false })
                            }
                            autoComplete="off"
                            aria-label="Secret value"
                          />
                        ) : (
                          <span className="si-value-mask" aria-label="Value hidden">
                            {draft.needsReview ? (
                              <span className="si-needs-review-badge">Needs review</span>
                            ) : (
                              "••••••••••••"
                            )}
                          </span>
                        )}
                        <button
                          type="button"
                          className="si-reveal-btn"
                          onClick={() => updateDraft(draft.id, { revealed: !draft.revealed })}
                          aria-label={draft.revealed ? "Hide value" : "Reveal value"}
                        >
                          {draft.revealed ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                        </button>
                      </div>
                      {draft.isDuplicate ? (
                        <div className="si-dup-badge">
                          <AlertCircle aria-hidden className="si-dup-icon" />
                          <select
                            value={draft.replaceIfDuplicate ? "replace" : "skip"}
                            onChange={(e) =>
                              updateDraft(draft.id, {
                                replaceIfDuplicate: e.target.value === "replace",
                              })
                            }
                            aria-label={`Duplicate action for ${draft.name}`}
                          >
                            <option value="skip">Skip</option>
                            <option value="replace">Replace</option>
                          </select>
                        </div>
                      ) : (
                        <div className="si-dup-badge si-dup-badge--empty" aria-hidden />
                      )}
                      <button
                        type="button"
                        className="si-remove-btn"
                        onClick={() => removeDraft(draft.id)}
                        aria-label={`Remove ${draft.name}`}
                      >
                        <Trash2 aria-hidden />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {message ? <p className="si-error" role="alert">{message}</p> : null}
            </>
          )}

          {/* ══ CONFIRM STEP ════════════════════════════════════════════════════ */}
          {step === "confirm" && (
            <div className="si-confirm">
              <p className="si-confirm-label">Importing into</p>
              <div className="si-confirm-dest">
                <strong>{selectedProject?.name}</strong>
                <ChevronDown aria-hidden className="si-confirm-arrow" />
                <span>{selectedEnv?.name}</span>
              </div>
              <p className="si-confirm-count">{selectedCount} secrets</p>
              <p className="si-confirm-note">Each secret will be encrypted before storage.</p>
              {busy && (
                <div className="si-importing">
                  <CandlerProgress label="Protecting your secrets…" />
                </div>
              )}
            </div>
          )}

          {/* ══ DONE STEP ═══════════════════════════════════════════════════════ */}
          {step === "done" && importResult && (
            <div className="si-result">
              <div className="si-result-icon"><Check aria-hidden /></div>
              <div className="si-result-counts">
                {importResult.created > 0 && (
                  <div className="si-result-count si-result-count--added">
                    <strong>{importResult.created}</strong>
                    <span>added</span>
                  </div>
                )}
                {importResult.updated > 0 && (
                  <div className="si-result-count si-result-count--updated">
                    <strong>{importResult.updated}</strong>
                    <span>updated</span>
                  </div>
                )}
                {importResult.skipped > 0 && (
                  <div className="si-result-count si-result-count--skipped">
                    <strong>{importResult.skipped}</strong>
                    <span>skipped</span>
                  </div>
                )}
              </div>
              {importResult.failed.length > 0 && (
                <div className="si-result-failures">
                  <p>{importResult.failed.length} could not be saved:</p>
                  <ul>
                    {importResult.failed.map((f) => (
                      <li key={f.name}><code>{f.name}</code></li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="si-result-dest">
                {selectedProject?.name} · {selectedEnv?.name}
              </p>
            </div>
          )}

        </div>{/* .vault-dialog-body */}

        {/* ── Footer ── */}
        <div className="vault-dialog-footer">
          {step === "input" && (
            <>
              <button type="button" className="secondary-button" onClick={requestClose}>
                Cancel
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => gotoReview(inputText)}
              >
                Review Secrets
                {parsedFromInput.length > 0 ? ` (${parsedFromInput.length})` : ""}
              </button>
            </>
          )}

          {step === "review" && (
            <>
              <button
                type="button"
                className="secondary-button"
                onClick={() => { setStep("input"); setMessage(""); }}
              >
                ← Back
              </button>
              <div className="si-footer-mid">
                <button
                  type="button"
                  className="text-link"
                  onClick={() =>
                    setDrafts((curr) => curr.map((d) => ({ ...d, selected: !allSelected })))
                  }
                >
                  {allSelected ? "Deselect all" : "Select all"}
                </button>
                <span className="si-footer-count">
                  {selectedCount} of {drafts.length} selected
                </span>
              </div>
              <button
                type="button"
                className="primary-button"
                disabled={selectedCount === 0 || busy}
                onClick={() => void handleImportClick()}
              >
                {busy
                  ? "Importing…"
                  : `Import ${selectedCount} secret${selectedCount !== 1 ? "s" : ""}`}
              </button>
            </>
          )}

          {step === "confirm" && (
            <>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setStep("review")}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-button"
                disabled={busy}
                onClick={() => void executeImport()}
                data-autofocus
              >
                {busy ? "Importing…" : `Import ${selectedCount} secrets`}
              </button>
            </>
          )}

          {step === "done" && (
            <>
              <button type="button" className="secondary-button" onClick={reset}>
                Import more
              </button>
              <button type="button" className="primary-button" onClick={onImported}>
                Done
              </button>
            </>
          )}
        </div>

      </div>
    </div>,
    document.body,
  );
}
