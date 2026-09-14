"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";

import { acceptCurrentLegalAction } from "@/lib/legal/actions";
import { LEGAL_ROUTES } from "@/lib/legal/versions";
import { Button } from "@/components/ui/Button";

export function LegalReconsentDialog() {
  const router = useRouter();
  const id = useId();
  const [accepted, setAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onContinue() {
    if (!accepted || pending) return;
    setPending(true);
    setError(null);
    const result = await acceptCurrentLegalAction();
    if (!result.ok) {
      setPending(false);
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="legal-reconsent" role="alertdialog" aria-modal="true" aria-labelledby="legal-reconsent-title" aria-describedby="legal-reconsent-copy">
      <div className="legal-reconsent-card">
        <h2 id="legal-reconsent-title">We’ve updated Candler’s Terms</h2>
        <p id="legal-reconsent-copy">
          Review the current Terms before continuing. Existing accounts without a recorded acceptance will also see this once.
        </p>
        <p>
          <a href={LEGAL_ROUTES.terms} target="_blank" rel="noopener noreferrer">
            Review Terms
          </a>
        </p>
        <div className="legal-consent">
          <input
            id={id}
            type="checkbox"
            checked={accepted}
            disabled={pending}
            onChange={(event) => setAccepted(event.target.checked)}
          />
          <label htmlFor={id}>I agree to the updated Terms of Service</label>
        </div>
        {error ? (
          <p className="legal-consent-error" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="button" disabled={!accepted || pending} onClick={() => void onContinue()}>
          {pending ? "Saving…" : "Continue"}
        </Button>
      </div>
    </div>
  );
}
