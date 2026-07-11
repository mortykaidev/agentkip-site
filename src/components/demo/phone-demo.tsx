"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { KipIcon, StatusGlyph } from "@/components/brand";
import { DynamicIsland } from "./dynamic-island";
import {
  COMPOSER_EXCHANGE,
  DEFAULT_LANE_ID,
  DEMO_DISCLAIMER,
  DEMO_LANES,
  DEMO_PROMPTS,
  type DemoLaneId,
} from "./script";
import { useDemoPlayer, usePrefersReducedMotion } from "./use-demo-player";

/* The homepage "wow" piece: a simulated AgentKip session inside an iPhone-style
   frame. Plays a scripted run when scrolled into view; visitors can tap canned
   prompts, switch model lanes, and type into the Siri-glow composer (which gets
   an honest canned reply — never a real model).

   Color note: the phone screen renders the app's Kip Charcoal palette with the
   same fixed brand hexes brand.tsx uses, so the device stays dark in the site's
   light theme too — it is a picture of the app, not a themed surface. */

const AUTOPLAY_DELAY_MS = 600;

export function PhoneDemo() {
  const isReducedMotion = usePrefersReducedMotion();
  const { messages, phase, streamedText, thinkingLabel, isBusy, play } =
    useDemoPlayer(isReducedMotion);

  const [laneId, setLaneId] = useState<DemoLaneId>(DEFAULT_LANE_ID);
  const [draft, setDraft] = useState("");

  const frameRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasStartedRef = useRef(false);
  const playRef = useRef(play);
  useEffect(() => {
    playRef.current = play;
  });

  const activeLane = DEMO_LANES.find((lane) => lane.id === laneId) ?? DEMO_LANES[1];

  /* Autoplay the first scripted prompt once the frame scrolls into view. */
  useEffect(() => {
    const node = frameRef.current;
    if (!node) return;
    let autoplayId: ReturnType<typeof setTimeout> | null = null;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !hasStartedRef.current) {
          hasStartedRef.current = true;
          autoplayId = setTimeout(() => playRef.current(DEMO_PROMPTS[0]), AUTOPLAY_DELAY_MS);
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      if (autoplayId !== null) clearTimeout(autoplayId);
    };
  }, []);

  /* Keep the transcript pinned to the latest line. */
  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, streamedText, phase]);

  const handleComposerSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || isBusy) return;
    setDraft("");
    play({ userText: text, ...COMPOSER_EXCHANGE });
  };

  return (
    <div className="mx-auto w-full max-w-[360px]">
      {/* Bezel */}
      <div
        ref={frameRef}
        className="relative h-[640px] rounded-[44px] border border-hairline bg-[#141412] p-[10px] shadow-[0_32px_80px_-32px_rgba(0,0,0,0.55)] sm:h-[680px]"
      >
        {/* Side buttons */}
        <span className="absolute -left-[2px] top-[130px] h-[28px] w-[3px] rounded-full bg-[#141412]" aria-hidden="true" />
        <span className="absolute -left-[2px] top-[172px] h-[48px] w-[3px] rounded-full bg-[#141412]" aria-hidden="true" />
        <span className="absolute -right-[2px] top-[196px] h-[64px] w-[3px] rounded-full bg-[#141412]" aria-hidden="true" />

        {/* Screen — always Kip Charcoal */}
        <div className="flex h-full flex-col overflow-hidden rounded-[34px] bg-[#262624] text-[#f0eee6]">
          {/* Status bar + Dynamic Island */}
          <div className="relative flex items-center justify-between px-7 pt-3">
            <span className="text-[12px] font-semibold tabular-nums">9:41</span>
            <div className="absolute left-1/2 top-2.5 -translate-x-1/2">
              <DynamicIsland phase={phase} />
            </div>
            <span className="flex items-center gap-1" aria-hidden="true">
              <span className="inline-block h-[9px] w-[13px] rounded-[2px] border border-[#908e84]" />
              <span className="inline-block size-[3px] rounded-full bg-[#908e84]" />
            </span>
          </div>

          {/* Header */}
          <div className="mt-4 flex items-center gap-2.5 px-5">
            <KipIcon size={30} className="rounded-[9px]" />
            <div className="min-w-0">
              <p className="text-[15px] font-semibold leading-tight">Kip</p>
              <p className="truncate text-[11px] leading-tight text-[#908e84]">
                {activeLane.label} lane · {activeLane.caption} · models from your server
              </p>
            </div>
          </div>

          {/* Model-lane switcher */}
          <div className="mt-3 flex gap-1.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
            {DEMO_LANES.map((lane) => (
              <button
                key={lane.id}
                type="button"
                onClick={() => setLaneId(lane.id)}
                className={`kip-press shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold transition-colors ${
                  lane.id === laneId
                    ? "bg-[#7fd8b1] text-[#14211b]"
                    : "border border-[#403f3b] text-[#c5c2b6]"
                }`}
                aria-pressed={lane.id === laneId}
              >
                {lane.label}
              </button>
            ))}
          </div>

          {/* Transcript */}
          <div
            ref={scrollRef}
            className="mt-1 flex-1 space-y-4 overflow-y-auto px-5 py-3 [scrollbar-width:none]"
          >
            {messages.length === 0 && phase === "idle" ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <StatusGlyph state="idle" size={44} />
                <p className="text-[13px] text-[#908e84]">
                  Kip is ready. Tap a prompt below.
                </p>
              </div>
            ) : null}

            {messages.map((message) =>
              message.role === "user" ? (
                <div key={message.id} className="flex justify-end">
                  <div className="max-w-[82%] rounded-[18px] rounded-br-[6px] bg-[#2c3b34] px-4 py-2.5 text-[14px] leading-snug">
                    {message.text}
                  </div>
                </div>
              ) : (
                /* Assistant replies are bubble-less plain text — the app's style */
                <p
                  key={message.id}
                  className="whitespace-pre-line text-[14px] leading-relaxed text-[#f0eee6]"
                >
                  {message.text}
                </p>
              ),
            )}

            {phase === "thinking" ? (
              <div className="flex items-center gap-2.5">
                <StatusGlyph state="thinking" size={26} />
                <span className="text-[12px] text-[#908e84]">{thinkingLabel}</span>
              </div>
            ) : null}

            {phase === "streaming" ? (
              <p className="whitespace-pre-line text-[14px] leading-relaxed text-[#f0eee6]">
                {streamedText}
                <span className="animate-blink ml-0.5 inline-block h-[14px] w-[2px] translate-y-[2px] rounded-full bg-[#7fd8b1]" />
              </p>
            ) : null}

            {phase === "settling" ? (
              <div className="flex items-center gap-2">
                <StatusGlyph state="done" size={22} />
                <span className="text-[11px] text-[#908e84]">Run complete</span>
              </div>
            ) : null}
          </div>

          {/* Canned prompt chips */}
          <div className="flex gap-2 overflow-x-auto px-5 pb-2 [scrollbar-width:none]">
            {DEMO_PROMPTS.map((prompt) => (
              <button
                key={prompt.id}
                type="button"
                onClick={() => play(prompt)}
                disabled={isBusy}
                className="kip-press shrink-0 rounded-full border border-[#403f3b] bg-[#30302e] px-3.5 py-1.5 text-[12px] text-[#c5c2b6] transition-opacity disabled:opacity-40"
              >
                {prompt.chipLabel}
              </button>
            ))}
          </div>

          {/* Composer with Siri-glow focus treatment */}
          <form onSubmit={handleComposerSubmit} className="px-4 pb-5 pt-1">
            <div className="siri-glow flex items-center gap-2 rounded-full border border-[#403f3b] bg-[#30302e] py-2 pl-4 pr-2">
              <input
                type="text"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask Kip anything…"
                aria-label="Try the demo composer"
                className="min-w-0 flex-1 bg-transparent text-[14px] text-[#f0eee6] outline-none placeholder:text-[#908e84]"
              />
              <button
                type="submit"
                disabled={isBusy || draft.trim().length === 0}
                aria-label="Send"
                className="kip-press flex size-8 shrink-0 items-center justify-center rounded-full bg-[#7fd8b1] text-[#14211b] transition-opacity disabled:opacity-40"
              >
                <svg viewBox="0 0 16 16" width={14} height={14} aria-hidden="true">
                  <path
                    d="M 8 13 L 8 3 M 4 7 L 8 3 L 12 7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Honesty caption — required */}
      <p className="mt-4 text-center text-[13px] text-ink-muted">{DEMO_DISCLAIMER}</p>
    </div>
  );
}
