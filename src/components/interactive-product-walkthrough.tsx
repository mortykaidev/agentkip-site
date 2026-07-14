"use client";

import Image from "next/image";
import { useEffect, useId, useState } from "react";

type WalkthroughState = {
  id: "home" | "compose" | "complete";
  label: string;
  image: string;
  caption: string;
  hotspot: { x: number; y: number; width: number; height: number };
};

const STATES: WalkthroughState[] = [
  {
    id: "home",
    label: "Start",
    image: "/product/walkthrough/01-home.webp",
    caption: "A quiet new conversation, ready for a thought, a voice note, or a shared item.",
    hotspot: { x: 4, y: 80, width: 92, height: 15 },
  },
  {
    id: "compose",
    label: "Compose",
    image: "/product/walkthrough/02-compose.webp",
    caption: "A real native composer stays close to the work, with model controls and voice within reach.",
    hotspot: { x: 7, y: 74, width: 86, height: 18 },
  },
  {
    id: "complete",
    label: "Result",
    image: "/product/walkthrough/05-complete.webp",
    caption: "A completed offline-preview response: readable, actionable, and kept on your own setup.",
    hotspot: { x: 4, y: 25, width: 92, height: 54 },
  },
];

export function InteractiveProductWalkthrough() {
  const [activeIndex, setActiveIndex] = useState(0);
  const announcementId = useId();
  const active = STATES[activeIndex];

  useEffect(() => {
    STATES.slice(1).forEach((state) => {
      const image = new window.Image();
      image.src = state.image;
    });
  }, []);

  const select = (index: number) => setActiveIndex((index + STATES.length) % STATES.length);

  return (
    <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,0.78fr)_minmax(270px,0.5fr)] lg:gap-14">
      <div className="relative mx-auto w-full max-w-[420px]">
        <div className="absolute -left-5 top-12 h-32 w-32 rounded-full bg-pink sm:-left-12" aria-hidden="true" />
        <div className="absolute -bottom-5 -right-5 h-40 w-40 bg-sky sm:-right-12" aria-hidden="true" />
        <div className="relative border-2 border-[#1b1722] bg-[#1f201e] p-1.5 kip-offset-shadow">
          <div className="relative aspect-[9/19.5] overflow-hidden bg-[#1f201e]">
            {STATES.map((state, index) => (
              <Image
                key={state.id}
                src={state.image}
                alt={index === activeIndex ? `AgentKip app: ${state.label.toLowerCase()} state` : ""}
                fill
                priority={index === 0}
                sizes="(max-width: 640px) calc(100vw - 56px), 420px"
                className={`object-cover transition-opacity duration-300 motion-reduce:transition-none ${index === activeIndex ? "opacity-100" : "pointer-events-none opacity-0"}`}
              />
            ))}
            <button
              type="button"
              className="absolute cursor-pointer focus-visible:outline-offset-[-4px]"
              style={{
                left: `${active.hotspot.x}%`,
                top: `${active.hotspot.y}%`,
                width: `${active.hotspot.width}%`,
                height: `${active.hotspot.height}%`,
              }}
              onClick={() => select(activeIndex + 1)}
              aria-label={`Advance from ${active.label} to the next app state`}
            />
          </div>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.08em] text-mint">Real app, real screens</p>
        <h2 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
          Click through the rhythm of a conversation.
        </h2>
        <p id={announcementId} aria-live="polite" className="mt-5 text-lg leading-relaxed text-[#453e49]">
          {active.caption}
        </p>
        <div className="mt-7 grid gap-2" role="tablist" aria-label="Product walkthrough steps">
          {STATES.map((state, index) => (
            <button
              key={state.id}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              aria-controls={announcementId}
              onClick={() => select(index)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" || event.key === "ArrowRight") select(index + 1);
                if (event.key === "ArrowUp" || event.key === "ArrowLeft") select(index - 1);
              }}
              className={`flex items-center justify-between border-2 px-4 py-3 text-left text-sm font-semibold transition-colors ${index === activeIndex ? "border-[#1b1722] bg-mint text-[#14211b]" : "border-[#6b4b3e] bg-[#f0eee6] text-[#453e49] hover:border-[#1b1722]"}`}
            >
              <span>{state.label}</span>
              <span aria-hidden="true">0{index + 1}</span>
            </button>
          ))}
        </div>
        <p className="mt-4 text-sm text-[#574d58]">Use the controls, arrow keys, or the highlighted area on the screen.</p>
      </div>
    </div>
  );
}
