"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Fade-up on first scroll into view. Renders visible when JS/motion unavailable. */
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      /* Defer to a microtask so setState runs in a callback, not synchronously
         in the effect body (avoids cascading renders during commit). */
      queueMicrotask(() => setRevealed(true));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(node);
    /* Safety net: if the observer never fires (throttled/embedded contexts,
       broken IO), content must still become visible. */
    const fallback = window.setTimeout(() => {
      setRevealed(true);
      observer.disconnect();
    }, 1600);
    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`kip-reveal ${className}`}
      data-revealed={revealed}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
