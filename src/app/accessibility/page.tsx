import { LegalDocumentPage, legalDocumentMetadata } from "@/components/legal-document";

const DOCUMENT_ID = "accessibility" as const;

export const generateMetadata = () => legalDocumentMetadata(DOCUMENT_ID);

export default function AccessibilityPage() {
  return <LegalDocumentPage documentId={DOCUMENT_ID} />;
}
