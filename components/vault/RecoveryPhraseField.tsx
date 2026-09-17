"use client";

import { useId } from "react";
import {
  RECOVERY_PHRASE_MAX,
  recoveryPhraseCounterLabel,
} from "@/lib/vault/recovery-phrase";

export function RecoveryPhraseField({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoComplete = "off",
  describedBy,
  error,
  autoFocus,
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  describedBy?: string;
  error?: string;
  autoFocus?: boolean;
}) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const countId = `${fieldId}-count`;
  const errorId = `${fieldId}-error`;
  const counter = recoveryPhraseCounterLabel(value);

  return (
    <label className="vault-phrase-field" htmlFor={fieldId}>
      {label}
      <input
        id={fieldId}
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value.slice(0, RECOVERY_PHRASE_MAX))}
        maxLength={RECOVERY_PHRASE_MAX}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        autoFocus={autoFocus}
        aria-invalid={error ? true : undefined}
        aria-describedby={[countId, describedBy, error ? errorId : null].filter(Boolean).join(" ") || undefined}
        data-autofocus={autoFocus ? true : undefined}
      />
      <small id={countId} className="vault-phrase-count">{counter}</small>
      {error ? <span id={errorId} className="vault-phrase-error" role="alert">{error}</span> : null}
    </label>
  );
}
