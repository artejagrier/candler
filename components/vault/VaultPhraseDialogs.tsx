"use client";

import { useState, type FormEvent } from "react";
import { VaultDialog } from "@/components/vault/VaultDialog";
import { RecoveryPhraseField } from "@/components/vault/RecoveryPhraseField";
import { useVaultUnlock } from "@/components/vault/VaultUnlockContext";
import {
  VAULT_PHRASE_CONFIRM,
  VAULT_PHRASE_LENGTH,
  VAULT_PHRASE_SAVE_FAILED,
  confirmVaultRecoveryPhrases,
  isValidVaultRecoveryPhrase,
} from "@/lib/vault/recovery-phrase";
import { readUnlockExpiresAt } from "@/lib/vault/unlock-timer";

export function ProtectVaultDialog({
  onClose,
  onProtected,
}: {
  onClose: () => void;
  onProtected: () => void;
}) {
  const { applyGrant } = useVaultUnlock();
  const [phrase, setPhrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [protectedNow, setProtectedNow] = useState(false);
  const canSubmit = confirmVaultRecoveryPhrases(phrase, confirm) && !busy;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!isValidVaultRecoveryPhrase(phrase) || !isValidVaultRecoveryPhrase(confirm)) {
      setError(VAULT_PHRASE_LENGTH);
      return;
    }
    if (!confirmVaultRecoveryPhrases(phrase, confirm)) {
      setError(VAULT_PHRASE_CONFIRM);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/vault/recovery-phrase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phrase, confirm }),
      });
      const body = await response.json().catch(() => ({})) as {
        error?: string;
        protected?: boolean;
        unlockExpiresAt?: number;
        unlockServerNow?: number;
      };
      if (!response.ok || !body.protected) {
        setError(body.error ?? VAULT_PHRASE_SAVE_FAILED);
        return;
      }
      const expiresAt = readUnlockExpiresAt(body);
      if (expiresAt) applyGrant(expiresAt, body.unlockServerNow);
      setPhrase("");
      setConfirm("");
      setProtectedNow(true);
    } catch {
      setError(VAULT_PHRASE_SAVE_FAILED);
    } finally {
      setBusy(false);
    }
  }

  if (protectedNow) {
    return (
      <VaultDialog
        open
        title="Your Vault is protected."
        description="You'll use the same Vault Phrase whenever your Vault needs to unlock protected secret access."
        onClose={onProtected}
        footer={<button type="button" className="primary-button" onClick={onProtected} data-autofocus>Continue</button>}
      >
        <p>Candler stored a hash of your Vault Phrase. Existing secrets were not changed.</p>
      </VaultDialog>
    );
  }

  return (
    <VaultDialog
      open
      title="Protect Your Vault"
      description="Create one Vault Phrase to protect access to the secrets stored in your Candler Vault."
      preventClose={busy}
      onClose={() => { if (!busy) onClose(); }}
      footer={(
        <>
          <button type="button" className="secondary-button" onClick={onClose} disabled={busy}>Cancel</button>
          <button form="vault-protect-form" type="submit" className="primary-button" disabled={!canSubmit}>
            {busy ? "Protecting…" : "Protect My Vault"}
          </button>
        </>
      )}
    >
      <form id="vault-protect-form" onSubmit={(event) => void onSubmit(event)}>
        <p className="vault-phrase-safety">
          Write your Vault Phrase down and keep it somewhere safe and separate from Candler.
        </p>
        <p>
          You’ll need it to unlock protected secret access in your Vault.
          Keep a copy on paper stored somewhere secure, in a reputable password manager, or in trusted offline storage.
          Do not keep your only copy somewhere that itself depends on access to this same Candler Vault.
        </p>
        <p>
          Candler will never display your Vault Phrase back to you after setup.
          Candler support will never ask you to send us your Vault Phrase.
        </p>
        <RecoveryPhraseField
          label="Vault Phrase"
          value={phrase}
          onChange={setPhrase}
          placeholder="What's Your Favorite Scary Movie Sydney?"
          autoFocus
        />
        <RecoveryPhraseField
          label="Confirm Vault Phrase"
          value={confirm}
          onChange={setConfirm}
        />
        {error ? <p className="security-note" role="alert">{error}</p> : null}
      </form>
    </VaultDialog>
  );
}

export function UnlockVaultDialog({
  onClose,
  onUnlock,
  busy,
  error,
}: {
  onClose: () => void;
  onUnlock: (phrase: string) => void;
  busy?: boolean;
  error?: string;
}) {
  const [phrase, setPhrase] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    onUnlock(phrase);
  }

  return (
    <VaultDialog
      open
      title="Unlock Secret"
      description="Enter your Vault Phrase to view this secret."
      preventClose={Boolean(busy)}
      onClose={() => { if (!busy) onClose(); }}
      footer={(
        <>
          <button type="button" className="secondary-button" onClick={onClose} disabled={busy}>Cancel</button>
          <button form="vault-unlock-form" type="submit" className="primary-button" disabled={busy || phrase.length === 0}>
            {busy ? "Unlocking…" : "Unlock & Reveal"}
          </button>
        </>
      )}
    >
      <form id="vault-unlock-form" onSubmit={submit}>
        <RecoveryPhraseField
          label="Vault Phrase"
          value={phrase}
          onChange={setPhrase}
          autoFocus
        />
        {error ? <p className="security-note" role="alert">{error}</p> : null}
      </form>
    </VaultDialog>
  );
}
