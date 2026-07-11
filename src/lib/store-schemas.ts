import { z } from "zod";
import type { ContentKey, ContentMap } from "@/lib/content-types";

/*
  Zod validation for everything that enters the store:
  - CONTENT_SCHEMAS[key] guards every admin content save (shape-checked against
    ContentMap so the schemas can't drift from src/lib/content-types.ts).
  - waitlistInputSchema / contactInputSchema guard the public forms.
*/

const nonEmpty = z.string().trim().min(1, "Required");

export const contentKeySchema = z.enum([
  "hero",
  "getPage",
  "siteStatus",
  "contact",
  "faq",
  "roadmap",
  "changelog",
  "useCases",
  "gallery",
]) satisfies z.ZodType<ContentKey>;

export const CONTENT_SCHEMAS: { [K in ContentKey]: z.ZodType<ContentMap[K]> } = {
  hero: z.object({
    announcement: nonEmpty.nullable(),
    headline: nonEmpty,
    subhead: nonEmpty,
    primaryCtaLabel: nonEmpty,
    secondaryCtaLabel: nonEmpty,
  }),
  getPage: z
    .object({
      betaStage: z.enum(["invite", "testflight", "appstore"]),
      inviteHeadline: nonEmpty,
      inviteBody: nonEmpty,
      testflightUrl: z.url("Must be a full URL (https://…)").nullable(),
    })
    .refine((value) => value.betaStage !== "testflight" || value.testflightUrl !== null, {
      message: "A TestFlight URL is required when the stage is set to TestFlight.",
      path: ["testflightUrl"],
    }),
  siteStatus: z.object({
    label: nonEmpty,
    tone: z.enum(["mint", "butter", "peach"]),
    buildNote: nonEmpty.nullable(),
  }),
  contact: z.object({
    email: z.email("Must be a valid email address"),
    blurb: nonEmpty,
    socials: z.array(z.object({ label: nonEmpty, url: z.url("Must be a full URL") })),
  }),
  faq: z.array(z.object({ question: nonEmpty, answer: nonEmpty })),
  roadmap: z.array(
    z.object({
      title: nonEmpty,
      description: nonEmpty,
      status: z.enum(["building", "planned", "exploring"]),
    }),
  ),
  changelog: z.array(
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
      title: nonEmpty,
      notes: z.array(nonEmpty).min(1, "Add at least one note"),
    }),
  ),
  useCases: z.array(
    z.object({
      title: nonEmpty,
      description: nonEmpty,
      tags: z.array(nonEmpty),
      result: nonEmpty.nullable(),
    }),
  ),
  gallery: z.array(
    z.object({
      src: nonEmpty,
      alt: nonEmpty,
      caption: nonEmpty.nullable(),
    }),
  ),
};

export const waitlistInputSchema = z.object({
  email: z.email("Enter a valid email address").max(320),
});

export const contactInputSchema = z.object({
  name: nonEmpty.max(200, "Keep the name under 200 characters"),
  email: z.email("Enter a valid email address").max(320),
  message: nonEmpty.max(5000, "Keep the message under 5,000 characters"),
});

export const idInputSchema = z.object({ id: z.coerce.number().int().positive() });
