"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Shared accessible-dialog behavior for any portalled overlay that is mounted
 * only while open (StepUpDialog, Modal, CommandPalette). Handles, for the
 * lifetime of the mount:
 *
 * - scroll-lock on <body> (restored on unmount)
 * - initial focus into the panel (first focusable, else the panel itself)
 * - ESC to dismiss
 * - Tab / Shift+Tab focus trap within the panel
 * - focus restored to the previously-active element on unmount
 *
 * onClose is read from a ref so parent re-renders do not re-bind listeners
 * or steal focus (which made Vault step-up require a second click).
 *
 * The panel element must be focusable as a fallback (give it tabIndex={-1}).
 */
export function useDialogA11y(
  panelRef: RefObject<HTMLElement | null>,
  onClose: () => void,
): void {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const panel = panelRef.current;
    const preferred = panel?.querySelector<HTMLElement>(
      "[data-autofocus], input:not([disabled]), textarea:not([disabled]), select:not([disabled])",
    );
    const first = preferred ?? panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !panel) return;

      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === firstEl) {
        event.preventDefault();
        lastEl.focus();
      } else if (!event.shiftKey && active === lastEl) {
        event.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [panelRef]);
}
