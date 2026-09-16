import type { Metadata } from "next";

import { LegalDocumentView } from "@/components/legal/LegalDocument";
import { REFUND_DOCUMENT } from "@/lib/legal/documents";

export const metadata: Metadata = {
  title: REFUND_DOCUMENT.title,
  description: REFUND_DOCUMENT.description,
};

export default function RefundPage() {
  return <LegalDocumentView document={REFUND_DOCUMENT} />;
}
