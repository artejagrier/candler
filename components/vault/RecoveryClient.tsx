"use client";

import { useEffect, useState, useTransition } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { createRecoverySetAction, deleteRecoverySetAction } from "@/lib/product/actions";
import { observeCopy } from "@/lib/product/client-security";
import { StepUpDialog } from "@/components/product/StepUpDialog";

type Set = { id: string; service: string; account_name: string; total_count: number; remaining_count: number; updated_at: string };

export function RecoveryClient({ sets }: { sets: Set[] }) {
  const [revealed, setRevealed] = useState<Record<string, (string | null)[]>>({});
  const [remaining, setRemaining] = useState<Record<string, number>>(Object.fromEntries(sets.map((set) => [set.id, set.remaining_count])));
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pendingReveal, setPendingReveal] = useState<null | (() => Promise<void>)>(null);
  const [pending, start] = useTransition();

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
    const response = await fetch(`/api/recovery/${id}/reveal`, { method: "POST" });
    const body = await response.json() as { codes?: (string | null)[]; error?: string; code?: string };
    if (response.status === 403 && body.code === "REAUTH_REQUIRED") {
      setPendingReveal(() => () => reveal(id));
      return;
    }
    if (response.ok && body.codes) setRevealed((current) => ({ ...current, [id]: body.codes! }));
    else setError(body.error ?? "Recovery codes could not be revealed.");
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
            <label>Service<input name="service" required /></label>
            <label>Account<input name="account" required /></label>
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
    </>
  );
}
