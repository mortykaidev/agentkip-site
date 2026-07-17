import type { Metadata } from "next";
import Link from "next/link";
import { ArrowIcon } from "@/components/launch";

export const metadata: Metadata = {
  title: "Support",
  description: "Get help with AgentKip, the beta, or connecting Kip to Noggin.",
};

const SUPPORT_EMAIL = "hello@agentkip.ai";

export default function SupportPage() {
  return (
    <div className="support-page">
      <header className="support-hero">
        <p>AgentKip support</p>
        <h1>How can we help?</h1>
        <p>
          Ask about installing the beta, using Kip, or connecting to Noggin.
        </p>
        <a href={`mailto:${SUPPORT_EMAIL}`} className="launch-primary-button">
          Email {SUPPORT_EMAIL} <ArrowIcon />
        </a>
      </header>

      <section className="support-links" aria-labelledby="support-resources-title">
        <h2 id="support-resources-title" className="sr-only">
          Support resources
        </h2>
        <SupportLink
          href="/get"
          title="Get Kip"
          body="Install the current beta or join the waitlist."
        />
        <SupportLink
          href="/docs/deploy"
          title="Noggin setup"
          body="Set up the computer that Kip connects to."
        />
        <SupportLink
          href="/faq"
          title="Quick answers"
          body="Read about cost, privacy, devices, and the beta."
        />
      </section>
    </div>
  );
}

function SupportLink({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link href={href} className="support-link">
      <span>
        <strong>{title}</strong>
        <span>{body}</span>
      </span>
      <ArrowIcon />
    </Link>
  );
}
