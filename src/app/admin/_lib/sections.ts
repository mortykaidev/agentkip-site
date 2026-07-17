import type { ContentKey } from "@/lib/content-types";

/*
  Config that drives the admin editors. Serializable data only — these specs
  cross the server → client boundary as props. Field kinds:
    text / textarea / select → string
    lines → string[] (one per textarea line)   tags → string[] (comma-separated)
    image → string src (URL, or Vercel Blob upload when configured)
  `nullable` fields serialize an empty input as null.
*/

export type FieldSpec = {
  kind: "text" | "textarea" | "select" | "lines" | "tags" | "image";
  name: string;
  label: string;
  nullable?: boolean;
  placeholder?: string;
  help?: string;
  options?: { value: string; label: string }[];
  rows?: number;
};

export type RowsFieldSpec = {
  name: string;
  label: string;
  itemLabel: string;
  fields: FieldSpec[];
};

export type SectionSpec =
  | { mode: "object"; fields: FieldSpec[]; rowsField?: RowsFieldSpec }
  | { mode: "array"; itemLabel: string; fields: FieldSpec[] };

export type AdminSection = {
  slug: string;
  key: ContentKey;
  title: string;
  description: string;
  spec: SectionSpec;
};

export const ADMIN_SECTIONS: AdminSection[] = [
  {
    slug: "hero",
    key: "hero",
    title: "Hero",
    description: "Homepage headline, subhead, and CTA labels.",
    spec: {
      mode: "object",
      fields: [
        {
          kind: "text",
          name: "announcement",
          label: "Announcement banner",
          nullable: true,
          help: "Small banner above the headline. Leave empty to hide it.",
        },
        { kind: "textarea", name: "headline", label: "Headline", rows: 2 },
        { kind: "textarea", name: "subhead", label: "Subhead", rows: 4 },
        { kind: "text", name: "primaryCtaLabel", label: "Primary button label" },
        { kind: "text", name: "secondaryCtaLabel", label: "Secondary button label" },
      ],
    },
  },
  {
    slug: "home-benefits",
    key: "homeBenefits",
    title: "Homepage help groups",
    description: "The six cards under “One AI. Many ways to help.”",
    spec: {
      mode: "array",
      itemLabel: "Help group",
      fields: [
        { kind: "text", name: "title", label: "Title" },
        { kind: "textarea", name: "description", label: "Description", rows: 2 },
      ],
    },
  },
  {
    slug: "get-page",
    key: "getPage",
    title: "Get page",
    description: "Beta stage and invite copy on /get.",
    spec: {
      mode: "object",
      fields: [
        {
          kind: "select",
          name: "betaStage",
          label: "Beta stage",
          options: [
            { value: "invite", label: "Invite-only (ask Brandon)" },
            { value: "testflight", label: "TestFlight link is live" },
            { value: "appstore", label: "On the App Store" },
          ],
        },
        { kind: "text", name: "inviteHeadline", label: "Invite headline" },
        { kind: "textarea", name: "inviteBody", label: "Invite body", rows: 4 },
        {
          kind: "text",
          name: "testflightUrl",
          label: "TestFlight URL",
          nullable: true,
          placeholder: "https://testflight.apple.com/join/…",
          help: "Required when the stage is set to TestFlight.",
        },
        {
          kind: "text",
          name: "appStoreUrl",
          label: "App Store listing URL",
          nullable: true,
          placeholder: "https://apps.apple.com/us/app/agentkip/id…",
          help: "Required when the stage is set to App Store. Generic App Store links are rejected.",
        },
        {
          kind: "select",
          name: "nogginStage",
          label: "Noggin availability",
          options: [
            { value: "invite", label: "Repository link ships with an invite" },
            { value: "repository", label: "Public repository is available" },
          ],
        },
        {
          kind: "text",
          name: "nogginRepositoryUrl",
          label: "Public Noggin repository URL",
          nullable: true,
          placeholder: "https://github.com/owner/repository",
          help: "Required before public self-hosting instructions expose a clone command.",
        },
      ],
    },
  },
  {
    slug: "status",
    key: "siteStatus",
    title: "Site status",
    description: "The beta status pill shown in the footer and on /account.",
    spec: {
      mode: "object",
      fields: [
        { kind: "text", name: "label", label: "Status label" },
        {
          kind: "select",
          name: "tone",
          label: "Pill tone",
          options: [
            { value: "mint", label: "Mint (all good)" },
            { value: "butter", label: "Butter (heads up)" },
            { value: "peach", label: "Peach (attention)" },
          ],
        },
        {
          kind: "text",
          name: "buildNote",
          label: "Build note",
          nullable: true,
          help: "Optional short note shown with the status on /account.",
        },
      ],
    },
  },
  {
    slug: "contact",
    key: "contact",
    title: "Contact",
    description: "Contact email, blurb, and social links.",
    spec: {
      mode: "object",
      fields: [
        { kind: "text", name: "email", label: "Contact email" },
        { kind: "textarea", name: "blurb", label: "Blurb", rows: 3 },
      ],
      rowsField: {
        name: "socials",
        label: "Social links",
        itemLabel: "Social link",
        fields: [
          { kind: "text", name: "label", label: "Label", placeholder: "GitHub" },
          { kind: "text", name: "url", label: "URL", placeholder: "https://…" },
        ],
      },
    },
  },
  {
    slug: "faq",
    key: "faq",
    title: "FAQ",
    description: "Questions and answers on /faq.",
    spec: {
      mode: "array",
      itemLabel: "FAQ item",
      fields: [
        { kind: "text", name: "question", label: "Question" },
        { kind: "textarea", name: "answer", label: "Answer", rows: 4 },
      ],
    },
  },
  {
    slug: "roadmap",
    key: "roadmap",
    title: "Roadmap",
    description: "Public what's-next items on /roadmap (not-yet-shipped work).",
    spec: {
      mode: "array",
      itemLabel: "Roadmap item",
      fields: [
        { kind: "text", name: "title", label: "Title" },
        { kind: "textarea", name: "description", label: "Description", rows: 3 },
        {
          kind: "select",
          name: "status",
          label: "Status",
          options: [
            { value: "building", label: "Building" },
            { value: "planned", label: "Planned" },
            { value: "exploring", label: "Exploring" },
          ],
        },
      ],
    },
  },
  {
    slug: "changelog",
    key: "changelog",
    title: "Changelog",
    description: "Dated build notes on /changelog.",
    spec: {
      mode: "array",
      itemLabel: "Changelog entry",
      fields: [
        { kind: "text", name: "date", label: "Date", placeholder: "2026-07-11", help: "YYYY-MM-DD" },
        { kind: "text", name: "title", label: "Title" },
        { kind: "lines", name: "notes", label: "Notes", help: "One bullet per line." },
      ],
    },
  },
  {
    slug: "use-cases",
    key: "useCases",
    title: "Use cases",
    description: "The card grid on /use-cases, with fill-in-later result slots.",
    spec: {
      mode: "array",
      itemLabel: "Use case",
      fields: [
        { kind: "text", name: "title", label: "Title" },
        { kind: "textarea", name: "description", label: "Description", rows: 3 },
        { kind: "tags", name: "tags", label: "Tags", help: "Comma-separated, e.g. voice, on the go" },
        {
          kind: "textarea",
          name: "result",
          label: "Real result",
          nullable: true,
          rows: 3,
          help: "Leave empty to show the “coming soon” slot.",
        },
      ],
    },
  },
  {
    slug: "gallery",
    key: "gallery",
    title: "Gallery",
    description: "Screenshots and media on /gallery.",
    spec: {
      mode: "array",
      itemLabel: "Gallery item",
      fields: [
        { kind: "image", name: "src", label: "Image" },
        { kind: "text", name: "alt", label: "Alt text", help: "Describe the image for screen readers." },
        { kind: "text", name: "caption", label: "Caption", nullable: true },
      ],
    },
  },
];

export function findAdminSection(slug: string): AdminSection | undefined {
  return ADMIN_SECTIONS.find((section) => section.slug === slug);
}
