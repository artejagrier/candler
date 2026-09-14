import type { Metadata } from "next";

import { LegalDocumentView } from "@/components/legal/LegalDocument";
import { TERMS_DOCUMENT } from "@/lib/legal/documents";

export const metadata: Metadata = {
  title: TERMS_DOCUMENT.title,
  description: TERMS_DOCUMENT.description,
};

export default function TermsPage() {
  return <LegalDocumentView document={TERMS_DOCUMENT} />;
}
