import type { Metadata } from "next";
import Link from "next/link";
import { ArrowIcon } from "@/components/launch";

export const metadata: Metadata = {
  title: "Support",
  description: "Contact AgentKip support and find setup resources.",
};

const SUPPORT_EMAIL = "hello@agentkip.ai";

export default function SupportPage() {
  return (
    <div className="support-page">
      <header className="support-hero">
        <p>AgentKip support</p>
        <h1>How can we help?</h1>
        <p>
          For an install question, beta issue, or a problem connecting Kip to Noggin, email us at
          the address below.
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
          title="Install or join the beta"
          body="See the current verified iPhone release destination."
        />
        <SupportLink
          href="/docs/deploy"
          title="Noggin setup"
          body="Read the available self-hosting documentation."
        />
        <SupportLink
          href="/faq"
          title="Common questions"
          body="Browse current product and availability answers."
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
