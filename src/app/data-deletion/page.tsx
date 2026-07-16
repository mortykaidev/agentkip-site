import { LegalDocumentPage, legalDocumentMetadata } from "@/components/legal-document";

const DOCUMENT_ID = "data-deletion" as const;

export const generateMetadata = () => legalDocumentMetadata(DOCUMENT_ID);

export default function DataDeletionPage() {
  return <LegalDocumentPage documentId={DOCUMENT_ID} />;
}
