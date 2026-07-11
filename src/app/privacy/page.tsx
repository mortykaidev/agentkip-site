import type { Metadata } from "next";
import { Section, SectionHeader, KipCard } from "@/components/ui";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How agentkip.ai and the Kip app handle your data — in plain language.",
};

export default function PrivacyPage() {
  return (
    <Section className="py-16 sm:py-24">
      <SectionHeader kicker="Legal" title="Privacy Policy" lead="Effective July 11, 2026." />

      <div className="mt-10 max-w-2xl space-y-10 text-[15px] leading-relaxed text-ink-secondary">
        <p>
          AgentKip is unusual as privacy policies go, because most of what you&apos;d normally worry
          about — your conversations, your files, your memory — never touches anything we run. This
          page splits cleanly into two parts: the <strong className="text-ink">website</strong> you&apos;re
          reading right now, and the <strong className="text-ink">app</strong> running on your own
          server. They handle data very differently.
        </p>

        <section>
          <h2 className="text-xl font-semibold text-ink">What the website collects</h2>
          <p className="mt-3">
            When you sign in, we use Clerk as our authentication processor — it handles your
            account (name, email, and avatar from whichever provider you use to sign in) so we
            never see or store a password ourselves. If you join the waitlist, we store the email
            you give us. If you send a message through the contact form, we store the message and
            the email address you provide so we can reply.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-ink">What the website does not collect</h2>
          <p className="mt-3">
            No ad trackers, no third-party analytics pixels, no cross-site tracking. We&apos;re not
            selling or renting anything about you to anyone.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-ink">Cookies</h2>
          <p className="mt-3">
            The website sets cookies for two things only: keeping you signed in (via Clerk) and
            remembering your light/dark theme preference. Nothing else.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-ink">Hosting and processors</h2>
          <p className="mt-3">
            The website is hosted on Vercel. Authentication runs through Clerk. Both process data
            on our behalf under their own privacy and security commitments; neither one gets
            access to anything happening inside the app on your server.
          </p>
        </section>

        <section>
          <KipCard className="not-prose">
            <h2 className="text-xl font-semibold text-ink">The app is different</h2>
            <p className="mt-3">
              Kip is a self-hosted personal AI agent. Your conversations, your memory, and your
              files live on a server that you run and control — a Mac, a Linux box, a Windows
              machine, or a VPS you set up. The AgentKip project has no access to any of it.
            </p>
            <p className="mt-3">
              When you send a message, your server talks directly to the model provider you
              configured (OpenAI, Anthropic, a local Ollama model, or whatever you chose), using an
              API key that only you hold. We never see those prompts, those responses, or that key.
            </p>
          </KipCard>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-ink">Data retention and deletion</h2>
          <p className="mt-3">
            You can ask us to delete your account information, waitlist entry, or contact messages
            at any time by emailing{" "}
            <a href="mailto:hello@agentkip.ai" className="font-semibold text-accent">
              hello@agentkip.ai
            </a>
            . Data that lives on your own server is entirely under your control — delete it the
            same way you&apos;d delete anything else on your machine.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-ink">Children&apos;s privacy</h2>
          <p className="mt-3">
            AgentKip isn&apos;t directed at children, and we don&apos;t knowingly collect information
            from anyone under 13.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-ink">Changes to this policy</h2>
          <p className="mt-3">
            If this policy changes in a meaningful way, we&apos;ll update the effective date above
            and note it in the changelog.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-ink">Contact</h2>
          <p className="mt-3">
            Questions about any of this — reach out at{" "}
            <a href="mailto:hello@agentkip.ai" className="font-semibold text-accent">
              hello@agentkip.ai
            </a>
            .
          </p>
        </section>
      </div>
    </Section>
  );
}
