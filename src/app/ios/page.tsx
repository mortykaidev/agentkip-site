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
  title: "Made for iPhone",
  description:
    "See how Kip uses widgets, Live Activities, Siri, sharing, and on-device Apple Intelligence.",
};

const WIDGETS = [
  { name: "Today with Kip", description: "See your connection, latest task, next job, and cost.", glyph: "idle" as const },
  { name: "Active Run", description: "See what Kip is doing and how long it has taken.", glyph: "working" as const },
  { name: "Ask Kip", description: "Start a chat, speak, or continue where you stopped.", glyph: "thinking" as const },
  { name: "Kip Meter", description: "See today’s use and estimated cost.", glyph: "done" as const },
  { name: "Next Automation", description: "See the next scheduled job and the last result.", glyph: "sleeping" as const },
  { name: "Context Gauge", description: "See how much room is left in the current chat.", glyph: "idle" as const },
  { name: "Gateway Health", description: "Check whether Noggin is online and ready.", glyph: "done" as const },
];

const CONTROLS = [
  { label: "Ask Kip", detail: "Open Kip and start speaking." },
  { label: "New Kip Chat", detail: "Open a new conversation." },
  { label: "Stop Kip Run", detail: "Stop the current task." },
  { label: "Kip Quiet Mode", detail: "Mute Kip notifications.", toggled: true, tone: "mint" as const },
  { label: "Kip Offline Mode", detail: "Pause connections to Noggin.", toggled: false, tone: "peach" as const },
  { label: "Start Focus Sprint", detail: "Choose a focus timer." },
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
  { title: "Chat titles", body: "Give a new conversation a short title on your iPhone." },
  { title: "Memory suggestions", body: "Suggest useful details to save, then wait for your approval." },
  { title: "Morning summaries", body: "Turn overnight activity into one clear line." },
  { title: "Next steps", body: "Offer a next step you can tap, change, or ignore." },
  { title: "Offline drafts", body: "Draft a short reply when Noggin cannot be reached." },
];

export default function IosFeaturesPage() {
  return (
    <>
      <Section className="pt-14 pb-10 sm:pt-20">
        <Reveal>
          <Kicker>iOS 27</Kicker>
          <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Made for iPhone
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-secondary text-pretty">
            Kip fits into the iPhone features you already use: widgets, Dynamic Island, Control
            Center, Siri, sharing, and on-device Apple Intelligence.
          </p>
        </Reveal>
      </Section>

      {/* Widgets */}
      <Section className="py-10">
        <Reveal>
          <SectionHeader
            kicker="Home & Lock Screen"
            title="Seven useful widgets"
            lead="See Kip’s latest saved state without opening the app."
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
            title="Follow work at a glance"
            lead="Start a longer task and follow it from Dynamic Island or the Lock Screen."
          />
        </Reveal>
        <Reveal delay={80}>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <KipCard className="p-6">
              <p className="font-semibold text-ink">Kip Run</p>
              <p className="mt-1 text-sm text-ink-secondary">
                See the current step, time, AI choice, and conversation title, or stop the task.
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
                See your current focus task, place in the sprint, and time until the next break.
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
            title="Six ways to start"
            lead="Start, stop, or change Kip from Control Center or the Lock Screen."
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
          <SectionHeader kicker="Siri & Search" title="Ask with Siri" />
        </Reveal>
        <Reveal delay={80}>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <KipCard className="p-6">
              <p className="font-semibold text-ink">Talk to Siri</p>
              <p className="mt-2 text-sm text-ink-secondary">
                Use eight shortcuts for common actions, including &quot;Ask Kip&quot; and &quot;Run my Kip briefing.&quot;
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
                Search conversation titles and scheduled job names, then jump back in.
              </p>
              <p className="mt-3 text-sm text-ink-secondary">
                Spotlight sees titles and names, not message text.
              </p>
            </KipCard>
          </div>
        </Reveal>
      </Section>

      {/* Share extension + Handoff */}
      <Section className="py-10">
        <Reveal>
          <SectionHeader kicker="Sharing & Continuity" title="Share into Kip" />
        </Reveal>
        <Reveal delay={80}>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="font-semibold text-ink">Share into Kip</p>
              <p className="mt-2 text-sm text-ink-secondary">
                Send text, a link, or up to four images to a private inbox on your phone.
              </p>
              <div className="mt-4">
                <ShareSheetMock />
              </div>
            </div>
            <KipCard className="p-6">
              <p className="font-semibold text-ink">Handoff</p>
              <p className="mt-2 text-sm text-ink-secondary">
                Continue a conversation on another Apple device using only its ID and title.
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
            title="Small jobs stay on iPhone"
            lead="These optional Apple Intelligence features run on your device."
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
            If Apple Intelligence is unavailable or turned off, Kip skips these extras and keeps
            working without them.
          </p>
        </Reveal>
      </Section>

      {/* Liquid Glass */}
      <Section className="py-10">
        <Reveal>
          <SectionHeader kicker="Look & feel" title="At home on iPhone" />
        </Reveal>
        <Reveal delay={80}>
          <div className="mt-8 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <div className="rounded-[24px] border border-hairline bg-surface p-3">
              <KipIcon size={72} className="rounded-[16px]" />
            </div>
            <div className="max-w-xl">
              <p className="text-sm text-ink-secondary">
                Kip supports Apple&apos;s Liquid Glass icon and optional glass controls. Turn on
                Reduce Transparency and the app uses flat, solid surfaces instead.
              </p>
            </div>
          </div>
        </Reveal>
      </Section>

      <Section className="py-14">
        <Reveal>
          <p className="max-w-2xl text-sm text-ink-muted">
            These features target <span className="font-semibold text-ink">iOS 27</span>. The
            separate <span className="font-semibold text-ink">Kip26</span> build keeps the main
            experience on iOS 26 with fewer extras.
          </p>
        </Reveal>
      </Section>
    </>
  );
}
