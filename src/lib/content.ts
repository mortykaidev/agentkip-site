import "server-only";
import { unstable_cache } from "next/cache";
import { DEFAULT_CONTENT } from "@/content/defaults";
import type { ContentKey, ContentMap } from "@/lib/content-types";
import { getStore } from "@/lib/store";

/** Revalidated (with revalidatePath) by every admin content save in src/lib/actions.ts. */
export const CONTENT_CACHE_TAG = "content";

/* Cached store read. Thrown store errors propagate (so failures are never
   cached) and getContent falls back to the seeded defaults per-request. */
const readStoredSection = unstable_cache(
  async (key: ContentKey) => getStore().getSection(key),
  ["site-content-section"],
  { tags: [CONTENT_CACHE_TAG] },
);

/**
 * Read an editable content section: store value first (Neon Postgres or the
 * .data/site.json dev fallback), seeded DEFAULT_CONTENT as fallback. The site
 * renders fully before any database is touched.
 */
export async function getContent<K extends ContentKey>(key: K): Promise<ContentMap[K]> {
  try {
    const stored = (await readStoredSection(key)) as ContentMap[K] | null;
    return stored ?? DEFAULT_CONTENT[key];
  } catch (error) {
    console.error(`[content] Failed to read section "${key}"; serving defaults.`, error);
    return DEFAULT_CONTENT[key];
  }
}
