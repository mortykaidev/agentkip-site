import type { Metadata } from "next";
import { OrbitMark, StatusGlyph, type GlyphState } from "@/components/brand";
import { Section, SectionHeader, KipCard, Kicker } from "@/components/ui";

export const metadata: Metadata = {
  title: "Meet Kip",
  description: "Meet the little planet, colors, and status symbols behind AgentKip.",
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
    body: "The interface stays out of the way so your work remains the point.",
  },
  {
    title: "One clear next step",
    body: "Each screen makes the next useful action easy to find.",
  },
];

export default function KipCornerPage() {
  return (
    <>
      <Section className="py-16 sm:py-24">
        <SectionHeader
          kicker="Kip's Corner"
          title="Meet the little planet"
          lead="Kip is a lowercase k with a small seafoam moon in orbit."
        />
        <div className="mt-10 grid gap-10 md:grid-cols-2 md:items-center">
          <div className="space-y-4 text-[15px] leading-relaxed text-ink-secondary">
            <p>
              The mark started with a question: what should a helpful AI look like when it is not
              trying to be a person? The answer was something small orbiting something steady.
            </p>
            <p>
              The lowercase &ldquo;k&rdquo; carries a seafoam moon that stays in orbit. It feels like
              a little world quietly working, whether or not you are looking at it.
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
          title="Six ways Kip looks"
          lead="The changing orbit shows what Kip is doing at a glance."
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
          title="Kip’s colors"
          lead="The same colors carry meaning in light and dark mode."
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
        <SectionHeader kicker="Design principles" title="How Kip should feel" />
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
          <h2 className="text-2xl font-semibold text-ink">Meet the Mottles</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-secondary">
            A few playful little monsters appear in empty inboxes and blank conversations. We call
            them the Mottles.
          </p>
        </KipCard>
      </Section>
    </>
  );
}
