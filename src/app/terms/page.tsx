import type { Metadata } from "next";
import { Section, SectionHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms for using AgentKip during its beta.",
};

export default function TermsPage() {
  return (
    <Section className="py-16 sm:py-24">
      <SectionHeader kicker="Legal" title="Terms of Service" lead="Effective July 11, 2026." />

      <div className="mt-10 max-w-2xl space-y-10 text-[15px] leading-relaxed text-ink-secondary">
        <p>
          These are the terms for using AgentKip (&ldquo;Kip&rdquo;) — the website, and the beta
          version of the app. By using either, you&apos;re agreeing to what&apos;s below.
        </p>

        <section>
          <h2 className="text-xl font-semibold text-ink">Beta software</h2>
          <p className="mt-3">
            Kip is beta software. Features can change, break, or disappear without notice. It is
            not intended for mission-critical or production use — treat it as something you&apos;re
            trying out, not something you depend on.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-ink">Personal use only</h2>
          <p className="mt-3">
            The beta is for personal, non-commercial use. Access is invite-only or via waitlist,
            and invites are not transferable.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-ink">Your responsibilities</h2>
          <p className="mt-3">
            Kip runs on infrastructure you control. That means you&apos;re responsible for:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Setting up, securing, and maintaining your own server</li>
            <li>Your own accounts and API keys with whatever model providers you choose</li>
            <li>Complying with those providers&apos; own terms of service and usage policies</li>
            <li>Any costs you incur from your provider usage — Kip does not bill you for it</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-ink">Acceptable use</h2>
          <p className="mt-3">
            Don&apos;t use Kip to break the law, abuse the service, attempt to disrupt or gain
            unauthorized access to systems that aren&apos;t your own, or interfere with other
            users&apos; access to the beta.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-ink">No warranty</h2>
          <p className="mt-3">
            Kip is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without warranties of
            any kind, express or implied — including fitness for a particular purpose, accuracy,
            or reliability. Beta software has bugs; use accordingly.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-ink">Limitation of liability</h2>
          <p className="mt-3">
            To the maximum extent permitted by law, AgentKip and its creator are not liable for
            any indirect, incidental, or consequential damages arising from your use of the
            website or the app, including any costs incurred with third-party model providers or
            any loss of data stored on your own server.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-ink">Changes</h2>
          <p className="mt-3">
            We may update the service or these terms as the beta evolves. Material changes will be
            reflected here with an updated effective date.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-ink">Governing law</h2>
          <p className="mt-3">
            These terms are governed by the laws of the State of New York, USA, without regard to
            conflict-of-law principles.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-ink">Contact</h2>
          <p className="mt-3">
            Questions about these terms — reach out at{" "}
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
