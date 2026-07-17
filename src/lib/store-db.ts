import { neon } from "@neondatabase/serverless";
import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { contactMessages, contentSections, waitlist } from "@/db/schema";
import type { ContentKey, ContentMap } from "@/lib/content-types";
import { contentStorageKey } from "@/lib/store-types";
import type {
  AddWaitlistResult,
  ContactMessageEntry,
  ContactMessageInput,
  SiteStore,
  WaitlistEntry,
} from "@/lib/store-types";

/*
  Neon Postgres SiteStore (production path — used whenever DATABASE_URL is set).
  Content values are stored as jsonb blobs shaped by ContentMap[ContentKey];
  the zod schemas in store-schemas.ts validate every value before it is written.
*/

export function createDbStore(databaseUrl: string): SiteStore {
  const db = drizzle(neon(databaseUrl));

  return {
    async getSection<K extends ContentKey>(key: K): Promise<ContentMap[K] | null> {
      const storedKey = contentStorageKey(key);
      const rows = await db
        .select({ value: contentSections.value })
        .from(contentSections)
        .where(eq(contentSections.key, storedKey))
        .limit(1);
      const row = rows[0];
      return row ? (row.value as ContentMap[K]) : null;
    },

    async setSection<K extends ContentKey>(key: K, value: ContentMap[K]): Promise<void> {
      const storedKey = contentStorageKey(key);
      await db
        .insert(contentSections)
        .values({ key: storedKey, value, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: contentSections.key,
          set: { value, updatedAt: new Date() },
        });
    },

    async deleteSection(key: ContentKey): Promise<void> {
      await db.delete(contentSections).where(eq(contentSections.key, contentStorageKey(key)));
    },

    async addWaitlistEmail(email: string): Promise<AddWaitlistResult> {
      const inserted = await db
        .insert(waitlist)
        .values({ email: email.toLowerCase() })
        .onConflictDoNothing({ target: waitlist.email })
        .returning({ id: waitlist.id });
      return { status: inserted.length > 0 ? "added" : "already-subscribed" };
    },

    async listWaitlist(): Promise<WaitlistEntry[]> {
      const rows = await db
        .select()
        .from(waitlist)
        .orderBy(desc(waitlist.createdAt))
        .limit(500);
      return rows.map((row) => ({
        id: row.id,
        email: row.email,
        createdAt: row.createdAt.toISOString(),
      }));
    },

    async deleteWaitlistEntry(id: number): Promise<void> {
      await db.delete(waitlist).where(eq(waitlist.id, id));
    },

    async addContactMessage(input: ContactMessageInput): Promise<void> {
      await db.insert(contactMessages).values({
        name: input.name,
        email: input.email,
        message: input.message,
      });
    },

    async listContactMessages(): Promise<ContactMessageEntry[]> {
      const rows = await db
        .select()
        .from(contactMessages)
        .orderBy(desc(contactMessages.createdAt))
        .limit(500);
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        message: row.message,
        createdAt: row.createdAt.toISOString(),
      }));
    },

    async deleteContactMessage(id: number): Promise<void> {
      await db.delete(contactMessages).where(eq(contactMessages.id, id));
    },
  };
}
