import Link from "next/link";

import type { LegalDocument } from "@/lib/legal/documents";

export function LegalDocumentView({ document }: { document: LegalDocument }) {
  return (
    <article className="legal-doc">
      <header className="legal-doc-header">
        <p className="legal-doc-kicker">{document.informational ? "Trust" : "Legal"}</p>
        <h1>{document.title}</h1>
        <p className="legal-doc-meta">
          Effective date: {document.effectiveLabel}
          <span aria-hidden="true"> · </span>
          Last updated: {document.updatedLabel}
          <span aria-hidden="true"> · </span>
          Version: {document.version}
        </p>
        {document.informational ? (
          <p className="legal-doc-note">This page is informational. It is not part of the Terms of Service.</p>
        ) : null}
      </header>

      {document.sections.length > 3 ? (
        <nav className="legal-doc-toc" aria-label="Table of contents">
          <p>Contents</p>
          <ol>
            {document.sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`}>{section.title}</a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <div className="legal-doc-body">
        {document.sections.map((section) => (
          <section key={section.id} id={section.id}>
            <h2>{section.title}</h2>
            {section.paragraphs.map((paragraph, index) => (
              <p key={`${section.id}-p-${index}`}>{paragraph}</p>
            ))}
            {section.bullets ? (
              <ul>
                {section.bullets.map((item, index) => (
                  <li key={`${section.id}-b-${index}`}>{item}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>

      <p className="legal-doc-footer">
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/acceptable-use">Acceptable Use</Link>
        <Link href="/security">Security</Link>
      </p>
    </article>
  );
}
