import Link from "next/link";
import type { ReactNode } from "react";

/* Kip UI primitives — flat fills, hairline borders, r14/r10/pill, press-scale. */

const BUTTON_STYLES = {
  primary:
    "bg-accent text-on-accent font-semibold hover:brightness-105 active:brightness-95",
  secondary:
    "bg-surface text-ink border border-hairline hover:border-hairline-strong",
  ghost: "text-ink-secondary hover:text-ink",
} as const;

const BUTTON_SIZES = {
  md: "px-5 py-3 text-[15px]",
  sm: "px-4 py-2 text-sm",
  lg: "px-7 py-4 text-base",
} as const;

export function KipButton({
  href,
  onClick,
  type,
  variant = "primary",
  size = "md",
  className = "",
  disabled,
  children,
}: {
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: keyof typeof BUTTON_STYLES;
  size?: keyof typeof BUTTON_SIZES;
  className?: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  const cls = `inline-flex items-center justify-center gap-2 rounded-[14px] kip-press transition-colors ${BUTTON_STYLES[variant]} ${BUTTON_SIZES[size]} ${disabled ? "cursor-not-allowed opacity-50" : ""} ${className}`;
  if (href && !disabled) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type ?? "button"} onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}

export function PageHeader({
  kicker,
  title,
  lead,
  className = "",
}: {
  kicker?: string;
  title: string;
  lead?: string;
  className?: string;
}) {
  return (
    <div className={`max-w-3xl ${className}`}>
      {kicker ? <Kicker className="mb-3">{kicker}</Kicker> : null}
      <h1 className="text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">{title}</h1>
      {lead ? <p className="mt-5 max-w-2xl text-pretty text-lg text-ink-secondary">{lead}</p> : null}
    </div>
  );
}

export function KipCard({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={`kip-card p-5 ${className}`}>{children}</div>;
}

/** Uppercase kicker matching KipSectionHeader (semibold, kerning 0.6, muted). */
export function Kicker({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={`text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-muted ${className}`}
    >
      {children}
    </p>
  );
}

export function SectionHeader({
  kicker,
  title,
  lead,
  center,
}: {
  kicker?: string;
  title: string;
  lead?: string;
  center?: boolean;
}) {
  return (
    <div className={`max-w-2xl ${center ? "mx-auto text-center" : ""}`}>
      {kicker ? <Kicker className="mb-3">{kicker}</Kicker> : null}
      <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-balance">{title}</h2>
      {lead ? <p className="mt-4 text-lg text-ink-secondary text-pretty">{lead}</p> : null}
    </div>
  );
}

const PILL_TONES = {
  mint: "text-[#14211b] bg-mint",
  sky: "text-[#101c26] bg-sky",
  pink: "text-[#241318] bg-pink",
  peach: "text-[#26130c] bg-peach",
  lilac: "text-[#191226] bg-lilac",
  butter: "text-[#241d0a] bg-butter",
  neutral: "text-ink-secondary bg-elevated",
  outline: "text-ink-secondary border border-hairline bg-transparent",
} as const;

export type PillTone = keyof typeof PILL_TONES;

export function Pill({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: PillTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${PILL_TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Section wrapper with consistent horizontal padding + max width. */
export function Section({
  id,
  className = "",
  children,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={`px-5 sm:px-8 ${className}`}>
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </section>
  );
}

/** Honesty marker used anywhere we talk about unshipped work. */
export function RoadmapBadge() {
  return <Pill tone="butter">On the roadmap — not shipped yet</Pill>;
}
