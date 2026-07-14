import { ClerkProvider, Show, UserButton } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import Script from "next/script";
import "./globals.css";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Pill } from "@/components/ui";
import { isClerkConfigured } from "@/lib/auth";
import { getContent } from "@/lib/content";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://agentkip.ai"),
  title: {
    default: "AgentKip — your personal AI agent, on your iPhone, on your server",
    template: "%s · AgentKip",
  },
  description:
    "AgentKip (Kip) is a native iOS client for a personal AI agent server you host yourself. Durable streaming runs, model switching, voice, widgets, Live Activities, and on-device Apple Intelligence — with your data on your hardware.",
  openGraph: {
    siteName: "AgentKip",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
  alternates: {
    canonical: "/",
  },
};

export const viewport: Viewport = {
  themeColor: "#262624",
  width: "device-width",
  initialScale: 1,
};

/* Kip Charcoal theming for every Clerk component (sign-in, sign-up, UserButton). */
const CLERK_APPEARANCE = {
  variables: {
    colorBackground: "#30302e",
    colorPrimary: "#7fd8b1",
    colorTextOnPrimaryBackground: "#14211b",
    colorText: "#f0eee6",
    colorTextSecondary: "#c5c2b6",
    colorInputBackground: "#3a3a37",
    colorInputText: "#f0eee6",
    colorNeutral: "#f0eee6",
    colorDanger: "#ff9d7a",
    borderRadius: "10px",
  },
};

/** Beta status pill for the footer — reads the admin-editable siteStatus section. */
async function StatusPill() {
  const status = await getContent("siteStatus");
  return <Pill tone={status.tone}>{status.label}</Pill>;
}

/** Nav account slot — only rendered when Clerk is configured. */
function AccountSlot() {
  return (
    <>
      <Show when="signed-in">
        <Link
          href="/account"
          className="hidden rounded-full px-3 py-2 text-sm text-ink-secondary transition-colors hover:text-ink sm:block"
        >
          Account
        </Link>
        <UserButton />
      </Show>
      <Show when="signed-out">
        <Link
          href="/sign-in"
          className="rounded-full px-3 py-2 text-sm text-ink-secondary transition-colors hover:text-ink"
        >
          Sign in
        </Link>
      </Show>
    </>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const clerkEnabled = isClerkConfigured();

  const page = (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply persisted theme before first paint to avoid flash */}
        <Script id="kip-theme-init" strategy="beforeInteractive">
          {`try{if(localStorage.getItem("kip-theme")==="light")document.documentElement.setAttribute("data-theme","light")}catch(e){}`}
        </Script>
      </head>
      <body className="flex min-h-svh flex-col">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-5 focus:top-5 focus:z-[100] focus:rounded bg-sky px-4 py-2 font-semibold text-[#101c26]">
          Skip to content
        </a>
        <Nav accountSlot={clerkEnabled ? <AccountSlot /> : undefined} />
        <main id="main-content" className="flex-1">{children}</main>
        <Footer statusSlot={<StatusPill />} />
      </body>
    </html>
  );

  /* ClerkProvider only when keys exist — the site runs sign-in-less without them. */
  return clerkEnabled ? (
    <ClerkProvider appearance={CLERK_APPEARANCE}>{page}</ClerkProvider>
  ) : (
    page
  );
}
