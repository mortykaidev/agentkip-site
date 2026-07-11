import type { ReactNode } from "react";
import { OrbitMark, StatusGlyph, type GlyphState } from "@/components/brand";
import { Pill, type PillTone } from "@/components/ui";

/**
 * Flat CSS/SVG visual mocks for the /ios showcase (src/app/ios/page.tsx).
 * No gradients, no photography — just token colors, radii 14/10/pill, and
 * shapes that read as "widget", "Dynamic Island", "control row" at a glance.
 */

/** A single home/lock-screen widget tile, shaped like a small iOS widget. */
export function WidgetTile({
  name,
  description,
  glyph = "idle",
  tone = "mint",
}: {
  name: string;
  description: string;
  glyph?: GlyphState;
  tone?: PillTone;
}) {
  return (
    <div className="kip-card flex h-full flex-col justify-between p-4">
      <div className="flex items-start justify-between gap-2">
        <StatusGlyph state={glyph} size={26} />
        <Pill tone={tone} className="text-[10px]">
          Widget
        </Pill>
      </div>
      <div className="mt-4">
        <p className="text-sm font-semibold text-ink">{name}</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-secondary">{description}</p>
      </div>
    </div>
  );
}

/** A rounded charcoal capsule standing in for the Dynamic Island. */
export function DynamicIslandMock({
  compactLabel,
  expandedTitle,
  expandedSubtitle,
  glyph = "working",
}: {
  compactLabel: string;
  expandedTitle: string;
  expandedSubtitle: string;
  glyph?: GlyphState;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2 rounded-full bg-[#0b0b0a] px-4 py-2 text-[#f0eee6] shadow-lg shadow-black/30">
        <StatusGlyph state={glyph} size={18} />
        <span className="text-xs font-medium">{compactLabel}</span>
      </div>
      <div className="flex w-full max-w-xs items-center gap-3 rounded-[24px] bg-[#0b0b0a] px-5 py-4 text-[#f0eee6] shadow-lg shadow-black/30">
        <StatusGlyph state={glyph} size={30} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{expandedTitle}</p>
          <p className="truncate text-xs text-[#c5c2b6]">{expandedSubtitle}</p>
        </div>
      </div>
    </div>
  );
}

/** A single Control Center / Lock Screen / Action Button control chip. */
export function ControlChip({
  label,
  detail,
  tone = "neutral",
  toggled,
}: {
  label: string;
  detail: string;
  tone?: PillTone;
  toggled?: boolean;
}) {
  return (
    <div className="kip-card flex flex-col gap-3 p-4">
      <div
        className={`flex size-11 items-center justify-center rounded-[10px] ${
          toggled ? "bg-accent text-on-accent" : "bg-elevated text-ink-secondary"
        }`}
        aria-hidden="true"
      >
        <OrbitMark size={22} />
      </div>
      <div>
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="mt-0.5 text-xs text-ink-secondary">{detail}</p>
      </div>
      {toggled !== undefined ? (
        <Pill tone={tone} className="w-fit text-[10px]">
          {toggled ? "On" : "Off"}
        </Pill>
      ) : null}
    </div>
  );
}

/** A lock-screen-style row of small circular glyph controls. */
export function LockScreenRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-5 rounded-[24px] border border-hairline bg-[#0b0b0a] px-6 py-8">
      {children}
    </div>
  );
}

export function LockScreenGlyph({ glyph = "idle" }: { glyph?: GlyphState }) {
  return (
    <div className="flex size-12 items-center justify-center rounded-full bg-white/10">
      <StatusGlyph state={glyph} size={24} />
    </div>
  );
}

const DOT_TONE_CLASSES = {
  sky: "bg-sky",
  lilac: "bg-lilac",
  peach: "bg-peach",
} as const;

/** Share-sheet style row showing accepted content types. */
export function ShareSheetMock() {
  const items: { label: string; tone: keyof typeof DOT_TONE_CLASSES }[] = [
    { label: "Text", tone: "sky" },
    { label: "URL", tone: "lilac" },
    { label: "Images (up to 4)", tone: "peach" },
  ];
  return (
    <div className="kip-card flex flex-wrap gap-3 p-5">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-2 rounded-[10px] border border-hairline bg-elevated px-3 py-2"
        >
          <span className={`size-2 rounded-full ${DOT_TONE_CLASSES[item.tone]}`} aria-hidden="true" />
          <span className="text-sm text-ink-secondary">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
