"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Eye, Info, Pencil, Pin, PinOff, Plus, Trash2 } from "lucide-react";
import { deleteAuthenticatorAction, renameAuthenticatorAction, setAuthenticatorPinnedAction } from "@/lib/product/actions";
import { observeCopy } from "@/lib/product/client-security";
import { formatTotpCode, issuerInitial } from "@/lib/vault/otpauth";
import { StepUpDialog } from "@/components/product/StepUpDialog";
import { AddAccountDialog } from "@/components/vault/authenticator/AddAccountDialog";
import { AuthenticatorDialog } from "@/components/vault/authenticator/AuthenticatorDialog";
import { AuthenticatorMenu } from "@/components/vault/authenticator/AuthenticatorMenu";
import { ProtectVaultDialog, UnlockVaultDialog } from "@/components/vault/VaultPhraseDialogs";
import { useHideSecretsOnVaultLock, useVaultUnlock } from "@/components/vault/VaultUnlockContext";
import { VAULT_PHRASE_MISMATCH } from "@/lib/vault/recovery-phrase-copy";
import { readUnlockExpiresAt } from "@/lib/vault/unlock-timer";

export type AuthenticatorEntry = {
  id: string;
  issuer: string;
  account_name: string;
  notes?: string | null;
  pinned?: boolean;
  last_used_at?: string | null;
  created_at: string;
  updated_at: string;
};

type CodeState = { code: string; expiresAt: number };
type SortMode = "az" | "recent";

function isPinned(entry: AuthenticatorEntry) {
  return Boolean(entry.pinned);
}

function compareEntries(a: AuthenticatorEntry, b: AuthenticatorEntry, sort: SortMode) {
  if (isPinned(a) !== isPinned(b)) return isPinned(a) ? -1 : 1;
  if (sort === "recent") {
    const ta = a.last_used_at ? Date.parse(a.last_used_at) : 0;
    const tb = b.last_used_at ? Date.parse(b.last_used_at) : 0;
    if (tb !== ta) return tb - ta;
  }
  return a.issuer.localeCompare(b.issuer) || a.account_name.localeCompare(b.account_name);
}

export function AuthenticatorClient({ entries, recoveryPhraseConfigured = false }: { entries: AuthenticatorEntry[]; recoveryPhraseConfigured?: boolean }) {
  const router = useRouter();
  const [added, setAdded] = useState<AuthenticatorEntry[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [patches, setPatches] = useState<Record<string, Partial<AuthenticatorEntry>>>({});
  const [codes, setCodes] = useState<Record<string, CodeState>>({});
  const [now, setNow] = useState(() => Date.now());
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("az");
  const [addOpen, setAddOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<AuthenticatorEntry | null>(null);
  const [details, setDetails] = useState<AuthenticatorEntry | null>(null);
  const [removing, setRemoving] = useState<AuthenticatorEntry | null>(null);
  const [revealing, setRevealing] = useState<AuthenticatorEntry | null>(null);
  const [revealedSeed, setRevealedSeed] = useState("");
  const [pendingRevealId, setPendingRevealId] = useState<string | null>(null);
  const [phraseStage, setPhraseStage] = useState<null | { id: string; stage: "setup" | "unlock" }>(null);
  const [phraseError, setPhraseError] = useState("");
  const [unlockBusy, setUnlockBusy] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [recoveryHint, setRecoveryHint] = useState<{ issuer: string; account: string } | null>(null);
  const { applyGrant } = useVaultUnlock();
  const inflight = useRef(new Set<string>());
  const copiedTimer = useRef<number | null>(null);
  const seedTimer = useRef<number | null>(null);
  const hideSeed = useRef(() => {
    setRevealedSeed("");
    setRevealing(null);
  });
  hideSeed.current = () => {
    setRevealedSeed("");
    setRevealing(null);
  };
  useHideSecretsOnVaultLock(() => hideSeed.current(), revealedSeed);

  const rows = useMemo(() => {
    const removed = new Set(removedIds);
    const fromServer = entries
      .filter((row) => !removed.has(row.id))
      .map((row) => (patches[row.id] ? { ...row, ...patches[row.id] } : row));
    const extras = added.filter((row) => !entries.some((item) => item.id === row.id) && !removed.has(row.id));
    return [...extras, ...fromServer].sort((a, b) => compareEntries(a, b, sort));
  }, [entries, added, removedIds, patches, sort]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => `${row.issuer} ${row.account_name} ${row.notes ?? ""}`.toLowerCase().includes(q));
  }, [rows, query]);

  const pinned = visible.filter(isPinned);
  const rest = visible.filter((row) => !isPinned(row));
  const codeKey = useMemo(() => rows.map((row) => row.id).join("\n"), [rows]);

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

  function focusAccount(id: string) {
    setHighlightId(id);
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(`[data-authenticator-id="${id}"]`)?.scrollIntoView({ block: "center" });
    });
  }

  useEffect(() => () => {
    if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
    if (seedTimer.current) window.clearTimeout(seedTimer.current);
  }, []);

  useEffect(() => {
    if (!codeKey) return;
    let cancelled = false;
    let timeout = 0;

    async function load() {
      const ids = codeKey.split("\n").filter(Boolean);
      const results = await Promise.all(ids.map(async (id) => {
        const response = await fetch(`/api/authenticator/${id}/code`, { method: "POST", cache: "no-store" });
        if (!response.ok) return [id, null] as const;
        const body = await response.json() as { code?: string; validFor?: number };
        if (!body.code) return [id, null] as const;
        return [id, { code: body.code, expiresAt: Date.now() + Math.max(1, body.validFor ?? 30) * 1000 }] as const;
      }));
      if (cancelled) return;
      const next = Object.fromEntries(results.filter((item): item is [string, CodeState] => Boolean(item[1])));
      setCodes(next);
      const waits = Object.values(next).map((item) => item.expiresAt - Date.now());
      const waitMs = waits.length ? Math.max(250, Math.min(...waits, 30_000)) : 800;
      timeout = window.setTimeout(() => void load(), waitMs + 40);
    }

    void load();
    const ticker = window.setInterval(() => setNow(Date.now()), 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      window.clearInterval(ticker);
    };
  }, [codeKey]);

  function remainingFor(id: string) {
    const expiresAt = codes[id]?.expiresAt;
    if (!expiresAt) return 0;
    return Math.max(0, Math.ceil((expiresAt - now) / 1000));
  }

  function markCopied(id: string) {
    setCopiedId(id);
    if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
    copiedTimer.current = window.setTimeout(() => {
      setCopiedId((current) => (current === id ? null : current));
    }, 1600);
  }

  async function copyCode(id: string) {
    const value = codes[id]?.code;
    if (!value || !claim(`copy:${id}`)) return;
    try {
      await navigator.clipboard.writeText(value);
      void observeCopy("authenticator.code_copied", id);
      setPatches((current) => ({
        ...current,
        [id]: { ...current[id], last_used_at: new Date().toISOString() },
      }));
      markCopied(id);
    } catch {
      setMessage("Candler couldn't copy this code. Try again.");
    } finally {
      release(`copy:${id}`);
    }
  }

  async function togglePin(entry: AuthenticatorEntry) {
    if (!claim(`pin:${entry.id}`)) return;
    const next = !isPinned(entry);
    setPatches((current) => ({ ...current, [entry.id]: { ...current[entry.id], pinned: next } }));
    try {
      const result = await setAuthenticatorPinnedAction(entry.id, next);
      if (!result.ok) {
        setPatches((current) => ({ ...current, [entry.id]: { ...current[entry.id], pinned: !next } }));
        setMessage(result.error);
        return;
      }
      router.refresh();
    } catch {
      setPatches((current) => ({ ...current, [entry.id]: { ...current[entry.id], pinned: !next } }));
      setMessage("This account could not be updated.");
    } finally {
      release(`pin:${entry.id}`);
    }
  }

  async function revealSeed(id: string, phrase?: string) {
    if (!claim(`reveal:${id}`)) return;
    setMessage("");
    try {
      const response = await fetch(`/api/authenticator/${id}/seed`, {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recoveryPhrase: phrase ?? "" }),
      });
      const body = await response.json() as {
        secret?: string;
        error?: string;
        code?: string;
        unlockExpiresAt?: number;
        unlockServerNow?: number;
      };
      const expiresAt = readUnlockExpiresAt(body);
      if (expiresAt) applyGrant(expiresAt, body.unlockServerNow);
      if (response.status === 403 && body.code === "REAUTH_REQUIRED") {
        setPendingRevealId(id);
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
      if (!response.ok || !body.secret) {
        setMessage(body.error ?? "This setup key could not be revealed.");
        return;
      }
      setPhraseStage(null);
      setPhraseError("");
      const entry = rows.find((row) => row.id === id) ?? null;
      setRevealing(entry);
      setRevealedSeed(body.secret);
      if (seedTimer.current) window.clearTimeout(seedTimer.current);
      seedTimer.current = window.setTimeout(() => {
        setRevealedSeed("");
        setRevealing(null);
      }, 15_000);
    } catch {
      setMessage("This setup key could not be revealed.");
    } finally {
      release(`reveal:${id}`);
    }
  }

  async function onRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!renaming || !claim("rename")) return;
    const form = new FormData(event.currentTarget);
    const issuer = String(form.get("issuer")).trim();
    const account = String(form.get("account")).trim();
    const notes = String(form.get("notes") ?? "").trim();
    setMessage("");
    try {
      const result = await renameAuthenticatorAction(renaming.id, issuer, account, notes);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setPatches((current) => ({ ...current, [renaming.id]: { issuer, account_name: account, notes: notes || null, updated_at: new Date().toISOString() } }));
      setRenaming(null);
      router.refresh();
    } catch {
      setMessage("This account could not be renamed.");
    } finally {
      release("rename");
    }
  }

  async function onRemove() {
    if (!removing || !claim(`delete:${removing.id}`)) return;
    const target = removing;
    setRemovedIds((current) => (current.includes(target.id) ? current : [...current, target.id]));
    setMessage("");
    try {
      const result = await deleteAuthenticatorAction(target.id);
      if (!result.ok) {
        setRemovedIds((current) => current.filter((id) => id !== target.id));
        setMessage(result.error);
        return;
      }
      setRemoving(null);
      router.refresh();
    } catch {
      setRemovedIds((current) => current.filter((id) => id !== target.id));
      setMessage("This account could not be removed.");
    } finally {
      release(`delete:${target.id}`);
    }
  }

  function renderRow(entry: AuthenticatorEntry) {
    const value = codes[entry.id];
    const remaining = remainingFor(entry.id);
    const copied = copiedId === entry.id;
    const subtitle = entry.account_name && entry.account_name !== entry.issuer ? entry.account_name : "";
    return (
      <div
        key={entry.id}
        data-authenticator-id={entry.id}
        className={`authenticator-row${highlightId === entry.id ? " authenticator-row--focus" : ""}${isPinned(entry) ? " authenticator-row--pinned" : ""}`}
      >
        <span className="authenticator-mark">{issuerInitial(entry.issuer)}</span>
        <div className="authenticator-meta">
          <b>
            {entry.issuer}
            {isPinned(entry) ? <Pin aria-hidden className="authenticator-pin-mark" /> : null}
          </b>
          {subtitle ? <small>{subtitle}</small> : null}
          {entry.notes ? <small className="authenticator-notes">{entry.notes}</small> : null}
        </div>
        <button
          type="button"
          className="authenticator-code"
          onClick={() => void copyCode(entry.id)}
          disabled={!value?.code}
          aria-label={copied ? "Copied" : `Copy code for ${entry.issuer}`}
        >
          {value?.code ? formatTotpCode(value.code) : "••• •••"}
        </button>
        <span
          className={`countdown${remaining && remaining <= 5 ? " countdown--soon" : ""}`}
          style={{ ["--progress"]: `${(remaining / 30) * 100}%` } as React.CSSProperties}
          aria-label={value ? `Refreshes in ${remaining} seconds` : "Loading code"}
        >
          <b>{value ? remaining : "—"}</b>
        </span>
        <button
          type="button"
          className="authenticator-copy"
          onClick={() => void copyCode(entry.id)}
          disabled={!value?.code}
          aria-label={copied ? "Copied" : "Copy code"}
        >
          {copied ? "Copied" : <Copy />}
        </button>
        <AuthenticatorMenu
          label={`Actions for ${entry.issuer}`}
          items={[
            { id: "pin", label: isPinned(entry) ? "Unpin" : "Pin", icon: isPinned(entry) ? <PinOff /> : <Pin />, onSelect: () => void togglePin(entry) },
            { id: "rename", label: "Rename", icon: <Pencil />, onSelect: () => setRenaming(entry) },
            { id: "details", label: "View details", icon: <Info />, onSelect: () => setDetails(entry) },
            { id: "reveal", label: "Reveal setup key", icon: <Eye />, onSelect: () => void revealSeed(entry.id) },
            { id: "sep", separator: true },
            { id: "remove", label: "Remove account", icon: <Trash2 />, danger: true, onSelect: () => setRemoving(entry) },
          ]}
        />
      </div>
    );
  }

  const accountWord = rows.length === 1 ? "account" : "accounts";
  const showSections = Boolean(pinned.length && rest.length);

  return (
    <>
      <p className="authenticator-status">
        Protected by Candler
        {rows.length ? <span>{rows.length} {accountWord} secured</span> : null}
        <span>Available on your signed-in devices</span>
      </p>

      <div className="authenticator-toolbar">
        {rows.length ? (
          <div className="authenticator-toolbar-main">
            <input
              className="authenticator-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search accounts"
              aria-label="Search authenticator accounts"
            />
            <label className="authenticator-sort">
              <span>Sort</span>
              <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} aria-label="Sort accounts">
                <option value="az">A–Z</option>
                <option value="recent">Recently used</option>
              </select>
            </label>
          </div>
        ) : <span />}
        <div className="authenticator-toolbar-actions">
          {rows.length ? (
            <button type="button" className="text-link authenticator-export" onClick={() => setExportOpen(true)}>
              Export accounts
            </button>
          ) : null}
          <button type="button" className="primary-button" onClick={() => setAddOpen(true)}>
            <Plus />Add account
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="authenticator-empty">
          <h2>{rows.length ? "No matching accounts." : "No accounts yet."}</h2>
          <p>{rows.length ? "Try a different name or email." : "Scan a QR code or enter a setup key. Candler keeps the seed encrypted and shows only the current code."}</p>
          {!rows.length ? (
            <button type="button" className="primary-button" onClick={() => setAddOpen(true)}><Plus />Add account</button>
          ) : null}
        </div>
      ) : (
        <div className="authenticator-list">
          {showSections ? (
            <>
              <section className="authenticator-group" aria-label="Pinned">
                <h2 className="authenticator-section">Pinned</h2>
                {pinned.map(renderRow)}
              </section>
              <section className="authenticator-group" aria-label="All accounts">
                <h2 className="authenticator-section">All accounts</h2>
                {rest.map(renderRow)}
              </section>
            </>
          ) : visible.map(renderRow)}
        </div>
      )}

      {message ? <p className="security-note" role="alert">{message}</p> : null}

      <AddAccountDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={(entry) => {
          setAdded((current) => [entry, ...current.filter((row) => row.id !== entry.id)]);
          setAddOpen(false);
          setMessage("");
          setRecoveryHint({ issuer: entry.issuer, account: entry.account_name });
          router.refresh();
        }}
        onViewExisting={(id) => {
          setAddOpen(false);
          setMessage("This account is already in Candler.");
          focusAccount(id);
        }}
      />

      {recoveryHint ? (
        <AuthenticatorDialog
          open
          title={`${recoveryHint.issuer} added`}
          description="Your verification codes are protected by Candler."
          onClose={() => setRecoveryHint(null)}
          footer={(
            <>
              <button type="button" className="secondary-button" onClick={() => setRecoveryHint(null)}>Not now</button>
              <Link
                className="primary-button"
                href={`/app/vault/recovery?service=${encodeURIComponent(recoveryHint.issuer)}&account=${encodeURIComponent(recoveryHint.account)}`}
                onClick={() => setRecoveryHint(null)}
              >
                Store in Recovery
              </Link>
            </>
          )}
        >
          <p>Did {recoveryHint.issuer} give you recovery codes?</p>
        </AuthenticatorDialog>
      ) : null}

      {exportOpen ? (
        <AuthenticatorDialog
          open
          title="Export accounts"
          description="Exporting authenticator accounts creates a portable copy of your authentication secrets. Anyone with this export may be able to generate your verification codes."
          onClose={() => setExportOpen(false)}
          footer={<button type="button" className="primary-button" onClick={() => setExportOpen(false)}>Close</button>}
        >
          <p>
            Bulk export is not available yet. Candler will not download a file of reusable authenticator secrets until that flow can require recent step-up authentication, finish in the browser, and leave no plaintext export on the server.
          </p>
          <p>To move a single account today, use Reveal setup key after confirming your identity.</p>
        </AuthenticatorDialog>
      ) : null}

      {renaming ? (
        <AuthenticatorDialog
          open
          title="Rename account"
          preventClose={busy === "rename"}
          onClose={() => { if (busy !== "rename") setRenaming(null); }}
          footer={(
            <>
              <button type="button" className="secondary-button" onClick={() => setRenaming(null)} disabled={busy === "rename"}>Cancel</button>
              <button form="authenticator-rename-form" type="submit" className="primary-button" disabled={busy === "rename"}>
                {busy === "rename" ? "Saving…" : "Save"}
              </button>
            </>
          )}
        >
          <form id="authenticator-rename-form" onSubmit={(event) => void onRename(event)}>
            <label>Service<input name="issuer" required defaultValue={renaming.issuer} autoComplete="off" /></label>
            <label>Account<input name="account" required defaultValue={renaming.account_name} autoComplete="off" /></label>
            <label>Notes<textarea name="notes" defaultValue={renaming.notes ?? ""} placeholder="Production admin" autoComplete="off" maxLength={400} /></label>
          </form>
        </AuthenticatorDialog>
      ) : null}

      {details ? (
        <AuthenticatorDialog
          open
          title={details.issuer}
          description="Account details never include the setup key."
          onClose={() => setDetails(null)}
          footer={<button type="button" className="primary-button" onClick={() => setDetails(null)}>Done</button>}
        >
          <dl className="authenticator-details">
            <div><dt>Service</dt><dd>{details.issuer}</dd></div>
            <div><dt>Account</dt><dd>{details.account_name}</dd></div>
            {details.notes ? <div><dt>Notes</dt><dd>{details.notes}</dd></div> : null}
            <div><dt>Type</dt><dd>6-digit TOTP · 30 seconds</dd></div>
            <div><dt>Added</dt><dd>{new Date(details.created_at).toLocaleString()}</dd></div>
          </dl>
        </AuthenticatorDialog>
      ) : null}

      {revealing && revealedSeed ? (
        <AuthenticatorDialog
          open
          title="Setup key"
          description="This key can add the account to another authenticator. It hides automatically."
          onClose={() => { setRevealing(null); setRevealedSeed(""); }}
          footer={<button type="button" className="primary-button" onClick={() => { setRevealing(null); setRevealedSeed(""); }}>Hide</button>}
        >
          <p className="authenticator-seed" aria-label="Setup key">{revealedSeed}</p>
        </AuthenticatorDialog>
      ) : null}

      {removing ? (
        <AuthenticatorDialog
          open
          title="Remove account"
          description={`Remove ${removing.issuer}${removing.account_name && removing.account_name !== removing.issuer ? ` (${removing.account_name})` : ""}? This cannot be undone.`}
          preventClose={busy === `delete:${removing.id}`}
          onClose={() => { if (busy !== `delete:${removing.id}`) setRemoving(null); }}
          footer={(
            <>
              <button type="button" className="secondary-button" onClick={() => setRemoving(null)} disabled={busy === `delete:${removing.id}`}>Cancel</button>
              <button type="button" className="primary-button" data-autofocus onClick={() => void onRemove()} disabled={busy === `delete:${removing.id}`}>
                {busy === `delete:${removing.id}` ? "Removing…" : "Remove"}
              </button>
            </>
          )}
        >
          <p>The encrypted seed is deleted. Existing logins are not changed.</p>
        </AuthenticatorDialog>
      ) : null}

      {pendingRevealId ? (
        <StepUpDialog
          onClose={() => setPendingRevealId(null)}
          onVerified={() => {
            const id = pendingRevealId;
            setPendingRevealId(null);
            if (id) void revealSeed(id);
          }}
        />
      ) : null}
      {phraseStage?.stage === "setup" ? (
        <ProtectVaultDialog
          onClose={() => setPhraseStage(null)}
          onProtected={() => {
            const id = phraseStage.id;
            setPhraseStage(null);
            void revealSeed(id);
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
            void revealSeed(id, phrase).finally(() => setUnlockBusy(false));
          }}
        />
      ) : null}
    </>
  );
}
