import type { NextConfig } from "next";

// The canonical marketing origin is agentkip.ai. The .app and .io domains are
// pointed at the same Vercel project and permanently redirect to the apex so
// there is one canonical URL for SEO/OG. (.dev is reserved for dev servers and
// is intentionally NOT redirected here.)
const REDIRECT_HOSTS = ["agentkip.app", "www.agentkip.app", "agentkip.io", "www.agentkip.io"];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Vercel Blob public store (gallery uploads)
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
  async redirects() {
    return REDIRECT_HOSTS.map((host) => ({
      source: "/:path*",
      has: [{ type: "host", value: host }],
      destination: "https://agentkip.ai/:path*",
      permanent: true,
    }));
  },
};

export default nextConfig;
