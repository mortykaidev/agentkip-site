import { LegalDocumentPage, legalDocumentMetadata } from "@/components/legal-document";

const DOCUMENT_ID = "ai-transparency-and-safety" as const;

export const generateMetadata = () => legalDocumentMetadata(DOCUMENT_ID);

export default function AiTransparencyPage() {
  return <LegalDocumentPage documentId={DOCUMENT_ID} />;
}
