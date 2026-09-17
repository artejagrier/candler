"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { createRecoverySetAction, deleteRecoverySetAction } from "@/lib/product/actions";
import { observeCopy } from "@/lib/product/client-security";
import { StepUpDialog } from "@/components/product/StepUpDialog";
import { ProtectVaultDialog, UnlockVaultDialog } from "@/components/vault/VaultPhraseDialogs";
import { useHideSecretsOnVaultLock, useVaultUnlock } from "@/components/vault/VaultUnlockContext";
import { VAULT_PHRASE_MISMATCH } from "@/lib/vault/recovery-phrase";
import { readUnlockExpiresAt } from "@/lib/vault/unlock-timer";

type Set = { id: string; service: string; account_name: string; total_count: number; remaining_count: number; updated_at: string };

export function RecoveryClient({
  sets,
  initialService = "",
  initialAccount = "",
  recoveryPhraseConfigured = false,
}: {
  sets: Set[];
  initialService?: string;
  initialAccount?: string;
  recoveryPhraseConfigured?: boolean;
}) {
  const [revealed, setRevealed] = useState<Record<string, (string | null)[]>>({});
  const [remaining, setRemaining] = useState<Record<string, number>>(Object.fromEntries(sets.map((set) => [set.id, set.remaining_count])));
  const [open, setOpen] = useState(() => Boolean(initialService));
  const [error, setError] = useState("");
  const [pendingReveal, setPendingReveal] = useState<null | (() => Promise<void>)>(null);
  const [pending, start] = useTransition();
  const [phraseStage, setPhraseStage] = useState<null | { id: string; stage: "setup" | "unlock" }>(null);
  const [phraseError, setPhraseError] = useState("");
  const [unlockBusy, setUnlockBusy] = useState(false);
  const { applyGrant } = useVaultUnlock();
  void recoveryPhraseConfigured;

  useEffect(() => {
    if (!Object.keys(revealed).length) return;
    const id = setTimeout(() => setRevealed({}), 15_000);
    return () => clearTimeout(id);
  }, [revealed]);
  const hideRevealed = useRef(() => setRevealed({}));
  hideRevealed.current = () => setRevealed({});
  useHideSecretsOnVaultLock(() => hideRevealed.current(), revealed);

  async function reveal(id: string, phrase?: string) {
    if (revealed[id] && !phrase) {
      setRevealed((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      return;
    }
    const response = await fetch(`/api/recovery/${id}/reveal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recoveryPhrase: phrase ?? "" }),
    });
    const body = await response.json() as {
      codes?: (string | null)[];
      error?: string;
      code?: string;
      unlockExpiresAt?: number;
      unlockServerNow?: number;
    };
    const expiresAt = readUnlockExpiresAt(body);
    if (expiresAt) applyGrant(expiresAt, body.unlockServerNow);
    if (response.status === 403 && body.code === "REAUTH_REQUIRED") {
      setPendingReveal(() => () => reveal(id, phrase));
      return;
    }
    if (body.code === "PHRASE_SETUP_REQUIRED") {
      setPhraseStage({ id, stage: "setup" });
      return;
    }
    if (body.code === "UNLOCK_REQUIRED" || body.code === "PHRASE_MISMATCH" || body.code === "PHRASE_THROTTLED") {
      setPhraseError(body.code === "UNLOCK_REQUIRED" ? "" : (body.error ?? VAULT_PHRASE_MISMATCH));
      setPhraseStage({ id, stage: "unlock" });
      return;
    }
    if (response.ok && body.codes) {
      setPhraseStage(null);
      setPhraseError("");
      setRevealed((current) => ({ ...current, [id]: body.codes! }));
    } else setError(body.error ?? "Recovery codes could not be revealed.");
  }

  return (
    <>
      {sets.length === 0 ? (
        <div className="data-surface empty-state">
          <h2>No recovery codes yet.</h2>
          <p>Add a recovery-code set and Candler will encrypt every code.</p>
          <button className="primary-button" onClick={() => setOpen(true)}><Plus />Add code set</button>
        </div>
      ) : (
        <div className="data-surface">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Service</th><th>Account</th><th>Remaining</th><th>Last updated</th><th></th></tr></thead>
              <tbody>
                {sets.map((set) => (
                  <tr key={set.id}>
                    <td><b>{set.service}</b></td>
                    <td>{set.account_name}</td>
                    <td>
                      {(() => {
                        const rem = remaining[set.id] ?? set.remaining_count;
                        const pct = set.total_count ? (rem / set.total_count) * 100 : 0;
                        return (
                          <div className="remaining">
                            <span>{rem} of {set.total_count} remaining</span>
                            <div className="remaining-bar">
                              <i style={{ width: `${pct}%` }} data-low={rem <= 2 ? "true" : undefined} />
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                    <td>{new Date(set.updated_at).toLocaleDateString()}</td>
                    <td>
                      <div className="row-actions">
                        <button onClick={() => start(() => reveal(set.id))}>Reveal</button>
                        <button onClick={() => confirm(`Delete ${set.service} recovery codes?`) && start(async () => {
                          const result = await deleteRecoverySetAction(set.id);
                          if (!result.ok) setError(result.error);
                        })}><Trash2 /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {Object.entries(revealed).map(([id, codes]) => (
            <div className="recovery-reveal" key={id}>
              {codes.map((code, index) => (
                <div key={index}>
                  <code className={code ? undefined : "used"}>{code ?? "Used"}</code>
                  {code ? (
                    <>
                      <button onClick={() => {
                        void navigator.clipboard.writeText(code);
                        void observeCopy("recovery.code_copied", id);
                      }}><Copy /></button>
                      <button onClick={() => start(async () => {
                        const response = await fetch(`/api/recovery/${id}/reveal`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ index }),
                        });
                        if (response.ok) {
                          const body = await response.json() as { remaining: number };
                          setRemaining((current) => ({ ...current, [id]: body.remaining }));
                          setRevealed((current) => ({ ...current, [id]: current[id].map((item, itemIndex) => itemIndex === index ? null : item) }));
                        }
                      })}>Mark used</button>
                    </>
                  ) : null}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      <button className="secondary-button mt-4" onClick={() => setOpen(true)}><Plus />Add code set</button>
      {error ? <p className="security-note">{error}</p> : null}
      {open ? (
        <div className="modal-backdrop">
          <form
            className="workflow-dialog"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const codes = String(form.get("codes")).split(/[\n,]+/).map((item) => item.trim()).filter(Boolean);
              start(async () => {
                const result = await createRecoverySetAction({
                  service: String(form.get("service")),
                  accountName: String(form.get("account")),
                  codes,
                });
                if (result.ok) {
                  setOpen(false);
                  setError("");
                } else setError(result.error);
              });
            }}
          >
            <h2>Add recovery codes</h2>
            <label>Service<input name="service" required defaultValue={initialService} autoComplete="off" /></label>
            <label>Account<input name="account" required defaultValue={initialAccount} autoComplete="off" /></label>
            <label>Codes, one per line<textarea name="codes" required autoComplete="off" /></label>
            <div>
              <button type="button" className="secondary-button" onClick={() => setOpen(false)}>Cancel</button>
              <button className="primary-button" disabled={pending}>Encrypt & save</button>
            </div>
          </form>
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
      {phraseStage?.stage === "setup" ? (
        <ProtectVaultDialog
          onClose={() => setPhraseStage(null)}
          onProtected={() => {
            const id = phraseStage.id;
            setPhraseStage(null);
            void reveal(id);
          }}
        />
      ) : null}
      {phraseStage?.stage === "unlock" ? (
        <UnlockVaultDialog
          busy={unlockBusy}
          error={phraseError}
          onClose={() => { setPhraseStage(null); setPhraseError(""); }}
          onUnlock={(phrase) => {
            const id = phraseStage.id;
            setUnlockBusy(true);
            void reveal(id, phrase).finally(() => setUnlockBusy(false));
          }}
        />
      ) : null}
    </>
  );
}
