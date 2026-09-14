import type { Metadata } from "next";

import { LegalDocumentView } from "@/components/legal/LegalDocument";
import { SECURITY_DOCUMENT } from "@/lib/legal/documents";

export const metadata: Metadata = {
  title: SECURITY_DOCUMENT.title,
  description: SECURITY_DOCUMENT.description,
};

export default function SecurityPage() {
  return <LegalDocumentView document={SECURITY_DOCUMENT} />;
}
