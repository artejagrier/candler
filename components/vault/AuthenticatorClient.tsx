"use client";

import { useEffect, useState, useTransition } from "react";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { addAuthenticatorAction, deleteAuthenticatorAction, renameAuthenticatorAction } from "@/lib/product/actions";
import { observeCopy } from "@/lib/product/client-security";

type Entry = { id: string; issuer: string; account_name: string; updated_at: string };

export function AuthenticatorClient({ entries }: { entries: Entry[] }) {
  const [codes, setCodes] = useState<Record<string, { code: string; validFor: number }>>({});
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!entries.length) return;
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout>;

    async function load() {
      const snapshot = entries;
      const results = await Promise.all(snapshot.map(async (entry) => {
        const response = await fetch(`/api/authenticator/${entry.id}/code`, { method: "POST" });
        return [entry.id, response.ok ? await response.json() as { code: string; validFor: number } : null] as const;
      }));
      if (cancelled) return;
      const next = Object.fromEntries(results.filter((item): item is [string, { code: string; validFor: number }] => Boolean(item[1])));
      setCodes(next);
      const wait = Math.max(1, Math.min(...Object.values(next).map((item) => item.validFor), 30));
      timeout = setTimeout(() => void load(), (wait + 0.25) * 1000);
    }

    void load();
    const ticker = setInterval(() => {
      setCodes((current) => Object.fromEntries(Object.entries(current).map(([id, value]) => [id, { ...value, validFor: Math.max(0, value.validFor - 1) }])));
    }, 1000);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      clearInterval(ticker);
    };
  }, [entries]);

  return (
    <>
      {entries.length === 0 ? (
        <div className="data-surface empty-state">
          <h2>No authenticators yet.</h2>
          <p>Import an otpauth URI to add your first account.</p>
          <button className="primary-button" onClick={() => setOpen(true)}><Plus />Add authenticator</button>
        </div>
      ) : (
        <div className="authenticator-list">
          {entries.map((entry) => {
            const value = codes[entry.id];
            return (
              <div key={entry.id}>
                <span className="service-mark">{entry.issuer[0]}</span>
                <p><b>{entry.issuer}</b><small>{entry.account_name}</small></p>
                <code>{value?.code ? `${value.code.slice(0, 3)} ${value.code.slice(3)}` : "••• •••"}</code>
                <span className="countdown">{value?.validFor ?? "—"}</span>
                <div className="row-actions">
                  <button
                    aria-label="Copy code"
                    onClick={() => {
                      if (!value) return;
                      void navigator.clipboard.writeText(value.code);
                      void observeCopy("authenticator.code_copied", entry.id);
                    }}
                  >
                    <Copy />
                  </button>
                  <button
                    aria-label="Rename"
                    onClick={() => {
                      const issuer = prompt("Issuer", entry.issuer);
                      const account = prompt("Account", entry.account_name);
                      if (!issuer || !account) return;
                      start(async () => {
                        const result = await renameAuthenticatorAction(entry.id, issuer, account);
                        if (!result.ok) setError(result.error);
                      });
                    }}
                  >
                    <Pencil />
                  </button>
                  <button
                    aria-label="Delete"
                    onClick={() => confirm(`Delete ${entry.issuer}?`) && start(async () => {
                      const result = await deleteAuthenticatorAction(entry.id);
                      if (!result.ok) setError(result.error);
                    })}
                  >
                    <Trash2 />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <button className="secondary-button mt-4" onClick={() => setOpen(true)}><Plus />Add account</button>
      {error ? <p className="security-note">{error}</p> : null}
      {open ? (
        <div className="modal-backdrop">
          <form
            className="workflow-dialog"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              start(async () => {
                const result = await addAuthenticatorAction({
                  uri: String(form.get("uri")),
                  issuer: String(form.get("issuer")),
                  accountName: String(form.get("account")),
                });
                if (result.ok) {
                  setOpen(false);
                  setError("");
                } else setError(result.error);
              });
            }}
          >
            <h2>Add authenticator</h2>
            <label>otpauth URI<textarea name="uri" required autoComplete="off" /></label>
            <label>Issuer override<input name="issuer" /></label>
            <label>Account override<input name="account" /></label>
            <div>
              <button type="button" className="secondary-button" onClick={() => setOpen(false)}>Cancel</button>
              <button className="primary-button" disabled={pending}>Encrypt & save</button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
