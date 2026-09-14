"use client";

import { useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { confirmStepUp } from "@/lib/product/client-security";
import { useDialogA11y } from "@/hooks/useDialogA11y";

export function StepUpDialog({ onClose, onVerified }: { onClose: () => void; onVerified: () => void }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const panelRef = useRef<HTMLFormElement>(null);
  const titleId = useId();
  const descId = useId();

  useDialogA11y(panelRef, onClose);

  return createPortal(
    <div className="modal-backdrop" role="presentation">
      <button
        type="button"
        aria-label="Cancel"
        onClick={onClose}
        tabIndex={-1}
        className="modal-scrim"
      />
      <form
        ref={panelRef}
        className="workflow-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        onSubmit={(event) => {
          event.preventDefault();
          if (submitting.current) return;
          submitting.current = true;
          const password = String(new FormData(event.currentTarget).get("password"));
          setPending(true);
          void confirmStepUp(password).then((result) => {
            if (result.ok) onVerified();
            else {
              submitting.current = false;
              setPending(false);
              setError(result.error ?? "Password verification failed.");
            }
          }).catch(() => {
            submitting.current = false;
            setPending(false);
            setError("Recent authentication could not be confirmed.");
          });
        }}
      >
        <h2 id={titleId}>Confirm it’s you</h2>
        <p id={descId}>Revealing encrypted values requires a recent password confirmation or an MFA-assured session.</p>
        <label>
          Password
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        {error ? <p className="security-note" role="alert">{error}</p> : null}
        <div>
          <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
          <button className="primary-button" disabled={pending}>{pending ? "Confirming…" : "Confirm"}</button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
