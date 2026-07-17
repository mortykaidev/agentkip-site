import type { ContentKey, ContentMap } from "@/lib/content-types";

export const CONTENT_NAMESPACE = "copy-v2";

/** Keep rewritten copy isolated from legacy production overrides without a schema change. */
export function contentStorageKey(key: ContentKey): `${typeof CONTENT_NAMESPACE}/${ContentKey}` {
  return `${CONTENT_NAMESPACE}/${key}`;
}

/* Shared contract for the two SiteStore implementations:
   - store-db.ts   → Neon Postgres via drizzle-orm (when DATABASE_URL is set)
   - store-file.ts → JSON file at .data/site.json (dev fallback)
   Dates cross the boundary as ISO strings so entries stay serializable. */

export type WaitlistEntry = {
  id: number;
  email: string;
  /** ISO timestamp */
  createdAt: string;
};

export type ContactMessageEntry = {
  id: number;
  name: string;
  email: string;
  message: string;
  /** ISO timestamp */
  createdAt: string;
};

export type ContactMessageInput = {
  name: string;
  email: string;
  message: string;
};

export type AddWaitlistResult = { status: "added" | "already-subscribed" };

export interface SiteStore {
  /** Stored override for a content section, or null when the seeded default applies. */
  getSection<K extends ContentKey>(key: K): Promise<ContentMap[K] | null>;
  setSection<K extends ContentKey>(key: K, value: ContentMap[K]): Promise<void>;
  /** Remove an override so the section falls back to DEFAULT_CONTENT. */
  deleteSection(key: ContentKey): Promise<void>;

  /** Duplicate-tolerant: an existing email reports "already-subscribed", never throws. */
  addWaitlistEmail(email: string): Promise<AddWaitlistResult>;
  listWaitlist(): Promise<WaitlistEntry[]>;
  deleteWaitlistEntry(id: number): Promise<void>;

  addContactMessage(input: ContactMessageInput): Promise<void>;
  listContactMessages(): Promise<ContactMessageEntry[]>;
  deleteContactMessage(id: number): Promise<void>;
}

/** Narrow an unknown thrown value to a readable message. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
