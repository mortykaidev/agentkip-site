/* Editable-content contract. The admin panel edits these; pages render them.
   Every section reads DB-first with the seeded defaults as fallback. */

export type HeroContent = {
  announcement: string | null;
  headline: string;
  subhead: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
};

export type HomeBenefit = {
  title: string;
  description: string;
};

export type GetPageContent = {
  /** A stage can only be promoted when its matching verified destination is present. */
  betaStage: "invite" | "testflight" | "appstore";
  inviteHeadline: string;
  inviteBody: string;
  testflightUrl: string | null;
  appStoreUrl: string | null;
  nogginStage: "invite" | "repository";
  nogginRepositoryUrl: string | null;
};

export type SiteStatus = {
  label: string;
  tone: "mint" | "butter" | "peach";
  buildNote: string | null;
};

export type ContactContent = {
  email: string;
  blurb: string;
  socials: { label: string; url: string }[];
};

export type FaqItem = { question: string; answer: string };

export type RoadmapItem = {
  title: string;
  description: string;
  status: "building" | "planned" | "exploring";
};

export type ChangelogEntry = {
  /** ISO date YYYY-MM-DD */
  date: string;
  title: string;
  notes: string[];
};

export type UseCase = {
  title: string;
  description: string;
  tags: string[];
  /** Filled in later with real run results; null renders a "coming soon" slot */
  result: string | null;
};

export type GalleryItem = {
  src: string;
  alt: string;
  caption: string | null;
};

export type ContentMap = {
  hero: HeroContent;
  homeBenefits: HomeBenefit[];
  getPage: GetPageContent;
  siteStatus: SiteStatus;
  contact: ContactContent;
  faq: FaqItem[];
  roadmap: RoadmapItem[];
  changelog: ChangelogEntry[];
  useCases: UseCase[];
  gallery: GalleryItem[];
};

export type ContentKey = keyof ContentMap;
