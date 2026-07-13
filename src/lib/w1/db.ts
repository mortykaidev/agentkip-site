import "server-only";
import { Pool } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "@/db/schema";

export type W1Database = ReturnType<typeof drizzle<typeof schema>>;
export type W1Transaction = Parameters<Parameters<W1Database["transaction"]>[0]>[0];

export interface W1DatabasePort {
  transaction<T>(callback: (tx: W1Transaction) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export function createW1Database(databaseUrl = process.env.DATABASE_URL): W1DatabasePort {
  if (!databaseUrl) throw new Error("W1 database configuration is unavailable");
  const pool = new Pool({ connectionString: databaseUrl, max: 5 });
  const db = drizzle(pool, { schema });
  return {
    transaction: <T>(callback: (tx: W1Transaction) => Promise<T>) => db.transaction(callback),
    close: () => pool.end(),
  };
}

export async function withAdvisoryLock<T>(tx: W1Transaction, key: string, work: () => Promise<T>): Promise<T> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${key}))`);
  return work();
}
