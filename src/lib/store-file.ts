import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ContentKey, ContentMap } from "@/lib/content-types";
import {
  getErrorMessage,
  contentStorageKey,
  type AddWaitlistResult,
  type ContactMessageEntry,
  type ContactMessageInput,
  type SiteStore,
  type WaitlistEntry,
} from "@/lib/store-types";

/*
  JSON-file SiteStore — the no-database dev fallback. Fine locally; ephemeral
  on Vercel (set DATABASE_URL in real deployments). All updates build new
  objects; nothing is mutated in place.
*/

const DATA_FILE = path.join(process.cwd(), ".data", "site.json");

type FileData = {
  sections: Record<string, unknown>;
  waitlist: WaitlistEntry[];
  contactMessages: ContactMessageEntry[];
  nextWaitlistId: number;
  nextContactMessageId: number;
};

const EMPTY_DATA: FileData = {
  sections: {},
  waitlist: [],
  contactMessages: [],
  nextWaitlistId: 1,
  nextContactMessageId: 1,
};

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}

async function readData(dataFile: string): Promise<FileData> {
  let raw: string;
  try {
    raw = await readFile(dataFile, "utf8");
  } catch (error) {
    if (isMissingFileError(error)) return EMPTY_DATA;
    throw new Error(`Failed to read ${dataFile}: ${getErrorMessage(error)}`);
  }
  try {
    return { ...EMPTY_DATA, ...(JSON.parse(raw) as Partial<FileData>) };
  } catch {
    throw new Error(
      `${dataFile} contains invalid JSON. Fix or delete the file and try again.`,
    );
  }
}

async function writeData(dataFile: string, data: FileData): Promise<void> {
  try {
    await mkdir(path.dirname(dataFile), { recursive: true });
    const tempFile = `${dataFile}.tmp`;
    await writeFile(tempFile, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    await rename(tempFile, dataFile);
  } catch (error) {
    throw new Error(`Failed to write ${dataFile}: ${getErrorMessage(error)}`);
  }
}

export function createFileStore(dataFile = DATA_FILE): SiteStore {
  return {
    async getSection<K extends ContentKey>(key: K): Promise<ContentMap[K] | null> {
      const data = await readData(dataFile);
      return (data.sections[contentStorageKey(key)] as ContentMap[K] | undefined) ?? null;
    },

    async setSection<K extends ContentKey>(key: K, value: ContentMap[K]): Promise<void> {
      const data = await readData(dataFile);
      await writeData(dataFile, {
        ...data,
        sections: { ...data.sections, [contentStorageKey(key)]: value },
      });
    },

    async deleteSection(key: ContentKey): Promise<void> {
      const data = await readData(dataFile);
      const rest = { ...data.sections };
      delete rest[contentStorageKey(key)];
      await writeData(dataFile, { ...data, sections: rest });
    },

    async addWaitlistEmail(email: string): Promise<AddWaitlistResult> {
      const data = await readData(dataFile);
      const normalized = email.toLowerCase();
      const exists = data.waitlist.some((entry) => entry.email.toLowerCase() === normalized);
      if (exists) return { status: "already-subscribed" };
      const entry: WaitlistEntry = {
        id: data.nextWaitlistId,
        email: normalized,
        createdAt: new Date().toISOString(),
      };
      await writeData(dataFile, {
        ...data,
        waitlist: [...data.waitlist, entry],
        nextWaitlistId: data.nextWaitlistId + 1,
      });
      return { status: "added" };
    },

    async listWaitlist(): Promise<WaitlistEntry[]> {
      const data = await readData(dataFile);
      return [...data.waitlist].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async deleteWaitlistEntry(id: number): Promise<void> {
      const data = await readData(dataFile);
      await writeData(dataFile, {
        ...data,
        waitlist: data.waitlist.filter((entry) => entry.id !== id),
      });
    },

    async addContactMessage(input: ContactMessageInput): Promise<void> {
      const data = await readData(dataFile);
      const entry: ContactMessageEntry = {
        id: data.nextContactMessageId,
        name: input.name,
        email: input.email,
        message: input.message,
        createdAt: new Date().toISOString(),
      };
      await writeData(dataFile, {
        ...data,
        contactMessages: [...data.contactMessages, entry],
        nextContactMessageId: data.nextContactMessageId + 1,
      });
    },

    async listContactMessages(): Promise<ContactMessageEntry[]> {
      const data = await readData(dataFile);
      return [...data.contactMessages].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async deleteContactMessage(id: number): Promise<void> {
      const data = await readData(dataFile);
      await writeData(dataFile, {
        ...data,
        contactMessages: data.contactMessages.filter((entry) => entry.id !== id),
      });
    },
  };
}
