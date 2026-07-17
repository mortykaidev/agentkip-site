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
  type DemoCard,
  type DemoCardRow,
  type DemoLaneId,
} from "./script";
import { useDemoPlayer, usePrefersReducedMotion } from "./use-demo-player";

/* Tiny inline icon set for card rows — 24-unit viewBox, stroke-only, matches
   the composer glyphs' weight. Kept local since it's only used here. */
function CardRowIcon({ icon }: { icon: DemoCardRow["icon"] }) {
  if (icon === "clock") {
    return (
      <svg viewBox="0 0 24 24" width={14} height={14} aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="M12 7v5l3.5 2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (icon === "check") {
    return (
      <svg viewBox="0 0 24 24" width={14} height={14} aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="M8 12.5l2.5 2.5L16 9.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width={14} height={14} aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M12 7.5v9M9.3 9.7c0-1.1 1.1-1.7 2.7-1.7s2.7.6 2.7 1.5-1.1 1.3-2.7 1.5-2.7.6-2.7 1.5 1.1 1.7 2.7 1.7 2.7-.6 2.7-1.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* Rich reply card — renders under an assistant message's intro line when the
   scripted exchange has structured content (schedule, checklist, summary).
   Mounts hidden and fades/slides in on the next frame; skipped entirely under
   prefers-reduced-motion so it just appears with the message. */
function DemoCardView({ card, isReducedMotion }: { card: DemoCard; isReducedMotion: boolean }) {
  const [isVisible, setIsVisible] = useState(isReducedMotion);

  useEffect(() => {
    if (isReducedMotion) return;
    const frame = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [isReducedMotion]);

  return (
    <div
      className={`mt-2 rounded-[16px] border border-[#403f3b] bg-[#30302e] p-3.5 transition-all duration-300 ease-out ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0"
      }`}
    >
      <p className="text-[12px] font-semibold text-[#7fd8b1]">{card.title}</p>
      <div className="mt-2 space-y-1.5">
        {card.rows.map((row) => (
          <div key={row.text} className="flex items-start gap-2 text-[13px] leading-snug">
            <span className="mt-0.5 shrink-0 text-[#908e84]">
              <CardRowIcon icon={row.icon} />
            </span>
            <span>{row.text}</span>
          </div>
        ))}
      </div>
      {card.footer ? (
        <p className="mt-2.5 border-t border-[#403f3b] pt-2 text-[11px] text-[#908e84]">{card.footer}</p>
      ) : null}
    </div>
  );
}

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
    <div className="mx-auto w-full min-w-0 max-w-[315px]">
      {/* Bezel — true iPhone screen ratio (1206:2622) */}
      <div
        ref={frameRef}
        className="relative aspect-[1206/2622] rounded-[44px] border border-hairline bg-[#141412] p-[10px] shadow-[0_32px_80px_-32px_rgba(0,0,0,0.55)]"
      >
        {/* Side buttons */}
        <span className="absolute -left-[2px] top-[139px] h-[28px] w-[3px] rounded-full bg-[#141412]" aria-hidden="true" />
        <span className="absolute -left-[2px] top-[184px] h-[48px] w-[3px] rounded-full bg-[#141412]" aria-hidden="true" />
        <span className="absolute -right-[2px] top-[210px] h-[64px] w-[3px] rounded-full bg-[#141412]" aria-hidden="true" />

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

          {/* Header — Kip mark + title centered on the same axis as the Dynamic Island */}
          <div className="mt-4 flex flex-col items-center gap-0.5 px-5">
            <div className="flex items-center gap-1.5">
              <KipIcon size={20} className="rounded-[6px]" />
              <p className="text-[15px] font-semibold leading-tight">Kip</p>
            </div>
            <p className="text-[11px] leading-tight text-[#908e84]">{activeLane.label} lane</p>
          </div>

          {/* Model-lane switcher */}
          <div className="mt-3 flex min-w-0 gap-1.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
            {DEMO_LANES.map((lane) => (
              <button
                key={lane.id}
                type="button"
                onClick={() => setLaneId(lane.id)}
                className={`kip-press shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold transition-colors ${
                  lane.id === laneId
                    ? "border border-[#7fd8b1] bg-[#7fd8b1]/15 text-[#7fd8b1]"
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
                <div key={message.id}>
                  <p className="whitespace-pre-line text-[14px] leading-relaxed text-[#f0eee6]">
                    {message.text}
                  </p>
                  {message.card ? (
                    <DemoCardView card={message.card} isReducedMotion={isReducedMotion} />
                  ) : null}
                </div>
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
          <div className="flex min-w-0 gap-2 overflow-x-auto px-5 pb-2 [scrollbar-width:none]">
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

          {/* Composer with Siri-glow focus treatment — two-row app layout */}
          <form onSubmit={handleComposerSubmit} className="px-4 pb-5 pt-1">
            <div className="siri-glow rounded-[26px] border border-[#403f3b] bg-[#30302e] px-4 py-3">
              <input
                type="text"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Message Kip"
                aria-label="Try the demo composer"
                className="w-full bg-transparent text-[14px] text-[#f0eee6] outline-none placeholder:text-[#908e84]"
              />
              <div className="mt-2.5 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span
                    className="flex size-6 shrink-0 items-center justify-center rounded-full border border-[#403f3b] text-[#c5c2b6]"
                    aria-hidden="true"
                  >
                    <svg viewBox="0 0 24 24" width={13} height={13} aria-hidden="true">
                      <path
                        d="M12 5v14M5 12h14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                  <span className="shrink-0 rounded-full bg-[#403f3b] px-2.5 py-1 text-[11px] font-semibold text-[#f0eee6]">
                    Kip
                  </span>
                  <span className="truncate rounded-full border border-[#403f3b] px-2.5 py-1 text-[11px] font-medium text-[#c5c2b6]">
                    {activeLane.label}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <svg
                    viewBox="0 0 24 24"
                    width={16}
                    height={16}
                    aria-hidden="true"
                    className="text-[#908e84]"
                  >
                    <path
                      d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0M12 19v2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
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
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Honesty caption — required */}
      <p className="mt-4 text-center text-[13px] text-ink-muted">{DEMO_DISCLAIMER}</p>
    </div>
  );
}
