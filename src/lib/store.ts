import "server-only";
import { createDbStore } from "@/lib/store-db";
import { createFileStore } from "@/lib/store-file";
import type { SiteStore } from "@/lib/store-types";

export type {
  AddWaitlistResult,
  ContactMessageEntry,
  ContactMessageInput,
  SiteStore,
  WaitlistEntry,
} from "@/lib/store-types";

let cachedStore: SiteStore | null = null;

/**
 * Repository entry point. Neon Postgres (drizzle) when DATABASE_URL is set;
 * otherwise the .data/site.json dev fallback (ephemeral on Vercel).
 */
export function getStore(): SiteStore {
  if (cachedStore) return cachedStore;
  const databaseUrl = process.env.DATABASE_URL;
  cachedStore = databaseUrl ? createDbStore(databaseUrl) : createFileStore();
  return cachedStore;
}
