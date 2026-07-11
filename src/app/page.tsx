import { OrbitMark, OrbitSystem } from "@/components/brand";
import { PhoneDemo } from "@/components/demo/phone-demo";
import { WaitlistForm } from "@/components/forms/waitlist-form";
import { Reveal } from "@/components/reveal";
import {
  Kicker,
  KipButton,
  KipCard,
  Pill,
  RoadmapBadge,
  Section,
  SectionHeader,
} from "@/components/ui";
import { getContent } from "@/lib/content";

/* Homepage. Every claim below is drawn from the verified CAN-claim list —
   no agent-switching, no delegation-as-shipped, no managed cloud, no
   TestFlight availability, no provider counts. */

const FEATURES: { dotClass: string; title: string; body: string }[] = [
  {
    dotClass: "bg-mint",
    title: "Durable runs",
    body: "Streams keep going when you background the app or your connection drops. Kip recovers the run, and a watchdog catches hangs.",
  },
  {
    dotClass: "bg-sky",
    title: "Model lanes",
    body: "Quick, Everyday, Deep, Best, Code — human-friendly lanes over whatever models your server exposes. Provider-agnostic by design.",
  },
  {
    dotClass: "bg-pink",
    title: "Voice",
    body: "Dictation, push-to-talk, and background read-aloud, with an on-device voice as the fallback when your server can't speak.",
  },
  {
    dotClass: "bg-peach",
    title: "Vision & OCR",
    body: "OCR capture, receipt extraction, live document scan, and image redaction — point the camera at a page and Kip reads it.",
  },
  {
    dotClass: "bg-lilac",
    title: "Widgets & Live Activities",
    body: "7 Home Screen widgets, 2 Live Activities with Dynamic Island support, and 6 Control Center and Lock Screen controls.",
  },
  {
    dotClass: "bg-butter",
    title: "On-device Apple Intelligence",
    body: "Session titles, memory extraction, briefings, and offline drafts run on Apple's FoundationModels — private, no API cost, degrades gracefully.",
  },
  {
    dotClass: "bg-mint",
    title: "Kip Doctor",
    body: "Built-in health checks that diagnose your server connection and walk through repairs when something's off.",
  },
  {
    dotClass: "bg-sky",
    title: "Share, Siri & Spotlight",
    body: "Share into Kip from any app, ask via Siri and App Intents, find sessions in Spotlight, and hand off between devices.",
  },
];

const HOW_IT_WORKS_STEPS: { title: string; body: string }[] = [
  {
    title: "Run the server",
    body: "Set up Kai Core on a Mac, a Linux box, or Windows via Docker — with your own provider keys.",
  },
  {
    title: "Pair with a QR",
    body: "Scan a QR code from your server and the app connects over your own network or Tailscale.",
  },
  {
    title: "Talk to Kip anywhere",
    body: "Chat, dictate, or share into Kip from any app. Runs stay durable even when you lock your phone.",
  },
];

const WHY_NATIVE_POINTS: string[] = [
  "Home Screen widgets and Live Activities that show run status at a glance",
  "Siri and App Intents, Spotlight search, Handoff, and a share extension",
  "On-device Apple Intelligence that keeps working offline, privately, at no API cost",
  "Durable runs that survive backgrounding, lock screens, and flaky connections",
];

const ROADMAP_TEASER: { title: string; body: string }[] = [
  {
    title: "Claude Code & Codex delegation",
    body: "Hand long coding tasks to dedicated coding agents from your phone.",
  },
  {
    title: "Public TestFlight beta",
    body: "Today the beta is invite-only. A public TestFlight link is in the works.",
  },
  {
    title: "Managed hosting",
    body: "Self-hosting is the only option right now; a managed path is being explored.",
  },
];

export default async function HomePage() {
  const hero = await getContent("hero");

  return (
    <>
      {/* 1 — Hero */}
      <Section className="overflow-hidden pb-8 pt-14 sm:pb-16 sm:pt-24">
        <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_minmax(0,0.9fr)] lg:gap-12">
          <div>
            {hero.announcement ? (
              <Pill tone="outline" className="mb-6">
                <span className="size-1.5 rounded-full bg-mint" aria-hidden="true" />
                {hero.announcement}
              </Pill>
            ) : null}
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
              {hero.headline}
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-lg text-ink-secondary">
              {hero.subhead}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <KipButton href="/get" size="lg">
                {hero.primaryCtaLabel}
              </KipButton>
              <KipButton href="/compare" variant="secondary" size="lg">
                {hero.secondaryCtaLabel}
              </KipButton>
            </div>
          </div>
          <OrbitSystem className="mx-auto -mb-6 w-full max-w-[420px] lg:mb-0 lg:max-w-none" />
        </div>
      </Section>

      {/* 2 — Interactive simulated demo */}
      <Section id="demo" className="py-14 sm:py-24">
        <Reveal>
          <SectionHeader
            center
            kicker="Interactive demo"
            title="Watch a run, then drive it yourself"
            lead="Tap a prompt, switch model lanes, and watch a run stream in — the same rhythm as the real app."
          />
        </Reveal>
        <Reveal delay={120}>
          <div className="mt-10 sm:mt-14">
            <PhoneDemo />
          </div>
        </Reveal>
      </Section>

      {/* 3 — Feature grid */}
      <Section className="py-14 sm:py-24">
        <div className="relative">
          <OrbitMark
            size={72}
            drift
            className="absolute -top-8 right-0 hidden opacity-60 md:block"
          />
          <Reveal>
            <SectionHeader
              kicker="What ships today"
              title="A real agent surface, not a chat wrapper"
              lead="Everything below is in the app right now — verified against the code, not the wishlist."
            />
          </Reveal>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, index) => (
            <Reveal key={feature.title} delay={index * 60}>
              <KipCard className="h-full">
                <span
                  className={`inline-block size-2.5 rounded-full ${feature.dotClass}`}
                  aria-hidden="true"
                />
                <h3 className="mt-3 text-[15px] font-semibold">{feature.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">
                  {feature.body}
                </p>
              </KipCard>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* 4 — How it works */}
      <Section className="py-14 sm:py-24">
        <Reveal>
          <SectionHeader
            center
            kicker="How it works"
            title="Your iPhone. Your server. Nothing in between."
            lead="Kip is the native client; Kai Core is the agent server you run on hardware you own."
          />
        </Reveal>
        <Reveal delay={100}>
          <div className="kip-card mt-10 p-6 sm:p-10">
            <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
              <div className="rounded-[14px] border border-hairline bg-elevated p-5 text-center sm:flex-1">
                <p className="text-sm font-semibold">Kip on your iPhone</p>
                <p className="mt-1 text-[13px] text-ink-muted">Native iOS app</p>
              </div>

              {/* Encrypted tunnel connector */}
              <div className="flex items-center gap-3 self-center sm:flex-1 sm:flex-col sm:gap-1.5 sm:self-auto">
                <svg
                  viewBox="0 0 120 24"
                  className="hidden h-6 w-full sm:block"
                  aria-hidden="true"
                >
                  <line
                    x1="4"
                    y1="12"
                    x2="116"
                    y2="12"
                    stroke="var(--accent)"
                    strokeWidth="2"
                    strokeDasharray="6 6"
                    strokeLinecap="round"
                  />
                  <path d="M 12 6 L 4 12 L 12 18" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M 108 6 L 116 12 L 108 18" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <svg viewBox="0 0 24 44" className="h-10 w-5 sm:hidden" aria-hidden="true">
                  <line
                    x1="12"
                    y1="4"
                    x2="12"
                    y2="40"
                    stroke="var(--accent)"
                    strokeWidth="2"
                    strokeDasharray="5 5"
                    strokeLinecap="round"
                  />
                </svg>
                <p className="text-[12px] font-medium text-ink-muted sm:text-center">
                  Encrypted tunnel
                  <span className="block text-[11px]">Tailscale or your own network</span>
                </p>
              </div>

              <div className="rounded-[14px] border border-hairline bg-elevated p-5 text-center sm:flex-1">
                <p className="text-sm font-semibold">Your server — Kai Core</p>
                <p className="mt-1 text-[13px] text-ink-muted">
                  Your models · your keys · your data
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-5 border-t border-hairline pt-8 sm:grid-cols-3">
              {HOW_IT_WORKS_STEPS.map((step, index) => (
                <div key={step.title} className="flex gap-3.5">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-elevated text-[13px] font-semibold text-ink-secondary">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-[15px] font-semibold">{step.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
                      {step.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </Section>

      {/* 5 — Why native (capability-first, no competitor names) */}
      <Section className="py-14 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <SectionHeader
              kicker="Why a native app"
              title="Some things only a real iOS app can do"
              lead="A web view can't sit on your Home Screen, show a Live Activity, or keep thinking when the screen locks. Kip can."
            />
            <p className="mt-6">
              <a
                href="/compare"
                className="text-[15px] font-semibold text-accent hover:brightness-110"
              >
                See the detailed comparison →
              </a>
            </p>
          </Reveal>
          <div className="space-y-3">
            {WHY_NATIVE_POINTS.map((point, index) => (
              <Reveal key={point} delay={index * 70}>
                <div className="kip-card flex items-start gap-3 p-4">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                  <p className="text-[15px] leading-relaxed text-ink-secondary">{point}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </Section>

      {/* 6 — Roadmap teaser */}
      <Section className="py-14 sm:py-24">
        <Reveal>
          <SectionHeader
            kicker="What's next"
            title="Honest about what isn't built yet"
            lead="These aren't in the app today. They're what's being worked toward."
          />
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {ROADMAP_TEASER.map((item, index) => (
            <Reveal key={item.title} delay={index * 80}>
              <KipCard className="h-full">
                <RoadmapBadge />
                <h3 className="mt-4 text-[15px] font-semibold">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">
                  {item.body}
                </p>
              </KipCard>
            </Reveal>
          ))}
        </div>
        <Reveal delay={260}>
          <p className="mt-8">
            <a
              href="/roadmap"
              className="text-[15px] font-semibold text-accent hover:brightness-110"
            >
              See the full roadmap →
            </a>
          </p>
        </Reveal>
      </Section>

      {/* 7 — Final CTA */}
      <Section className="pb-24 pt-10 sm:pb-32 sm:pt-16">
        <Reveal>
          <div className="kip-card relative overflow-hidden px-6 py-14 text-center sm:py-20">
            <OrbitMark
              size={56}
              className="absolute left-6 top-6 opacity-50 sm:left-10 sm:top-10"
            />
            <Kicker>Private beta</Kicker>
            <h2 className="mx-auto mt-3 max-w-xl text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
              Get Kip
            </h2>
            <p className="mx-auto mt-4 max-w-md text-pretty text-lg text-ink-secondary">
              One link for the app and the server quickstart — or join the waitlist and
              we&apos;ll ping you when a spot opens.
            </p>
            <div className="mt-8">
              <KipButton href="/get" size="lg">
                Get Kip
              </KipButton>
            </div>
            <div className="mx-auto mt-10 max-w-md">
              <WaitlistForm />
            </div>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
