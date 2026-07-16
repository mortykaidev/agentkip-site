import { LegalDocumentPage, legalDocumentMetadata } from "@/components/legal-document";

const DOCUMENT_ID = "legal-notice" as const;

export const generateMetadata = () => legalDocumentMetadata(DOCUMENT_ID);

export default function LegalNoticePage() {
  return <LegalDocumentPage documentId={DOCUMENT_ID} />;
}
