import type { Metadata } from "next";
import Link from "next/link";
import { Kicker, KipCard, Pill, Section, SectionHeader } from "@/components/ui";
import { StatusGlyph } from "@/components/brand";
import { Reveal } from "@/components/reveal";

export const metadata: Metadata = {
  title: "Security",
  description:
    "How AgentKip handles your keys, your data, and your server — including the honest parts: what’s solid today, what the real risks are, and how to mitigate them.",
};

/* ---------------------------------------------------------------------------
   The honest security page. Plain language, no spin. Two lists:
   what's genuinely solid today (mint) and what we disclose openly (butter),
   each disclosure paired with its mitigation. Facts verified against the
   noggin / agentkip-ios codebases per the approved plan.
--------------------------------------------------------------------------- */

const SOLID_TODAY: { title: string; body: string }[] = [
  {
    title: "Provider API keys never touch the phone",
    body: "Your OpenAI / Anthropic / other provider keys live in your server’s environment. The iOS app never sees, stores, or transmits them — it only talks to your server.",
  },
  {
    title: "Every endpoint requires a bearer token",
    body: "There are no unauthenticated API endpoints. The server checks the token on every request using a constant-time comparison, which avoids timing side-channels.",
  },
  {
    title: "The server refuses to start with a weak key",
    body: "If the server API key is missing or shorter than 16 characters, the server will not boot. We treat a guessable key as remote code execution waiting to happen — so it’s a hard stop, not a warning.",
  },
  {
    title: "Pairing token lives in the iOS Keychain",
    body: "On the phone, the token is stored in the Keychain with device-only accessibility. It is not synced to iCloud and doesn’t leave the device.",
  },
  {
    title: "HTTPS enforced for remote hosts",
    body: "The app requires HTTPS when connecting to a server outside your trusted local ranges. The blessed setup for testers routes traffic through the agentkip.app relay (Cloudflare Tunnel); self-hosters can use Tailscale (WireGuard) directly instead.",
  },
  {
    title: "Honest capability gating",
    body: "The app only shows features your server actually supports. No dead buttons pretending capabilities exist — what you see is what your setup can do.",
  },
];

const HONEST_ABOUT: { title: string; body: string; mitigation: React.ReactNode }[] = [
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
    title: "Today’s pairing token is the server’s long-lived key",
    body: "When you pair by QR code, the phone receives the server’s own long-lived API key. There is no per-device token yet, and no automatic expiry — if it leaks, rotation is manual.",
    mitigation: (
      <>
        Treat the QR code like a password: don’t screenshot or share it. If you suspect a leak,
        rotate the key on the server and re-pair. Per-device expiring tokens are on the roadmap.
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
    title: "Provider keys sit in a plaintext env file on the host",
    body: "Like most self-hosted software, your provider API keys are stored in a plaintext environment file on the server. Standard practice — but you should know it.",
    mitigation: (
      <>
        Protect the host: enable full-disk encryption, keep the machine patched, and restrict who
        can log in. Anyone with access to that box has access to those keys.
      </>
    ),
  },
];

const WEBSITE_DATA: { label: string; detail: string }[] = [
  {
    label: "No analytics or tracking in the app",
    detail: "The iOS app contains no analytics SDK, no tracking pixels, no telemetry phoning home.",
  },
  {
    label: "The website collects only what you give it",
    detail: "Sign-in (handled by Clerk — we never see your credentials), a waitlist email if you join, and contact messages if you send one. That’s the list.",
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
            title="Honest by default"
            lead="Three principles drive every decision here: your keys and conversations live on your server, not ours. The app is a thin client — it holds a pairing token and nothing else sensitive. And when there’s a real risk, we’d rather disclose it plainly than polish over it."
          />
        </Reveal>
      </Section>

      {/* Architecture diagram */}
      <Section className="mt-14">
        <Reveal>
          <Kicker className="mb-5">The shape of the system</Kicker>
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
                  <li>Thin native client — no provider keys, ever</li>
                  <li>Pairing token in the iOS Keychain</li>
                  <li>Device-only accessibility, not iCloud-synced</li>
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
                  Traffic rides an encrypted tunnel between your phone and your server. Nothing
                  passes through our infrastructure — there is no middle.
                </p>
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
                  <h3 className="font-semibold">Your server</h3>
                </div>
                <ul className="mt-3 space-y-2 text-sm text-ink-secondary">
                  <li>Bearer-token auth on every endpoint</li>
                  <li>Provider API keys in the server environment</li>
                  <li>Conversations and memory stored here, on your disk</li>
                </ul>
              </div>
            </div>
          </KipCard>
        </Reveal>
      </Section>

      {/* What's solid today */}
      <Section className="mt-20">
        <Reveal>
          <SectionHeader
            kicker="What’s solid today"
            title="The parts we’re confident in"
            lead="These are shipped and verifiable in the code, not aspirations."
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
                      Solid
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

      {/* What we're honest about */}
      <Section className="mt-20">
        <Reveal>
          <SectionHeader
            kicker="What we’re honest about"
            title="The risks, in plain language"
            lead="Every self-hosted agent has these tradeoffs. Here are ours, each with the mitigation we actually recommend — because you’d find them anyway, and you should hear them from us first."
          />
        </Reveal>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {HONEST_ABOUT.map((item, i) => (
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
            title="What we collect (short list)"
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
                If you’ve discovered a vulnerability or a claim on this page that doesn’t hold up,
                tell us. Security reports get a security-first response — read, taken seriously,
                and answered.
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
