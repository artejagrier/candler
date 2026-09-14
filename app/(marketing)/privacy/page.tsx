import type { Metadata } from "next";

import { LegalDocumentView } from "@/components/legal/LegalDocument";
import { PRIVACY_DOCUMENT } from "@/lib/legal/documents";

export const metadata: Metadata = {
  title: PRIVACY_DOCUMENT.title,
  description: PRIVACY_DOCUMENT.description,
};

export default function PrivacyPage() {
  return <LegalDocumentView document={PRIVACY_DOCUMENT} />;
}
