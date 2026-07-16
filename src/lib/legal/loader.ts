import "server-only";

import { createHash } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import path from "node:path";
import {
  legalExportManifestSchema,
  legalRegistrySchema,
  type LegalExportManifest,
  type LegalRegistry,
  type LegalRegistryDocument,
} from "@/lib/legal/schema";
import {
  isPublicLegalDocumentId,
  PUBLIC_LEGAL_DOCUMENT_IDS,
  PUBLIC_LEGAL_ROUTES,
  type PublicLegalDocumentId,
} from "@/lib/legal/routes";

const EXPORT_MANIFEST_FILE = "export-manifest.json";
const WEBSITE_REGISTRY_FILE = "website/legal-documents.json";
const MAX_JSON_BYTES = 1_000_000;
const MAX_MARKDOWN_BYTES = 2_000_000;

export const DEFAULT_LEGAL_EXPORT_ROOT = path.join(
  process.cwd(),
  "src",
  "generated",
  "legal",
);

export class LegalContentError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "LegalContentError";
  }
}

export type ApprovedLegalDocument = Readonly<{
  markdown: string;
  metadata: LegalRegistryDocument;
}>;

export type ApprovedLegalBundle = Readonly<{
  documents: ReadonlyMap<string, ApprovedLegalDocument>;
  exportManifest: LegalExportManifest;
  registry: LegalRegistry;
}>;

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await lstat(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

function decodeUtf8(bytes: Buffer, label: string): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    throw new LegalContentError(`${label} must contain valid UTF-8`, { cause: error });
  }
}

async function readBoundedFile(filePath: string, maxBytes: number, label: string): Promise<Buffer> {
  let stats;
  try {
    stats = await lstat(filePath);
  } catch (error) {
    throw new LegalContentError(`${label} is missing`, { cause: error });
  }
  if (stats.isSymbolicLink() || !stats.isFile()) {
    throw new LegalContentError(`${label} must be a regular file`);
  }
  if (stats.size < 1 || stats.size > maxBytes) {
    throw new LegalContentError(`${label} has an invalid size`);
  }
  return readFile(filePath);
}

async function readJson(filePath: string, label: string): Promise<unknown> {
  const bytes = await readBoundedFile(filePath, MAX_JSON_BYTES, label);
  try {
    return JSON.parse(decodeUtf8(bytes, label));
  } catch (error) {
    if (error instanceof LegalContentError) throw error;
    throw new LegalContentError(`${label} must contain valid JSON`, { cause: error });
  }
}

function resolveWithin(root: string, relativePath: string, label: string): string {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, ...relativePath.split("/"));
  const relation = path.relative(resolvedRoot, resolved);
  if (relation === "" || relation.startsWith("..") || path.isAbsolute(relation)) {
    throw new LegalContentError(`${label} must resolve beneath its export root`);
  }
  return resolved;
}

function sameOrderedValues(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function validateBundleRelationship(
  exportManifest: LegalExportManifest,
  registry: LegalRegistry,
): void {
  if (exportManifest.targets.website.registry !== WEBSITE_REGISTRY_FILE) {
    throw new LegalContentError("website registry must use the deterministic export path");
  }

  const registryIds = registry.documents.map((document) => document.id);
  if (!sameOrderedValues(exportManifest.targets.website.documentIds, registryIds)) {
    throw new LegalContentError("website registry IDs do not match the export manifest");
  }

  const publicDocuments = registry.documents.filter(
    (document) => document.category === "public-legal",
  );
  const publicIds = publicDocuments.map((document) => document.id);
  if (!sameOrderedValues(publicIds, PUBLIC_LEGAL_DOCUMENT_IDS)) {
    throw new LegalContentError("website registry must contain the complete public legal set");
  }

  for (const document of publicDocuments) {
    if (!isPublicLegalDocumentId(document.id) || document.file === null || document.url === null) {
      throw new LegalContentError(`public legal document ${document.id} is incomplete`);
    }
    if (new URL(document.url).pathname !== PUBLIC_LEGAL_ROUTES[document.id]) {
      throw new LegalContentError(`public legal route mismatch for ${document.id}`);
    }
  }

  for (const document of registry.documents) {
    if (document.file === null || document.url === null) {
      throw new LegalContentError(`website document ${document.id} is not renderable`);
    }
  }
}

async function loadDocument(
  websiteRoot: string,
  metadata: LegalRegistryDocument,
): Promise<ApprovedLegalDocument> {
  if (metadata.file === null) {
    throw new LegalContentError(`website document ${metadata.id} has no content file`);
  }
  const filePath = resolveWithin(websiteRoot, metadata.file, `content file for ${metadata.id}`);
  const bytes = await readBoundedFile(filePath, MAX_MARKDOWN_BYTES, `content file for ${metadata.id}`);
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (digest !== metadata.sha256) {
    throw new LegalContentError(`content hash mismatch for ${metadata.id}`);
  }
  return Object.freeze({ markdown: decodeUtf8(bytes, `content file for ${metadata.id}`), metadata });
}

export async function loadLegalBundleFromRoot(
  exportRoot: string,
): Promise<ApprovedLegalBundle | null> {
  const exportManifestPath = path.join(exportRoot, EXPORT_MANIFEST_FILE);
  const expectedRegistryPath = path.join(exportRoot, WEBSITE_REGISTRY_FILE);
  const [manifestExists, registryExists] = await Promise.all([
    fileExists(exportManifestPath),
    fileExists(expectedRegistryPath),
  ]);

  if (!manifestExists && !registryExists) return null;
  if (!manifestExists || !registryExists) {
    throw new LegalContentError("legal export is incomplete");
  }

  const exportManifestResult = legalExportManifestSchema.safeParse(
    await readJson(exportManifestPath, "legal export manifest"),
  );
  if (!exportManifestResult.success) {
    throw new LegalContentError("legal export manifest failed schema validation", {
      cause: exportManifestResult.error,
    });
  }

  const registryRelativePath = exportManifestResult.data.targets.website.registry;
  const registryPath = resolveWithin(exportRoot, registryRelativePath, "website registry");
  if (registryPath !== path.resolve(expectedRegistryPath)) {
    throw new LegalContentError("website registry path does not match the export contract");
  }

  const registryResult = legalRegistrySchema.safeParse(
    await readJson(registryPath, "website legal registry"),
  );
  if (!registryResult.success) {
    throw new LegalContentError("website legal registry failed schema validation", {
      cause: registryResult.error,
    });
  }

  validateBundleRelationship(exportManifestResult.data, registryResult.data);
  const websiteRoot = path.dirname(registryPath);
  const loadedDocuments = await Promise.all(
    registryResult.data.documents.map(async (metadata) => [
      metadata.id,
      await loadDocument(websiteRoot, metadata),
    ] as const),
  );

  return Object.freeze({
    documents: new Map(loadedDocuments),
    exportManifest: exportManifestResult.data,
    registry: registryResult.data,
  });
}

export async function loadPublicLegalDocument(
  documentId: PublicLegalDocumentId,
): Promise<ApprovedLegalDocument | null> {
  const bundle = await loadLegalBundleFromRoot(DEFAULT_LEGAL_EXPORT_ROOT);
  return bundle?.documents.get(documentId) ?? null;
}
