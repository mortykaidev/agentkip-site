import { ClerkProvider, Show, UserButton } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import localFont from "next/font/local";
import "./globals.css";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { isClerkConfigured } from "@/lib/auth";

const gugi = localFont({
  src: "../fonts/Gugi-Regular.ttf",
  variable: "--font-gugi",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://agentkip.ai"),
  title: {
    default: "AgentKip — your personal AI, on your iPhone, at home with you",
    template: "%s · AgentKip",
  },
  description:
    "An iPhone app with its brain on a small computer in your home — so your conversations stay yours.",
  openGraph: {
    siteName: "AgentKip",
    description:
      "An iPhone app with its brain on a small computer in your home — so your conversations stay yours.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    description:
      "An iPhone app with its brain on a small computer in your home — so your conversations stay yours.",
  },
};

export const viewport: Viewport = {
  themeColor: "#181918",
  width: "device-width",
  initialScale: 1,
};

/* Kip Charcoal theming for every Clerk component (sign-in, sign-up, UserButton). */
const CLERK_APPEARANCE = {
  variables: {
    colorBackground: "#30302e",
    colorPrimary: "#f88763",
    colorTextOnPrimaryBackground: "#181918",
    colorText: "#f0eee6",
    colorTextSecondary: "#c5c2b6",
    colorInputBackground: "#3a3a37",
    colorInputText: "#f0eee6",
    colorNeutral: "#f0eee6",
    colorDanger: "#ff9d7a",
    borderRadius: "10px",
  },
};

/** Nav account slot — only rendered when Clerk is configured. */
function AccountSlot() {
  return (
    <>
      <Show when="signed-in">
        <Link
          href="/account"
          className="rounded-full px-3 py-2 text-sm text-ink-secondary transition-colors hover:text-ink"
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
    <html lang="en" className={gugi.variable}>
      <body className="flex min-h-svh flex-col">
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <Nav accountSlot={clerkEnabled ? <AccountSlot /> : undefined} />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer />
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
