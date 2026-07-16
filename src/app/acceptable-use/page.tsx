import { LegalDocumentPage, legalDocumentMetadata } from "@/components/legal-document";

const DOCUMENT_ID = "acceptable-use-policy" as const;

export const generateMetadata = () => legalDocumentMetadata(DOCUMENT_ID);

export default function AcceptableUsePage() {
  return <LegalDocumentPage documentId={DOCUMENT_ID} />;
}
