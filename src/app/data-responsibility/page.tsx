import { LegalDocumentPage, legalDocumentMetadata } from "@/components/legal-document";

const DOCUMENT_ID = "data-responsibility" as const;

export const generateMetadata = () => legalDocumentMetadata(DOCUMENT_ID);

export default function DataResponsibilityPage() {
  return <LegalDocumentPage documentId={DOCUMENT_ID} />;
}
