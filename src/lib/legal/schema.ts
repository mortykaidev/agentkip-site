import { z } from "zod";

const SHA256 = /^[0-9a-f]{64}$/;
const COMMIT = /^[0-9a-f]{40}$/;
const DOCUMENT_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VERSION = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const REGION = /^[A-Z][A-Z0-9-]{1,31}$/;
const RUNTIME_TOKEN = /^[A-Z][A-Z0-9_]+$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isCalendarDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function isSafeRelativePath(value: string): boolean {
  if (!value || value.startsWith("/") || value.includes("\\")) return false;
  const parts = value.split("/");
  return parts.every((part) => part.length > 0 && part !== "." && part !== "..");
}

function isCanonicalAgentKipUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return (
      parsed.origin === "https://agentkip.ai" &&
      parsed.username === "" &&
      parsed.password === "" &&
      parsed.search === "" &&
      parsed.hash === "" &&
      value === `${parsed.origin}${parsed.pathname}`
    );
  } catch {
    return false;
  }
}

export const legalRegistryDocumentSchema = z
  .object({
    acceptance: z.enum(["none", "acknowledgment", "explicit", "provider-specific", "per-action"]),
    category: z.enum(["public-legal", "user-guide"]),
    effectiveDate: z.string().refine(isCalendarDate, "effectiveDate must be a real YYYY-MM-DD date"),
    file: z.string().refine(isSafeRelativePath, "file must be a safe relative path").nullable(),
    id: z.string().regex(DOCUMENT_ID),
    materialChange: z.boolean(),
    publicationCommit: z.string().regex(COMMIT),
    region: z.string().regex(REGION),
    runtimeTokens: z.array(z.string().regex(RUNTIME_TOKEN)).length(0),
    sha256: z.string().regex(SHA256),
    status: z.enum(["approved", "published"]),
    title: z.string().trim().min(1),
    url: z.string().refine(isCanonicalAgentKipUrl, "url must use the canonical agentkip.ai origin").nullable(),
    version: z.string().regex(VERSION),
  })
  .strict();

export const legalRegistrySchema = z
  .object({
    documents: z.array(legalRegistryDocumentSchema),
    product: z.literal("AgentKip"),
    schemaVersion: z.literal(1),
    target: z.literal("website"),
  })
  .strict()
  .superRefine((registry, context) => {
    const seenIds = new Set<string>();
    const seenFiles = new Set<string>();
    const seenUrls = new Set<string>();
    const sortedIds = registry.documents.map((document) => document.id).toSorted();

    registry.documents.forEach((document, index) => {
      for (const [kind, value, seen] of [
        ["id", document.id, seenIds],
        ["file", document.file, seenFiles],
        ["url", document.url, seenUrls],
      ] as const) {
        if (value === null) continue;
        if (seen.has(value)) {
          context.addIssue({
            code: "custom",
            message: `duplicate document ${kind}: ${value}`,
            path: ["documents", index, kind],
          });
        }
        seen.add(value);
      }
    });

    if (registry.documents.some((document, index) => document.id !== sortedIds[index])) {
      context.addIssue({
        code: "custom",
        message: "documents must be sorted by id",
        path: ["documents"],
      });
    }
  });

const exportTargetSchema = z
  .object({
    documentIds: z.array(z.string().regex(DOCUMENT_ID)),
    registry: z.string().refine(isSafeRelativePath, "registry must be a safe relative path"),
  })
  .strict();

export const legalExportManifestSchema = z
  .object({
    product: z.literal("AgentKip"),
    schemaVersion: z.literal(1),
    sourceManifestSha256: z.string().regex(SHA256),
    targets: z
      .object({
        app: exportTargetSchema,
        website: exportTargetSchema,
      })
      .strict(),
  })
  .strict();

export type LegalRegistry = z.infer<typeof legalRegistrySchema>;
export type LegalRegistryDocument = z.infer<typeof legalRegistryDocumentSchema>;
export type LegalExportManifest = z.infer<typeof legalExportManifestSchema>;
