"use client";

import Link from "next/link";
import { useId } from "react";

import { LEGAL_ROUTES } from "@/lib/legal/versions";

type LegalConsentFieldProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  onBlur?: () => void;
  error?: string;
  name?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  disabled?: boolean;
};

export function LegalConsentField({
  checked,
  onChange,
  onBlur,
  error,
  name,
  inputRef,
  disabled,
}: LegalConsentFieldProps) {
  const id = useId();
  const labelId = `${id}-label`;
  const errorId = `${id}-error`;

  return (
    <div className="legal-consent">
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-labelledby={labelId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.checked)}
        onBlur={onBlur}
      />
      <p
        id={labelId}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a")) return;
          if (disabled) return;
          onChange(!checked);
        }}
      >
        I agree to the{" "}
        <Link href={LEGAL_ROUTES.terms} target="_blank" rel="noopener noreferrer">
          Terms of Service
        </Link>{" "}
        and acknowledge the{" "}
        <Link href={LEGAL_ROUTES.privacy} target="_blank" rel="noopener noreferrer">
          Privacy Policy
        </Link>
        .
      </p>
      {error ? (
        <p id={errorId} className="legal-consent-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
