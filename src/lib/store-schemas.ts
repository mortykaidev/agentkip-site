import { z } from "zod";
import type { ContentKey, ContentMap } from "@/lib/content-types";
import {
  isValidAppStoreUrl,
  isValidNogginRepositoryUrl,
  isValidTestFlightUrl,
} from "@/lib/release-links";

/*
  Zod validation for everything that enters the store:
  - CONTENT_SCHEMAS[key] guards every admin content save (shape-checked against
    ContentMap so the schemas can't drift from src/lib/content-types.ts).
  - waitlistInputSchema / contactInputSchema guard the public forms.
*/

const nonEmpty = z.string().trim().min(1, "Required");

export const contentKeySchema = z.enum([
  "hero",
  "homeBenefits",
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
  homeBenefits: z
    .array(
      z.object({
        title: nonEmpty,
        description: nonEmpty,
      }),
    )
    .length(6, "Add exactly six homepage groups"),
  getPage: z
    .object({
      betaStage: z.enum(["invite", "testflight", "appstore"]),
      inviteHeadline: nonEmpty,
      inviteBody: nonEmpty,
      testflightUrl: z
        .string()
        .refine(isValidTestFlightUrl, "Use a direct https://testflight.apple.com/join/… link.")
        .nullable(),
      appStoreUrl: z
        .string()
        .refine(isValidAppStoreUrl, "Use the full apps.apple.com app listing URL, including its id.")
        .nullable(),
      nogginStage: z.enum(["invite", "repository"]),
      nogginRepositoryUrl: z
        .string()
        .refine(isValidNogginRepositoryUrl, "Use the public https://github.com/owner/repository URL.")
        .nullable(),
    })
    .superRefine((value, context) => {
      if (value.betaStage === "testflight" && value.testflightUrl === null) {
        context.addIssue({
          code: "custom",
          message: "A verified TestFlight URL is required for the TestFlight stage.",
          path: ["testflightUrl"],
        });
      }
      if (value.betaStage === "appstore" && value.appStoreUrl === null) {
        context.addIssue({
          code: "custom",
          message: "A verified App Store listing is required for the App Store stage.",
          path: ["appStoreUrl"],
        });
      }
      if (value.nogginStage === "repository" && value.nogginRepositoryUrl === null) {
        context.addIssue({
          code: "custom",
          message: "A verified public Noggin repository is required for the repository stage.",
          path: ["nogginRepositoryUrl"],
        });
      }
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
