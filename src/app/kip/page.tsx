import type { Metadata } from "next";
import { OrbitMark, StatusGlyph, type GlyphState } from "@/components/brand";
import { Section, SectionHeader, KipCard, Kicker } from "@/components/ui";

export const metadata: Metadata = {
  title: "Kip's Corner",
  description:
    "The story of the mark, the orbit motif, the status glyphs, and the palette behind AgentKip.",
};

const GLYPH_STATES: { state: GlyphState; label: string }[] = [
  { state: "idle", label: "Idle" },
  { state: "thinking", label: "Thinking" },
  { state: "working", label: "Working" },
  { state: "done", label: "Done" },
  { state: "error", label: "Error" },
  { state: "sleeping", label: "Sleeping" },
];

const PALETTE: { name: string; hex: string }[] = [
  { name: "Warm charcoal", hex: "#262624" },
  { name: "Cream", hex: "#F0EEE6" },
  { name: "Seafoam", hex: "#7FD8B1" },
  { name: "Sky", hex: "#8EC9F0" },
  { name: "Pink", hex: "#EFAAC0" },
  { name: "Peach", hex: "#FF9D7A" },
  { name: "Lilac", hex: "#C5AEF2" },
  { name: "Butter", hex: "#F2CF87" },
];

const PRINCIPLES = [
  { title: "Flat", body: "No gradients, no synthwave, no neon. Fills are fills." },
  {
    title: "Quiet",
    body: "The interface gets out of the way so the work stays the point, not the chrome around it.",
  },
  {
    title: "One obvious next action",
    body: "Every screen has a single clear thing to do next — not three competing ones fighting for attention.",
  },
];

export default function KipCornerPage() {
  return (
    <>
      <Section className="py-16 sm:py-24">
        <SectionHeader
          kicker="Kip's Corner"
          title="The little planet with a plan"
          lead="Kip is a lowercase k with a seafoam moon in permanent orbit — here's the thinking behind it."
        />
        <div className="mt-10 grid gap-10 md:grid-cols-2 md:items-center">
          <div className="space-y-4 text-[15px] leading-relaxed text-ink-secondary">
            <p>
              The mark started as a question: what does a personal agent look like when it isn&apos;t
              trying to be a face? Not a chatbot avatar, not a mascot with eyes glued on. Just a
              shape that suggests something small, orbiting something steady.
            </p>
            <p>
              The lowercase &ldquo;k&rdquo; carries a seafoam dot that never leaves its orbit — a
              moon that&apos;s always there. It&apos;s meant to feel less like a logo and more like a
              little world quietly working, whether or not you&apos;re looking at it.
            </p>
          </div>
          <div className="flex items-center justify-center">
            <OrbitMark size={220} drift />
          </div>
        </div>
      </Section>

      <Section className="py-16 sm:py-24">
        <SectionHeader
          kicker="Run states"
          title="Six moods, one planet"
          lead="The status glyphs tell you what Kip is doing at a glance — same seafoam planet, different orbit."
        />
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
          {GLYPH_STATES.map(({ state, label }) => (
            <KipCard key={state} className="flex flex-col items-center gap-3 py-6 text-center">
              <StatusGlyph state={state} size={40} />
              <span className="text-sm font-medium text-ink">{label}</span>
            </KipCard>
          ))}
        </div>
      </Section>

      <Section className="py-16 sm:py-24">
        <SectionHeader
          kicker="Palette"
          title="The colors, named"
          lead="Fixed brand colors — identical in light and dark mode, used for meaning, not decoration."
        />
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {PALETTE.map((swatch) => (
            <div key={swatch.hex} className="kip-card overflow-hidden">
              <div className="h-20" style={{ backgroundColor: swatch.hex }} />
              <div className="p-3">
                <p className="text-sm font-medium text-ink">{swatch.name}</p>
                <p className="font-mono text-xs text-ink-muted">{swatch.hex}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section className="py-16 sm:py-24">
        <SectionHeader kicker="Design principles" title="How Kip is supposed to feel" />
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {PRINCIPLES.map((p) => (
            <KipCard key={p.title}>
              <h3 className="text-base font-semibold text-ink">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{p.body}</p>
            </KipCard>
          ))}
        </div>
      </Section>

      <Section className="py-16 sm:py-24">
        <KipCard className="mx-auto max-w-2xl py-10 text-center">
          <Kicker className="mb-3">A small secret</Kicker>
          <h2 className="text-2xl font-semibold text-ink">The Mottles live in the empty states</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-secondary">
            Somewhere in the app&apos;s quieter corners — the empty inbox, the blank conversation —
            a few chaotic little monster friends have started showing up. We call them the
            Mottles. More on them once they&apos;ve settled in.
          </p>
        </KipCard>
      </Section>
    </>
  );
}
