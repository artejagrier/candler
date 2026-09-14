import type { Metadata } from "next";

import { LegalDocumentView } from "@/components/legal/LegalDocument";
import { AUP_DOCUMENT } from "@/lib/legal/documents";

export const metadata: Metadata = {
  title: AUP_DOCUMENT.title,
  description: AUP_DOCUMENT.description,
};

export default function AcceptableUsePage() {
  return <LegalDocumentView document={AUP_DOCUMENT} />;
}
