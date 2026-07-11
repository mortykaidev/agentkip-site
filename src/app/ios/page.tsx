import type { Metadata } from "next";
import { KipCard, Kicker, Pill, Section, SectionHeader } from "@/components/ui";
import { Reveal } from "@/components/reveal";
import { KipIcon } from "@/components/brand";
import {
  ControlChip,
  DynamicIslandMock,
  LockScreenGlyph,
  LockScreenRow,
  ShareSheetMock,
  WidgetTile,
} from "@/app/ios/mocks";

export const metadata: Metadata = {
  title: "iOS 27 features",
  description:
    "Widgets, Live Activities, Dynamic Island, Control Center controls, Siri, Spotlight, Handoff, on-device Apple Intelligence, and Liquid Glass — what Kip does with iOS 27.",
};

const WIDGETS = [
  { name: "Today with Kip", description: "Connection status, active or last run, next automation, today's cost.", glyph: "idle" as const },
  { name: "Active Run", description: "Is Kip working right now — phase and elapsed time, or idle and ready.", glyph: "working" as const },
  { name: "Ask Kip", description: "Three one-tap targets: new chat, voice, or continue where you left off.", glyph: "thinking" as const },
  { name: "Kip Meter", description: "Today's tokens in/out, tool calls, and estimated cost.", glyph: "done" as const },
  { name: "Next Automation", description: "Your next scheduled job, a countdown, and how the last one went.", glyph: "sleeping" as const },
  { name: "Context Gauge", description: "How full the current conversation's context window is, at a glance.", glyph: "idle" as const },
  { name: "Gateway Health", description: "Server status, gateway name, version and uptime, queued runs.", glyph: "done" as const },
];

const CONTROLS = [
  { label: "Ask Kip", detail: "Opens Kip and starts dictating." },
  { label: "New Kip Chat", detail: "Jumps straight into a fresh conversation." },
  { label: "Stop Kip Run", detail: "Cancels a running task in the background." },
  { label: "Kip Quiet Mode", detail: "Real toggle — mutes notifications app-wide.", toggled: true, tone: "mint" as const },
  { label: "Kip Offline Mode", detail: "Real toggle — pauses all calls to your server.", toggled: false, tone: "peach" as const },
  { label: "Start Focus Sprint", detail: "Opens Kip into the Focus time-budget picker." },
];

const SHORTCUTS = [
  "Ask Kip",
  "New Chat",
  "Continue Chat",
  "Voice Chat",
  "Stop Kip",
  "Run Briefing",
  "Quick Capture",
  "Run Doctor",
];

const FOUNDATION_MODELS_FEATURES = [
  { title: "Session titles", body: "Generates a short title for a new conversation on-device, so your chat list stays readable." },
  { title: "Memory extraction", body: "Suggests durable facts worth remembering from a transcript — always shown to you for confirmation before anything is saved." },
  { title: "Morning briefing lines", body: "Turns your overnight activity into a plain-English summary line, generated locally." },
  { title: "Next-move suggestions", body: "Proposes a reasonable next step in a conversation, as a tappable chip — never auto-sent." },
  { title: "Offline drafts", body: "Drafts a rough reply on-device when your server is unreachable, so you're not stuck with a blank box." },
];

export default function IosFeaturesPage() {
  return (
    <>
      <Section className="pt-14 pb-10 sm:pt-20">
        <Reveal>
          <Kicker>iOS 27</Kicker>
          <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Built for iOS 27, not bolted onto it
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-secondary text-pretty">
            Kip is a native SwiftUI app, so it gets to use the real platform: widgets that read
            your actual run state, a Dynamic Island that tracks a live task, Control Center
            toggles that do something, and on-device intelligence that never leaves your phone.
          </p>
        </Reveal>
      </Section>

      {/* Widgets */}
      <Section className="py-10">
        <Reveal>
          <SectionHeader
            kicker="Home & Lock Screen"
            title="7 widgets, always reading live state"
            lead="No mock data — every widget pulls from a shared snapshot the app keeps up to date, so what you see on your Home Screen matches what's actually happening on your server."
          />
        </Reveal>
        <Reveal delay={80}>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {WIDGETS.map((widget) => (
              <WidgetTile key={widget.name} {...widget} />
            ))}
          </div>
        </Reveal>
      </Section>

      {/* Live Activities / Dynamic Island */}
      <Section className="py-10">
        <Reveal>
          <SectionHeader
            kicker="Live Activities"
            title="2 Live Activities, including the Dynamic Island"
            lead="Kick off a long-running task and watch it from the Island or the Lock Screen — no need to keep the app open."
          />
        </Reveal>
        <Reveal delay={80}>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <KipCard className="p-6">
              <p className="font-semibold text-ink">Kip Run</p>
              <p className="mt-1 text-sm text-ink-secondary">
                Phase (connecting → thinking → using a tool → responding), elapsed time, model
                name, conversation title — with a real Stop button while it&apos;s running.
              </p>
              <div className="mt-6">
                <DynamicIslandMock
                  compactLabel="Using a tool…"
                  expandedTitle="Refactoring auth module"
                  expandedSubtitle="Claude · 0:42 elapsed"
                  glyph="working"
                />
              </div>
            </KipCard>
            <KipCard className="p-6">
              <p className="font-semibold text-ink">Kip Focus Sprint</p>
              <p className="mt-1 text-sm text-ink-secondary">
                Current task title, position in the sprint (&quot;2 of 4&quot;), and a countdown to the
                next break — updated locally by the app as you work.
              </p>
              <div className="mt-6">
                <DynamicIslandMock
                  compactLabel="Focus: 2 of 4"
                  expandedTitle="Write project outline"
                  expandedSubtitle="12:30 remaining"
                  glyph="thinking"
                />
              </div>
            </KipCard>
          </div>
        </Reveal>
      </Section>

      {/* Controls */}
      <Section className="py-10">
        <Reveal>
          <SectionHeader
            kicker="Control Center · Lock Screen · Action Button"
            title="6 controls, all wired to real actions"
            lead="Quiet Mode and Offline Mode are genuine stateful toggles — they reflect your actual settings, not a static icon."
          />
        </Reveal>
        <Reveal delay={80}>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {CONTROLS.map((control) => (
              <ControlChip key={control.label} {...control} />
            ))}
          </div>
        </Reveal>
        <Reveal delay={140}>
          <div className="mt-6">
            <LockScreenRow>
              {CONTROLS.map((control, i) => (
                <LockScreenGlyph key={control.label} glyph={i % 2 === 0 ? "idle" : "done"} />
              ))}
            </LockScreenRow>
          </div>
        </Reveal>
      </Section>

      {/* Siri, App Intents, Spotlight */}
      <Section className="py-10">
        <Reveal>
          <SectionHeader kicker="Siri & Search" title="App Intents, App Shortcuts, and Spotlight" />
        </Reveal>
        <Reveal delay={80}>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <KipCard className="p-6">
              <p className="font-semibold text-ink">Talk to Siri</p>
              <p className="mt-2 text-sm text-ink-secondary">
                Eight App Shortcuts, each backed by a real App Intent — say &quot;Ask Kip…&quot; or &quot;Run my
                Kip briefing&quot; and it actually runs.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {SHORTCUTS.map((s) => (
                  <Pill key={s} tone="outline">
                    {s}
                  </Pill>
                ))}
              </div>
            </KipCard>
            <KipCard className="p-6">
              <p className="font-semibold text-ink">Spotlight indexing</p>
              <p className="mt-2 text-sm text-ink-secondary">
                Your conversation titles and scheduled automation names are indexed for search, so
                you can jump straight back into one from anywhere on iOS.
              </p>
              <p className="mt-3 text-sm text-ink-secondary">
                Privacy note: only titles and names are indexed — never message content.
              </p>
            </KipCard>
          </div>
        </Reveal>
      </Section>

      {/* Share extension + Handoff */}
      <Section className="py-10">
        <Reveal>
          <SectionHeader kicker="Sharing & Continuity" title="Share extension and Handoff" />
        </Reveal>
        <Reveal delay={80}>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="font-semibold text-ink">Share into Kip</p>
              <p className="mt-2 text-sm text-ink-secondary">
                Text, a URL, or up to 4 images from any app&apos;s share sheet — it lands in a private
                inbox on your phone, not sent anywhere until you open Kip.
              </p>
              <div className="mt-4">
                <ShareSheetMock />
              </div>
            </div>
            <KipCard className="p-6">
              <p className="font-semibold text-ink">Handoff</p>
              <p className="mt-2 text-sm text-ink-secondary">
                Start a conversation on your iPhone, pick it back up on another of your Apple
                devices. Handoff carries the session id and title only — never message content.
              </p>
            </KipCard>
          </div>
        </Reveal>
      </Section>

      {/* FoundationModels / Apple Intelligence */}
      <Section className="py-10">
        <Reveal>
          <SectionHeader
            kicker="On-device"
            title="Apple Intelligence, running locally"
            lead="Built on Apple's FoundationModels framework — nothing here calls out to a server, and there's no API cost."
          />
        </Reveal>
        <Reveal delay={80}>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FOUNDATION_MODELS_FEATURES.map((f) => (
              <KipCard key={f.title} className="p-5">
                <p className="font-semibold text-ink">{f.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{f.body}</p>
              </KipCard>
            ))}
          </div>
        </Reveal>
        <Reveal delay={140}>
          <p className="mt-6 max-w-2xl text-sm text-ink-muted">
            Honest note: these features are garnish, not load-bearing. On a device without Apple
            Intelligence — or with it turned off — Kip silently no-ops and behaves exactly as it
            would otherwise. Nothing breaks; you just don&apos;t see the on-device extras.
          </p>
        </Reveal>
      </Section>

      {/* Liquid Glass */}
      <Section className="py-10">
        <Reveal>
          <SectionHeader kicker="Look & feel" title="Liquid Glass icon, used with restraint" />
        </Reveal>
        <Reveal delay={80}>
          <div className="mt-8 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <div className="rounded-[24px] border border-hairline bg-surface p-3">
              <KipIcon size={72} className="rounded-[16px]" />
            </div>
            <div className="max-w-xl">
              <p className="text-sm text-ink-secondary">
                The app icon uses Apple&apos;s new Liquid Glass icon format. In the app itself, glass
                is an optional style you can turn on — it shows up on the chat composer bar, the
                &quot;jump to latest message&quot; button, and the next-move suggestion chip. Turn on Reduce
                Transparency in iOS and Kip falls back to flat, opaque surfaces automatically.
              </p>
            </div>
          </div>
        </Reveal>
      </Section>

      <Section className="py-14">
        <Reveal>
          <p className="max-w-2xl text-sm text-ink-muted">
            Everything above targets <span className="font-semibold text-ink">iOS 27</span>. For
            devices that can&apos;t take the newest OS yet, there&apos;s a separate build —{" "}
            <span className="font-semibold text-ink">Kip26</span> — targeting iOS 26 with the
            same core app and a slightly smaller feature set, so more people can actually install
            it.
          </p>
        </Reveal>
      </Section>
    </>
  );
}
