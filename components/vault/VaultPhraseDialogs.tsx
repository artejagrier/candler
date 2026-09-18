"use client";

import { useState, type FormEvent } from "react";
import { VaultDialog } from "@/components/vault/VaultDialog";
import { RecoveryPhraseField } from "@/components/vault/RecoveryPhraseField";
import { VaultPhraseSetup, type VaultPhraseSetupStatus } from "@/components/vault/VaultPhraseSetup";
import {
  VAULT_PHRASE_EXISTING_TITLE,
  VAULT_PHRASE_PROTECTED_TITLE,
  VAULT_PHRASE_SETUP_TITLE,
} from "@/lib/vault/recovery-phrase-copy";

function dialogTitle(status: VaultPhraseSetupStatus) {
  if (status === "protected") return VAULT_PHRASE_PROTECTED_TITLE;
  if (status === "existing") return VAULT_PHRASE_EXISTING_TITLE;
  return VAULT_PHRASE_SETUP_TITLE;
}

export function ProtectVaultDialog({
  onClose,
  onProtected,
}: {
  onClose: () => void;
  onProtected: () => void;
}) {
  const [status, setStatus] = useState<VaultPhraseSetupStatus>("needed");
  return (
    <VaultDialog
      open
      title={dialogTitle(status)}
      preventClose={false}
      onClose={onClose}
    >
      <VaultPhraseSetup
        variant="dialog"
        autoFocus
        onStatus={setStatus}
        onProtected={onProtected}
      />
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
