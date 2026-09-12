"use client";

import { RotateCw } from "lucide-react";

/**
 * Error boundary for the authenticated product surface. Renders inside the
 * ProductShell, so navigation and the protected sky stay intact. We never
 * surface stack traces, error messages, or digests to the user.
 */
export default function ProductError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="empty-state" role="alert">
      <p className="eyebrow">Something went wrong</p>
      <h2>This view couldn’t load</h2>
      <p className="empty-copy">
        An unexpected error interrupted this page. Your projects, secrets, and files are unaffected.
      </p>
      <button type="button" className="primary-button" onClick={reset}>
        <RotateCw aria-hidden="true" /> Try again
      </button>
    </div>
  );
}
