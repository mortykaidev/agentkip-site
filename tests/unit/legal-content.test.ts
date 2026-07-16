import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { LegalContentError, loadLegalBundleFromRoot } from "@/lib/legal/loader";
import { PUBLIC_LEGAL_DOCUMENT_IDS, PUBLIC_LEGAL_ROUTES } from "@/lib/legal/routes";

type SyntheticRegistryDocument = {
  acceptance: "none";
  category: "public-legal";
  effectiveDate: string;
  file: string;
  id: string;
  materialChange: boolean;
  publicationCommit: string;
  region: string;
  runtimeTokens: string[];
  sha256: string;
  status: "approved" | "draft";
  title: string;
  url: string;
  version: string;
};

type SyntheticRegistry = {
  documents: SyntheticRegistryDocument[];
  product: "AgentKip";
  schemaVersion: 1;
  target: "website";
};

type SyntheticExportManifest = {
  product: "AgentKip";
  schemaVersion: 1;
  sourceManifestSha256: string;
  targets: {
    app: { documentIds: string[]; registry: string };
    website: { documentIds: string[]; registry: string };
  };
};

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { force: true, recursive: true })));
});

async function createRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "agentkip-legal-content-"));
  temporaryRoots.push(root);
  return root;
}

async function writeSyntheticBundle(): Promise<{
  exportManifest: SyntheticExportManifest;
  registry: SyntheticRegistry;
  root: string;
}> {
  const root = await createRoot();
  const websiteRoot = path.join(root, "website");
  await mkdir(websiteRoot, { recursive: true });

  const documents: SyntheticRegistryDocument[] = [];
  for (const id of PUBLIC_LEGAL_DOCUMENT_IDS) {
    const route = PUBLIC_LEGAL_ROUTES[id];
    const file = `${route.slice(1)}/content.md`;
    const markdown = `# Synthetic fixture: ${id}\n\nTest-only content.\n`;
    const destination = path.join(websiteRoot, file);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, markdown, "utf8");
    documents.push({
      acceptance: "none",
      category: "public-legal",
      effectiveDate: "2026-07-16",
      file,
      id,
      materialChange: true,
      publicationCommit: "a".repeat(40),
      region: "US",
      runtimeTokens: [],
      sha256: createHash("sha256").update(markdown, "utf8").digest("hex"),
      status: "approved",
      title: `Synthetic ${id}`,
      url: `https://agentkip.ai${route}`,
      version: "2026.07.16-test.1",
    });
  }

  const registry: SyntheticRegistry = {
    documents,
    product: "AgentKip",
    schemaVersion: 1,
    target: "website",
  };
  const documentIds = documents.map((document) => document.id);
  const exportManifest: SyntheticExportManifest = {
    product: "AgentKip",
    schemaVersion: 1,
    sourceManifestSha256: "b".repeat(64),
    targets: {
      app: { documentIds, registry: "app/legal-documents.json" },
      website: { documentIds, registry: "website/legal-documents.json" },
    },
  };
  await persistBundle(root, exportManifest, registry);
  return { exportManifest, registry, root };
}

async function persistBundle(
  root: string,
  exportManifest: SyntheticExportManifest,
  registry: SyntheticRegistry,
): Promise<void> {
  await writeFile(
    path.join(root, "export-manifest.json"),
    `${JSON.stringify(exportManifest, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(root, "website", "legal-documents.json"),
    `${JSON.stringify(registry, null, 2)}\n`,
    "utf8",
  );
}

describe("approved legal export loader", () => {
  it("returns no content when the approved export is absent", async () => {
    await expect(loadLegalBundleFromRoot(await createRoot())).resolves.toBeNull();
  });

  it("loads a complete, hash-matched synthetic export", async () => {
    const { root } = await writeSyntheticBundle();
    const bundle = await loadLegalBundleFromRoot(root);

    expect(bundle?.documents.size).toBe(PUBLIC_LEGAL_DOCUMENT_IDS.length);
    expect(bundle?.documents.get("acceptable-use-policy")?.markdown).toContain(
      "Synthetic fixture",
    );
    expect(bundle?.documents.get("acceptable-use-policy")?.metadata.url).toBe(
      "https://agentkip.ai/acceptable-use",
    );
  });

  it.each([
    ["draft status", (document: SyntheticRegistryDocument) => { document.status = "draft"; }],
    [
      "unpublished commit",
      (document: SyntheticRegistryDocument) => { document.publicationCommit = "UNPUBLISHED"; },
    ],
  ])("rejects %s", async (_label, mutate) => {
    const bundle = await writeSyntheticBundle();
    mutate(bundle.registry.documents[0]);
    await persistBundle(bundle.root, bundle.exportManifest, bundle.registry);

    await expect(loadLegalBundleFromRoot(bundle.root)).rejects.toThrow(LegalContentError);
  });

  it("rejects a content hash mismatch", async () => {
    const bundle = await writeSyntheticBundle();
    const document = bundle.registry.documents[0];
    await writeFile(path.join(bundle.root, "website", document.file), "changed bytes", "utf8");

    await expect(loadLegalBundleFromRoot(bundle.root)).rejects.toThrow("content hash mismatch");
  });

  it("rejects incomplete public-document sets", async () => {
    const bundle = await writeSyntheticBundle();
    bundle.registry.documents.pop();
    bundle.exportManifest.targets.website.documentIds.pop();
    await persistBundle(bundle.root, bundle.exportManifest, bundle.registry);

    await expect(loadLegalBundleFromRoot(bundle.root)).rejects.toThrow(
      "complete public legal set",
    );
  });

  it("rejects registry and export-manifest ID drift", async () => {
    const bundle = await writeSyntheticBundle();
    bundle.exportManifest.targets.website.documentIds = bundle.exportManifest.targets.website.documentIds.toReversed();
    await persistBundle(bundle.root, bundle.exportManifest, bundle.registry);

    await expect(loadLegalBundleFromRoot(bundle.root)).rejects.toThrow(
      "registry IDs do not match",
    );
  });

  it("rejects route drift and path traversal", async () => {
    const routeBundle = await writeSyntheticBundle();
    routeBundle.registry.documents[0].url = "https://agentkip.ai/not-the-approved-route";
    await persistBundle(routeBundle.root, routeBundle.exportManifest, routeBundle.registry);
    await expect(loadLegalBundleFromRoot(routeBundle.root)).rejects.toThrow("route mismatch");

    const traversalBundle = await writeSyntheticBundle();
    traversalBundle.registry.documents[0].file = "../private.md";
    await persistBundle(traversalBundle.root, traversalBundle.exportManifest, traversalBundle.registry);
    await expect(loadLegalBundleFromRoot(traversalBundle.root)).rejects.toThrow(LegalContentError);
  });

  it("rejects invalid UTF-8 instead of replacing bytes", async () => {
    const bundle = await writeSyntheticBundle();
    const registryPath = path.join(bundle.root, "website", "legal-documents.json");
    const valid = await readFile(registryPath);
    await writeFile(registryPath, Buffer.concat([valid.subarray(0, -1), Buffer.from([0xff])]));

    await expect(loadLegalBundleFromRoot(bundle.root)).rejects.toThrow("valid UTF-8");
  });
});
