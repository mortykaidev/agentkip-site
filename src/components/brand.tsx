import type { CSSProperties } from "react";

/*
  Kip brand marks, transcribed from design/explorations/kip-brand/*.svg
  (geometry ground truth: kipfont.py). All strokes round-capped.
  The lockup follows the surrounding ink; only deliberate accent dots are fixed.
*/

const CHARCOAL = "#262624";
const SEAFOAM = "#7fd8b1";
const BUTTER = "#f2cf87";
const CORAL = "#ff9d7a";

/** The "k" monogram with seafoam orbit dot, on a rounded charcoal tile (app icon). */
export function KipIcon({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 1024 1024"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <rect x="0" y="0" width="1024" height="1024" rx="224" fill={CHARCOAL} />
      <rect x="364" y="225" width="104" height="560" rx="52" fill="#f0eee6" />
      <path
        d="M 416 610 L 632 415"
        fill="none"
        stroke="#f0eee6"
        strokeWidth="104"
        strokeLinecap="round"
      />
      <path
        d="M 442 632 L 650 795"
        fill="none"
        stroke="#f0eee6"
        strokeWidth="104"
        strokeLinecap="round"
      />
      <circle cx="669" cy="600" r="40" fill={SEAFOAM} />
      <path
        d="M 755 600 A 86 86 0 1 1 669 514"
        fill="none"
        stroke="#f0eee6"
        strokeWidth="18"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** The "agentkip" lockup — "agent" at 65% opacity, "kip" full. Ink follows theme. */
export function KipLockup({ height = 28, className }: { height?: number; className?: string }) {
  return (
    <svg
      viewBox="80 130 1450 420"
      height={height}
      className={className}
      role="img"
      aria-label="agentkip"
    >
      <g fill="currentColor" stroke="currentColor">
        <g transform="translate(-120,-35) scale(0.66)" stroke="none">
          <rect x="350" y="225" width="104" height="560" rx="52" />
          <path
            d="M 402 610 L 618 415"
            fill="none"
            stroke="currentColor"
            strokeWidth="104"
            strokeLinecap="round"
          />
          <path
            d="M 428 632 L 636 795"
            fill="none"
            stroke="currentColor"
            strokeWidth="104"
            strokeLinecap="round"
          />
          <circle cx="655" cy="600" r="40" fill={SEAFOAM} stroke="none" />
          <path
            d="M 741 600 A 86 86 0 1 1 655 514"
            fill="none"
            stroke="currentColor"
            strokeWidth="18"
            strokeLinecap="round"
          />
        </g>
        {/* "agent" @65% */}
        <g fill="none" strokeWidth="38" strokeLinecap="round" opacity="0.65">
          <path d="M 500 350 A 50 50 0 1 1 600 350 A 50 50 0 1 1 500 350 M 600 300 L 600 400" />
          <path d="M 655 350 A 50 50 0 1 1 755 350 A 50 50 0 1 1 655 350 M 755 300 L 755 420 M 755 420 A 42 42 0 0 1 713 450" />
          <path d="M 810 350 A 50 50 0 1 1 910 350 A 50 50 0 1 1 810 350 M 816 350 L 904 350" />
          <path d="M 965 300 L 965 400 M 965 350 A 50 50 0 0 1 1065 350 M 1065 350 L 1065 400" />
          <path d="M 1148 260 L 1148 400 M 1114 300 L 1182 300" />
        </g>
        {/* "kip" @100% */}
        <g fill="none" strokeWidth="52" strokeLinecap="round">
          <path d="M 1241 250 L 1241 400 M 1241 342 L 1321 288 M 1241 342 L 1327 400" />
          <path d="M 1392 300 L 1392 400" />
          <path d="M 1455 300 L 1455 450 M 1455 300 A 50 50 0 0 1 1455 400" />
        </g>
      </g>
    </svg>
  );
}

/**
 * The Saturn/orbit motif (core-04-orbit-mark.svg, tile removed).
 * Seafoam planet, cream orbit ellipse at -24°, butter satellite.
 */
export function OrbitMark({
  size = 120,
  className,
  drift = false,
  style,
}: {
  size?: number;
  className?: string;
  drift?: boolean;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 1024 1024"
      width={size}
      height={size}
      className={className}
      style={style}
      aria-hidden="true"
    >
      <g className={drift ? "animate-orbit-drift" : undefined} style={{ transformOrigin: "512px 512px" }}>
        <ellipse
          cx="512"
          cy="512"
          rx="330"
          ry="132"
          fill="none"
          stroke="currentColor"
          strokeWidth="22"
          opacity="0.85"
          transform="rotate(-24 512 512)"
        />
        <circle cx="762.5" cy="339.4" r="34" fill={BUTTER} />
      </g>
      <circle cx="512" cy="512" r="110" fill={SEAFOAM} />
    </svg>
  );
}

/**
 * A richer hero orbit system inspired by banner-03-appstore-feature.svg:
 * planet + two orbit rings + multi-pastel satellites. Flat fills only.
 */
export function OrbitSystem({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1024 640" className={className} aria-hidden="true">
      <g style={{ transformOrigin: "512px 320px" }} className="animate-orbit-drift">
        <ellipse
          cx="512"
          cy="320"
          rx="380"
          ry="140"
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          opacity="0.35"
          transform="rotate(-18 512 320)"
        />
        <circle cx="838" cy="204" r="22" fill={BUTTER} transform="rotate(-18 512 320)" />
        <circle cx="196" cy="446" r="14" fill="#c5aef2" transform="rotate(-18 512 320)" />
      </g>
      <g
        style={{ transformOrigin: "512px 320px", animationDirection: "reverse", animationDuration: "140s" }}
        className="animate-orbit-drift"
      >
        <ellipse
          cx="512"
          cy="320"
          rx="270"
          ry="96"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          opacity="0.25"
          transform="rotate(-24 512 320)"
        />
        <circle cx="750" cy="242" r="16" fill="#8ec9f0" transform="rotate(-24 512 320)" />
        <circle cx="286" cy="404" r="11" fill="#efaac0" transform="rotate(-24 512 320)" />
      </g>
      <circle cx="512" cy="320" r="88" fill={SEAFOAM} className="animate-breathe" style={{ transformOrigin: "512px 320px" }} />
      <circle cx="512" cy="320" r="88" fill="none" stroke="currentColor" strokeWidth="6" opacity="0.2" />
    </svg>
  );
}

export type GlyphState = "idle" | "thinking" | "working" | "done" | "error" | "sleeping";

/**
 * Run-state glyphs from sym-02-status-set.svg. Fixed brand colors so meaning
 * reads identically in every theme (coral = error, butter = sleeping).
 */
export function StatusGlyph({
  state,
  size = 32,
  className,
}: {
  state: GlyphState;
  size?: number;
  className?: string;
}) {
  const common = { width: size, height: size, className, "aria-hidden": true as const };
  switch (state) {
    case "idle": // planet with open arc above
      return (
        <svg viewBox="0 0 256 256" {...common}>
          <circle cx="128" cy="150" r="40" fill={SEAFOAM} />
          <path
            d="M 71.4 93.4 A 80 80 0 0 1 184.6 93.4"
            fill="none"
            stroke="currentColor"
            strokeWidth="24"
            strokeLinecap="round"
          />
        </svg>
      );
    case "thinking": // three dots above planet
      return (
        <svg viewBox="256 0 256 256" {...common}>
          <circle cx="384" cy="150" r="40" fill={SEAFOAM} />
          <circle cx="323.9" cy="89.9" r="12" fill="currentColor" className="animate-blink" />
          <circle cx="384" cy="65" r="12" fill="currentColor" className="animate-blink" style={{ animationDelay: "0.2s" }} />
          <circle cx="444.1" cy="89.9" r="12" fill="currentColor" className="animate-blink" style={{ animationDelay: "0.4s" }} />
        </svg>
      );
    case "working": // orbit sweep + butter mote
      return (
        <svg viewBox="512 0 256 256" {...common}>
          <circle cx="640" cy="150" r="40" fill={SEAFOAM} />
          <path
            d="M 720 150 A 80 80 0 1 1 640 70"
            fill="none"
            stroke="currentColor"
            strokeWidth="24"
            strokeLinecap="round"
          />
          <circle cx="583.4" cy="206.6" r="10" fill={BUTTER} />
        </svg>
      );
    case "done": // check
      return (
        <svg viewBox="768 0 256 256" {...common}>
          <circle cx="844" cy="150" r="36" fill={SEAFOAM} />
          <path
            d="M 882 152 L 912 184 L 968 108"
            fill="none"
            stroke="currentColor"
            strokeWidth="24"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "error": // coral planet, butter drop
      return (
        <svg viewBox="1024 0 256 256" {...common}>
          <circle cx="1152" cy="170" r="36" fill={CORAL} />
          <path d="M 1152 45 L 1152 100" fill="none" stroke={BUTTER} strokeWidth="24" strokeLinecap="round" />
          <circle cx="1152" cy="128" r="11" fill={BUTTER} />
        </svg>
      );
    case "sleeping": // smile + zzz
      return (
        <svg viewBox="1280 0 256 256" {...common}>
          <circle cx="1392" cy="158" r="40" fill={SEAFOAM} />
          <path
            d="M 1364 154 Q 1392 172 1420 154"
            fill="none"
            stroke="currentColor"
            strokeWidth="13"
            strokeLinecap="round"
          />
          <path
            d="M 1450 58 L 1486 58 M 1486 58 L 1450 92 M 1450 92 L 1486 92"
            fill="none"
            stroke={BUTTER}
            strokeWidth="13"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}
