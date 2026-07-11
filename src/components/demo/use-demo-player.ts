"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { DemoExchange } from "./script";

/* Drives the scripted chat playback:
   user bubble → thinking → typewriter stream → done glyph → idle.
   All timers live in refs and are cleared on unmount / replay.
   With prefers-reduced-motion the final state renders instantly. */

export type DemoPhase = "idle" | "thinking" | "streaming" | "settling";

export type DemoMessage = {
  id: number;
  role: "user" | "assistant";
  text: string;
};

const THINKING_MS = 1400;
const SETTLE_MS = 1500;
const TICK_MS = 24;
const CHARS_PER_TICK = 3;

function subscribeToReducedMotion(onChange: () => void): () => void {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getReducedMotionSnapshot(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot(): boolean {
  return false;
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );
}

export function useDemoPlayer(isReducedMotion: boolean) {
  const [messages, setMessages] = useState<DemoMessage[]>([]);
  const [phase, setPhase] = useState<DemoPhase>("idle");
  const [streamedText, setStreamedText] = useState("");
  const [thinkingLabel, setThinkingLabel] = useState("");

  const timeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextIdRef = useRef(1);

  const clearTimers = useCallback(() => {
    timeoutsRef.current.forEach((id) => clearTimeout(id));
    timeoutsRef.current.clear();
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timeoutsRef.current.delete(id);
      fn();
    }, ms);
    timeoutsRef.current.add(id);
  }, []);

  const appendMessage = useCallback((role: DemoMessage["role"], text: string) => {
    const id = nextIdRef.current;
    nextIdRef.current += 1;
    setMessages((previous) => [...previous, { id, role, text }]);
  }, []);

  const play = useCallback(
    (exchange: DemoExchange) => {
      if (phase !== "idle") return;
      clearTimers();
      appendMessage("user", exchange.userText);

      if (isReducedMotion) {
        appendMessage("assistant", exchange.reply);
        return;
      }

      setThinkingLabel(exchange.thinkingLabel);
      setPhase("thinking");

      schedule(() => {
        setPhase("streaming");
        let shownChars = 0;
        intervalRef.current = setInterval(() => {
          shownChars += CHARS_PER_TICK;
          if (shownChars >= exchange.reply.length) {
            if (intervalRef.current !== null) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            setStreamedText("");
            appendMessage("assistant", exchange.reply);
            setPhase("settling");
            schedule(() => setPhase("idle"), SETTLE_MS);
          } else {
            setStreamedText(exchange.reply.slice(0, shownChars));
          }
        }, TICK_MS);
      }, THINKING_MS);
    },
    [phase, isReducedMotion, appendMessage, clearTimers, schedule],
  );

  return {
    messages,
    phase,
    streamedText,
    thinkingLabel,
    isBusy: phase !== "idle",
    play,
  };
}
