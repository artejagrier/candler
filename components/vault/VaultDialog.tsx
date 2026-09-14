"use client";

import { X } from "lucide-react";
import { useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useDialogA11y } from "@/hooks/useDialogA11y";

export function VaultDialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  preventClose = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  preventClose?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  function requestClose() {
    if (preventClose) return;
    onClose();
  }

  useDialogA11y(panelRef, requestClose);

  if (!open) return null;

  return createPortal(
    <div className="modal-backdrop" role="presentation">
      <button
        type="button"
        className="modal-scrim"
        aria-label="Close dialog"
        onClick={requestClose}
        tabIndex={-1}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className="workflow-dialog vault-dialog"
      >
        <div className="vault-dialog-head">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description ? <p id={descId}>{description}</p> : null}
          </div>
          <button type="button" className="icon-button" onClick={requestClose} aria-label="Close" disabled={preventClose}>
            <X />
          </button>
        </div>
        <div className="vault-dialog-body">{children}</div>
        {footer ? <div className="vault-dialog-footer">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
