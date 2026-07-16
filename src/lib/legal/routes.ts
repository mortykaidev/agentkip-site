export const PUBLIC_LEGAL_ROUTES = {
  "acceptable-use-policy": "/acceptable-use",
  accessibility: "/accessibility",
  "ai-transparency-and-safety": "/ai",
  "data-deletion": "/data-deletion",
  "data-responsibility": "/data-responsibility",
  "legal-notice": "/legal-notice",
  "privacy-policy": "/privacy",
  security: "/security",
  subprocessors: "/subprocessors",
  "terms-of-service": "/terms",
} as const;

export type PublicLegalDocumentId = keyof typeof PUBLIC_LEGAL_ROUTES;

export const PUBLIC_LEGAL_DOCUMENT_IDS = Object.freeze(
  Object.keys(PUBLIC_LEGAL_ROUTES).sort() as PublicLegalDocumentId[],
);

export function isPublicLegalDocumentId(value: string): value is PublicLegalDocumentId {
  return Object.hasOwn(PUBLIC_LEGAL_ROUTES, value);
}
