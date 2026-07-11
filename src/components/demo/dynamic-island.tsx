"use client";

import { StatusGlyph, type GlyphState } from "@/components/brand";
import type { DemoPhase } from "./use-demo-player";

/* Dynamic Island Live Activity mock: a black pill that expands while a
   scripted run is playing and shows the run-state glyph + label — mirroring
   the app's real Dynamic Island Live Activity. Fixed #000: the island is
   literally the hardware cutout, identical in both site themes. */

const ISLAND_CONTENT: Record<
  Exclude<DemoPhase, "idle">,
  { state: GlyphState; label: string }
> = {
  thinking: { state: "thinking", label: "Kip · thinking" },
  streaming: { state: "working", label: "Kip · replying" },
  settling: { state: "done", label: "Kip · done" },
};

export function DynamicIsland({ phase }: { phase: DemoPhase }) {
  const isExpanded = phase !== "idle";
  const content = isExpanded ? ISLAND_CONTENT[phase] : null;

  return (
    <div
      className={`flex h-[30px] items-center justify-center gap-2 overflow-hidden rounded-full bg-black transition-[width] duration-500 ease-out ${
        isExpanded ? "w-[200px]" : "w-[108px]"
      }`}
      aria-live="polite"
    >
      {content ? (
        <>
          <StatusGlyph state={content.state} size={18} />
          <span className="whitespace-nowrap text-[11px] font-medium text-[#f0eee6]">
            {content.label}
          </span>
        </>
      ) : null}
    </div>
  );
}
