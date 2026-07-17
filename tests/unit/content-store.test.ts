import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_CONTENT } from "@/content/defaults";
import { createFileStore } from "@/lib/store-file";
import { CONTENT_SCHEMAS } from "@/lib/store-schemas";
import { contentStorageKey } from "@/lib/store-types";

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { force: true, recursive: true })));
});

async function makeDataFile() {
  const root = await mkdtemp(path.join(tmpdir(), "agentkip-copy-v2-"));
  temporaryRoots.push(root);
  const dataFile = path.join(root, "site.json");
  await writeFile(
    dataFile,
    `${JSON.stringify({
      sections: {
        hero: {
          announcement: null,
          headline: "Legacy production headline",
          subhead: "Legacy production support",
          primaryCtaLabel: "Old action",
          secondaryCtaLabel: "Old link",
        },
      },
      waitlist: [{ id: 1, email: "saved@example.com", createdAt: "2026-01-01T00:00:00.000Z" }],
      contactMessages: [
        {
          id: 1,
          name: "Saved person",
          email: "message@example.com",
          message: "Keep me",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      nextWaitlistId: 2,
      nextContactMessageId: 2,
    }, null, 2)}\n`,
    "utf8",
  );
  return dataFile;
}

describe("copy-v2 content storage", () => {
  it("ignores legacy copy, saves v2 edits, and resets only the v2 row", async () => {
    const dataFile = await makeDataFile();
    const store = createFileStore(dataFile);

    await expect(store.getSection("hero")).resolves.toBeNull();

    await store.setSection("hero", DEFAULT_CONTENT.hero);
    await expect(store.getSection("hero")).resolves.toEqual(DEFAULT_CONTENT.hero);

    const saved = JSON.parse(await readFile(dataFile, "utf8"));
    expect(saved.sections.hero.headline).toBe("Legacy production headline");
    expect(saved.sections[contentStorageKey("hero")]).toEqual(DEFAULT_CONTENT.hero);
    expect(saved.waitlist).toHaveLength(1);
    expect(saved.contactMessages).toHaveLength(1);

    await store.deleteSection("hero");
    const reset = JSON.parse(await readFile(dataFile, "utf8"));
    expect(reset.sections.hero.headline).toBe("Legacy production headline");
    expect(reset.sections[contentStorageKey("hero")]).toBeUndefined();
    expect(reset.waitlist).toEqual(saved.waitlist);
    expect(reset.contactMessages).toEqual(saved.contactMessages);
  });

  it("accepts exactly six editable homepage help groups", () => {
    expect(CONTENT_SCHEMAS.homeBenefits.safeParse(DEFAULT_CONTENT.homeBenefits).success).toBe(true);
    expect(CONTENT_SCHEMAS.homeBenefits.safeParse(DEFAULT_CONTENT.homeBenefits.slice(0, 5)).success).toBe(false);
  });
});
