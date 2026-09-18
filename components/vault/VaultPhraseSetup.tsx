"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { RecoveryPhraseField } from "@/components/vault/RecoveryPhraseField";
import { useVaultUnlock } from "@/components/vault/VaultUnlockContext";
import {
  VAULT_PHRASE_CONFIRM,
  VAULT_PHRASE_EXISTING_COPY,
  VAULT_PHRASE_EXISTING_TITLE,
  VAULT_PHRASE_LENGTH,
  VAULT_PHRASE_PROTECTED_COPY,
  VAULT_PHRASE_PROTECTED_TITLE,
  VAULT_PHRASE_SAVE_FAILED,
  VAULT_PHRASE_SETUP_COPY,
  VAULT_PHRASE_SETUP_HELPER,
  VAULT_PHRASE_SETUP_TITLE,
  confirmVaultRecoveryPhrases,
  isValidVaultRecoveryPhrase,
} from "@/lib/vault/recovery-phrase-copy";
import { readUnlockExpiresAt } from "@/lib/vault/unlock-timer";

export type VaultPhraseSetupStatus = "needed" | "existing" | "protected";
export type VaultPhraseSetupVariant = "page" | "tour" | "dialog";

async function phraseConfiguredFromServer() {
  const response = await fetch("/api/vault/recovery-phrase", { cache: "no-store" });
  if (!response.ok) return false;
  const body = await response.json().catch(() => ({})) as { configured?: boolean };
  return Boolean(body.configured);
}

export function VaultPhraseSetup({
  variant,
  initialConfigured = false,
  autoFocus = false,
  titleId,
  onProtected,
  onStatus,
}: {
  variant: VaultPhraseSetupVariant;
  initialConfigured?: boolean;
  autoFocus?: boolean;
  titleId?: string;
  onProtected?: () => void;
  onStatus?: (status: VaultPhraseSetupStatus) => void;
}) {
  const { applyGrant } = useVaultUnlock();
  const formId = useId();
  const [status, setStatus] = useState<VaultPhraseSetupStatus>(initialConfigured ? "existing" : "needed");
  const [phrase, setPhrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const notified = useRef(initialConfigured);
  const onProtectedRef = useRef(onProtected);
  const onStatusRef = useRef(onStatus);
  onProtectedRef.current = onProtected;
  onStatusRef.current = onStatus;

  function publish(next: VaultPhraseSetupStatus) {
    setStatus(next);
    onStatusRef.current?.(next);
    if ((next === "existing" || next === "protected") && !notified.current) {
      notified.current = true;
      if (variant !== "dialog") onProtectedRef.current?.();
    }
  }

  useEffect(() => {
    onStatusRef.current?.(status);
  }, [status]);

  useEffect(() => {
    if (initialConfigured) {
      publish("existing");
      return;
    }
    let cancelled = false;
    void phraseConfiguredFromServer().then((configured) => {
      if (cancelled || !configured) return;
      publish("existing");
    });
    return () => {
      cancelled = true;
    };
  }, [initialConfigured]);

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
        configured?: boolean;
        unlockExpiresAt?: number;
        unlockServerNow?: number;
      };
      if (response.status === 409 || body.protected || body.configured) {
        const confirmed = body.protected || body.configured || await phraseConfiguredFromServer();
        if (confirmed) {
          const expiresAt = readUnlockExpiresAt(body);
          if (expiresAt) applyGrant(expiresAt, body.unlockServerNow);
          setPhrase("");
          setConfirm("");
          setRevealed(false);
          publish(body.protected || response.status === 409 ? "protected" : "existing");
          return;
        }
      }
      if (!response.ok || !body.protected) {
        setError(body.error ?? VAULT_PHRASE_SAVE_FAILED);
        return;
      }
    } catch {
      setError(VAULT_PHRASE_SAVE_FAILED);
    } finally {
      setBusy(false);
    }
  }

  const heading = status === "needed"
    ? VAULT_PHRASE_SETUP_TITLE
    : status === "protected"
      ? VAULT_PHRASE_PROTECTED_TITLE
      : VAULT_PHRASE_EXISTING_TITLE;
  const copy = status === "needed"
    ? VAULT_PHRASE_SETUP_COPY
    : status === "protected"
      ? VAULT_PHRASE_PROTECTED_COPY
      : VAULT_PHRASE_EXISTING_COPY;

  return (
    <div className={`vault-phrase-setup vault-phrase-setup--${variant}`} data-status={status}>
      {variant !== "dialog" ? <h2 id={titleId} className="vault-phrase-setup-title">{heading}</h2> : null}
      <p className="vault-phrase-setup-copy">{copy}</p>
      {status === "needed" ? (
        <form id={formId} className="vault-phrase-setup-form" onSubmit={(event) => void onSubmit(event)}>
          <p className="vault-phrase-setup-helper">{VAULT_PHRASE_SETUP_HELPER}</p>
          <RecoveryPhraseField
            label="Vault Phrase"
            value={phrase}
            onChange={setPhrase}
            autoFocus={autoFocus}
            revealed={revealed}
          />
          <RecoveryPhraseField
            label="Confirm Vault Phrase"
            value={confirm}
            onChange={setConfirm}
            revealed={revealed}
          />
          <div className="vault-phrase-setup-toolbar">
            <button
              type="button"
              className="vault-phrase-reveal"
              onClick={() => setRevealed((current) => !current)}
              aria-pressed={revealed}
            >
              {revealed ? "Hide" : "Show"}
            </button>
            <button type="submit" className="primary-button" disabled={!canSubmit}>
              {busy ? "Saving…" : "Save Vault Phrase"}
            </button>
          </div>
          {error ? <p className="vault-phrase-setup-error" role="alert">{error}</p> : null}
        </form>
      ) : variant === "dialog" ? (
        <button type="button" className="primary-button" onClick={() => onProtectedRef.current?.()} data-autofocus>
          Continue
        </button>
      ) : null}
    </div>
  );
}
