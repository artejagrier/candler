import Link from "next/link";

import { LEGAL_ROUTES } from "@/lib/legal/versions";
import type { StoredLegalConsent } from "@/lib/legal/versions";

function formatAcceptedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export function LegalSettings({ consent }: { consent: StoredLegalConsent | null }) {
  return (
    <section className="legal-settings" aria-labelledby="legal-settings-heading">
      <h2 id="legal-settings-heading">Legal</h2>
      <ul className="legal-settings-links">
        <li>
          <Link href={LEGAL_ROUTES.terms}>Terms of Service</Link>
        </li>
        <li>
          <Link href={LEGAL_ROUTES.privacy}>Privacy Policy</Link>
        </li>
        <li>
          <Link href={LEGAL_ROUTES.acceptableUse}>Acceptable Use</Link>
        </li>
        <li>
          <Link href={LEGAL_ROUTES.security}>Security</Link>
        </li>
      </ul>
      {consent ? (
        <p className="legal-settings-meta">
          Legal agreements
          <small>
            Terms accepted: {formatAcceptedAt(consent.accepted_at)}
            <br />
            Version: {consent.terms_version}
          </small>
        </p>
      ) : (
        <p className="legal-settings-meta">
          Legal agreements
          <small>No acceptance is on file yet.</small>
        </p>
      )}
    </section>
  );
}
