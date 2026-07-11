import { jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

/*
  Drizzle schema for the AgentKip site data layer (Neon Postgres).
  `content_sections.value` holds a ContentMap[ContentKey] JSON blob keyed by
  its ContentKey — see src/lib/content-types.ts for the shapes.
  NOTE: no "server-only" import here; drizzle-kit loads this file from the CLI.
*/

export const contentSections = pgTable("content_sections", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const waitlist = pgTable("waitlist", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
