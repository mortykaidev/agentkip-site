import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://agentkip.ai";

const ROUTES = [
  "/",
  "/get",
  "/docs/deploy",
  "/ios",
  "/compare",
  "/security",
  "/use-cases",
  "/faq",
  "/roadmap",
  "/changelog",
  "/gallery",
  "/kip",
  "/contact",
  "/privacy",
  "/terms",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return ROUTES.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified,
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : 0.6,
  }));
}
