import type { Metadata } from "next";
import Link from "next/link";
import { Kicker, KipCard, Pill, Section, SectionHeader } from "@/components/ui";
import { StatusGlyph } from "@/components/brand";
import { Reveal } from "@/components/reveal";
import { TAILSCALE_LINKS } from "@/lib/tailscale-links";

export const metadata: Metadata = {
  title: "Security",
  description:
    "How AgentKip protects device connections, saved chats, AI keys, and the computer running Noggin.",
};

/* ---------------------------------------------------------------------------
   Plain-language security page. Two lists: shipped controls (mint) and known
   risks (butter), each risk paired with a mitigation. Facts verified against the
   noggin / agentkip-ios codebases per the approved plan.
--------------------------------------------------------------------------- */

const SOLID_TODAY: { title: string; body: string }[] = [
  {
    title: "AI keys stay off iPhone",
    body: "OpenAI, Anthropic, and other AI keys stay with Noggin. The iPhone app uses its own device credentials to talk to Noggin.",
  },
  {
    title: "Each device gets credentials",
    body: "Secure pairing gives each iPhone its own access and refresh credentials instead of copying one shared server key.",
  },
  {
    title: "Credentials rotate",
    body: "Refresh credentials are single-use and replaced as the connection renews, which limits reuse of an older token.",
  },
  {
    title: "Secrets stay in Keychain",
    body: "The device identity and connection credentials use device-only iOS Keychain storage and do not sync through iCloud.",
  },
  {
    title: "Remote links require HTTPS",
    body: "Kip rejects plain HTTP for remote addresses. Testers can use the agentkip.app relay, while self-hosters can use Tailscale.",
  },
  {
    title: "Revocation fails closed",
    body: "When Noggin rejects a revoked device, Kip removes the active credentials and requires a fresh pairing code.",
  },
];

const KNOWN_RISKS: { title: string; body: string; mitigation: React.ReactNode }[] = [
  {
    title: "The agent can run shell commands on its host",
    body: "That’s the point of an agent — and it’s also the biggest risk. By default, the operating system is the security boundary between the agent and everything else on that machine.",
    mitigation: (
      <>
        Run the server in Docker or gVisor, or on a dedicated machine that holds nothing you can’t
        afford to expose. Our{" "}
        <Link href="/docs/deploy" className="text-accent hover:underline">
          deploy guide
        </Link>{" "}
        walks through the isolated setups.
      </>
    ),
  },
  {
    title: "A paired phone is trusted",
    body: "A paired iPhone can ask Noggin to do work until that device is removed or its credentials are revoked.",
    mitigation: (
      <>
        Protect the pairing code and your iPhone. If a phone is lost or a connection looks wrong,
        revoke that device and pair again with a fresh code.
      </>
    ),
  },
  {
    title: "Plain-HTTP pairing is allowed on trusted local ranges",
    body: "The app technically permits pairing over plain HTTP on localhost, LAN, and Tailscale address ranges. On a network you don’t control, that would expose your token in transit.",
    mitigation: (
      <>
        Use the agentkip.app relay or Tailscale — either way, everything, pairing included, rides
        an encrypted tunnel regardless. Never pair over plain HTTP on a network you don’t trust.
      </>
    ),
  },
  {
    title: "Host access can expose keys",
    body: "Anyone with administrator access to the computer running Noggin may be able to read its AI keys and saved data.",
    mitigation: (
      <>
        Protect the host: enable full-disk encryption, keep the machine patched, and restrict who
        can log in. Keep unrelated personal files off a machine you use for agent work.
      </>
    ),
  },
];

const WEBSITE_DATA: { label: string; detail: string }[] = [
  {
    label: "No advertising analytics",
    detail: "The iOS app has no third-party advertising analytics SDK. Its usage view is built from your saved sessions.",
  },
  {
    label: "The website collects only what you give it",
    detail: "The site stores sign-in details through Clerk, a waitlist email if you join, and contact messages you send.",
  },
];

export default function SecurityPage() {
  return (
    <div className="py-16 sm:py-24">
      {/* Principles */}
      <Section>
        <Reveal>
          <SectionHeader
            kicker="Security"
            title="Security, without the maze"
            lead="Your iPhone stores device credentials. Noggin stores chats and AI keys. Online AI companies still receive requests sent to their models."
          />
        </Reveal>
      </Section>

      {/* Architecture diagram */}
      <Section className="mt-14">
        <Reveal>
          <Kicker className="mb-5">How data moves</Kicker>
        </Reveal>
        <Reveal>
          <KipCard className="p-6 sm:p-8">
            <div className="flex flex-col items-stretch gap-4 lg:flex-row lg:items-stretch">
              {/* iPhone */}
              <div className="flex-1 rounded-[10px] border border-hairline bg-elevated p-5">
                <div className="flex items-center gap-3">
                  <StatusGlyph state="idle" size={28} />
                  <h3 className="font-semibold">Your iPhone</h3>
                </div>
                <ul className="mt-3 space-y-2 text-sm text-ink-secondary">
                  <li>No AI company keys</li>
                  <li>Per-device connection credentials</li>
                  <li>Device-only iOS Keychain storage</li>
                </ul>
              </div>

              {/* Tunnel */}
              <div
                className="flex items-center justify-center gap-2 px-2 py-1 lg:flex-col lg:py-0"
                aria-hidden="true"
              >
                <span className="text-2xl text-ink-muted lg:hidden">↕</span>
                <span className="hidden text-2xl text-ink-muted lg:block">⇄</span>
              </div>
              <div className="flex flex-1 flex-col justify-center rounded-[10px] border border-dashed border-hairline-strong p-5 text-center">
                <Pill tone="mint" className="mx-auto">
                  TLS · agentkip.app relay / Tailscale
                </Pill>
                <p className="mt-3 text-sm text-ink-secondary">
                  Remote setups use an encrypted connection. The path depends on whether you use
                  the agentkip.app relay or Tailscale.
                </p>
                <a
                  href={TAILSCALE_LINKS.serve}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex text-sm font-semibold text-accent underline underline-offset-4 hover:text-ink"
                >
                  Tailscale Serve guide
                </a>
              </div>
              <div
                className="flex items-center justify-center gap-2 px-2 py-1 lg:flex-col lg:py-0"
                aria-hidden="true"
              >
                <span className="text-2xl text-ink-muted lg:hidden">↕</span>
                <span className="hidden text-2xl text-ink-muted lg:block">⇄</span>
              </div>

              {/* Server */}
              <div className="flex-1 rounded-[10px] border border-hairline bg-elevated p-5">
                <div className="flex items-center gap-3">
                  <StatusGlyph state="working" size={28} />
                  <h3 className="font-semibold">Your Noggin</h3>
                </div>
                <ul className="mt-3 space-y-2 text-sm text-ink-secondary">
                  <li>Checks paired-device credentials</li>
                  <li>Stores AI keys for online models</li>
                  <li>Saves conversations and memory</li>
                </ul>
              </div>
            </div>
          </KipCard>
        </Reveal>
      </Section>

      {/* Shipped controls */}
      <Section className="mt-20">
        <Reveal>
          <SectionHeader
            kicker="Shipped controls"
            title="What protects you today"
            lead="These controls are present in the current app and Noggin connection flow."
          />
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SOLID_TODAY.map((item, i) => (
            <Reveal key={item.title} delay={(i % 3) * 60}>
              <KipCard className="h-full">
                <div className="flex items-start gap-3">
                  <StatusGlyph state="done" size={26} className="mt-0.5 shrink-0" />
                  <div>
                    <Pill tone="mint" className="mb-2">
                      Built
                    </Pill>
                    <h3 className="font-semibold leading-snug">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{item.body}</p>
                  </div>
                </div>
              </KipCard>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Known risks */}
      <Section className="mt-20">
        <Reveal>
          <SectionHeader
            kicker="Known risks"
            title="What still needs care"
            lead="Running an agent on your own computer gives it useful power and creates responsibilities."
          />
        </Reveal>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {KNOWN_RISKS.map((item, i) => (
            <Reveal key={item.title} delay={(i % 2) * 60}>
              <KipCard className="h-full">
                <Pill tone="butter" className="mb-3">
                  Disclosure
                </Pill>
                <h3 className="font-semibold leading-snug">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{item.body}</p>
                <div className="mt-4 rounded-[10px] border border-hairline bg-elevated p-4">
                  <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-muted">
                    Mitigation
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">
                    {item.mitigation}
                  </p>
                </div>
              </KipCard>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Data */}
      <Section className="mt-20">
        <Reveal>
          <SectionHeader
            kicker="Your data"
            title="What the site collects"
          />
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {WEBSITE_DATA.map((item, i) => (
            <Reveal key={item.label} delay={i * 60}>
              <KipCard className="h-full">
                <h3 className="font-semibold leading-snug">{item.label}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{item.detail}</p>
              </KipCard>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-4">
          <p className="text-sm text-ink-secondary">
            The full details live in our{" "}
            <Link href="/privacy" className="text-accent hover:underline">
              privacy policy
            </Link>
            .
          </p>
        </Reveal>
      </Section>

      {/* Disclosure invite */}
      <Section className="mt-16">
        <Reveal>
          <KipCard className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold">Found something?</h3>
              <p className="mt-1 text-sm text-ink-secondary">
                If you found a security problem or an outdated claim, tell Brandon so it can be
                checked and fixed.
              </p>
            </div>
            <Link
              href="/contact"
              className="kip-press inline-flex shrink-0 items-center justify-center rounded-[14px] bg-accent px-5 py-3 text-[15px] font-semibold text-on-accent hover:brightness-105"
            >
              Report it
            </Link>
          </KipCard>
        </Reveal>
      </Section>
    </div>
  );
}
