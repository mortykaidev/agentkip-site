import { LegalDocumentPage, legalDocumentMetadata } from "@/components/legal-document";

const DOCUMENT_ID = "subprocessors" as const;

export const generateMetadata = () => legalDocumentMetadata(DOCUMENT_ID);

export default function SubprocessorsPage() {
  return <LegalDocumentPage documentId={DOCUMENT_ID} />;
}
