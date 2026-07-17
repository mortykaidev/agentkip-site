import Image from "next/image";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";

const LEGACY_CALLOUT_MASKS: Record<string, string> = {
  "/product/walkthrough/01-home.webp": "launch-phone-legacy-mask-home",
  "/product/walkthrough/02-compose.webp": "launch-phone-legacy-mask-compose",
  "/product/walkthrough/05-complete.webp": "launch-phone-legacy-mask-complete",
};

export function ProductPhone({
  src = "/product/walkthrough/01-home.webp",
  alt = "AgentKip home screen on iPhone",
  priority = false,
  className = "",
}: {
  src?: string;
  alt?: string;
  priority?: boolean;
  className?: string;
}) {
  const legacyCalloutMask = LEGACY_CALLOUT_MASKS[src];

  return (
    <div className={`launch-phone ${className}`}>
      <div className="launch-phone-speaker" aria-hidden="true" />
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes="(max-width: 767px) 300px, (max-width: 1199px) 340px, 390px"
        className="launch-phone-screen"
      />
      {legacyCalloutMask ? (
        <span className={`launch-phone-legacy-mask ${legacyCalloutMask}`} aria-hidden="true" />
      ) : null}
    </div>
  );
}

const ORBIT_STROKE = "color-mix(in srgb, var(--ink), transparent 76%)";

export function OrbitBackdrop() {
  return (
    <div className="launch-orbits" aria-hidden="true">
      <svg
        viewBox="-320 -170 640 340"
        preserveAspectRatio="xMidYMid meet"
        width="100%"
        height="100%"
        aria-hidden="true"
      >
        <g transform="rotate(-13)">
          <ellipse
            rx="305"
            ry="144"
            fill="none"
            stroke={ORBIT_STROKE}
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          <circle
            cx="233.6"
            cy="-92.6"
            r="5"
            fill="var(--mint)"
            className="animate-breathe"
            style={{ transformOrigin: "233.6px -92.6px" }}
          />
          <circle
            cx="-249.8"
            cy="-82.6"
            r="5"
            fill="var(--butter)"
            className="animate-breathe"
            style={{ transformOrigin: "-249.8px -82.6px" }}
          />
        </g>
        <g transform="rotate(14)">
          <ellipse
            rx="235"
            ry="107"
            fill="none"
            stroke={ORBIT_STROKE}
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          <circle
            cx="-213.0"
            cy="45.2"
            r="5"
            fill="var(--lilac)"
            className="animate-breathe"
            style={{ transformOrigin: "-213px 45.2px" }}
          />
          <circle
            cx="192.5"
            cy="61.4"
            r="5"
            fill="var(--sky)"
            className="animate-breathe"
            style={{ transformOrigin: "192.5px 61.4px" }}
          />
        </g>
      </svg>
    </div>
  );
}

const FLOW_STEPS = [
  {
    number: "1",
    tone: "lilac",
    title: "Ask",
    body: "Say it.",
    preview: <ComposerPreview />,
  },
  {
    number: "2",
    tone: "mint",
    title: "Follow",
    body: "Watch it work.",
    preview: <ReviewPreview />,
  },
  {
    number: "3",
    tone: "butter",
    title: "Done",
    body: "Saved.",
    preview: <DonePreview />,
  },
] as const;

export function RunFlow() {
  return (
    <section id="product" className="launch-band" aria-labelledby="run-flow-title">
      <h2 id="run-flow-title" className="sr-only">
        A run from start to finish
      </h2>
      <div className="launch-flow">
        {FLOW_STEPS.map((step, index) => (
          <div key={step.title} className="contents">
            <article className="launch-flow-step">
              {step.preview}
              <div className="launch-step-row">
                <span className={`launch-step-number launch-tone-${step.tone}`}>{step.number}</span>
                <div className="launch-step-copy">
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </div>
            </article>
            {index < FLOW_STEPS.length - 1 ? <FlowArrow /> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function ComposerPreview() {
  return (
    <div className="launch-mini-panel launch-composer" aria-hidden="true">
      <span>Message Kip</span>
      <div>
        <span>+</span>
        <span className="launch-mini-chip">Kip</span>
        <span className="launch-mini-chip">Everyday</span>
        <span className="launch-mini-send">↑</span>
      </div>
    </div>
  );
}

function ReviewPreview() {
  return (
    <div className="launch-mini-panel launch-review" aria-hidden="true">
      <div className="launch-review-steps">
        <span className="launch-review-skeleton-line" />
        <span className="launch-review-skeleton-line" />
      </div>
      <span className="launch-review-state">Review</span>
    </div>
  );
}

function DonePreview() {
  return (
    <div className="launch-mini-panel launch-done" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 2.5 2.5L16 9" />
      </svg>
      <span className="launch-done-label">Saved</span>
    </div>
  );
}

function FlowArrow() {
  return (
    <svg className="launch-flow-arrow" viewBox="0 0 52 18" aria-hidden="true">
      <path d="M2 9h42" />
      <path d="m38 3 7 6-7 6" />
    </svg>
  );
}

const ARCHITECTURE_ITEMS = [
  {
    title: "Kip on iPhone",
    body: "Ask and follow along.",
    icon: <PhoneIcon />,
  },
  {
    title: "Your connection",
    body: "Links Kip and Noggin.",
    icon: <ConnectionIcon />,
  },
  {
    title: "Your Noggin",
    body: "Runs on your computer.",
    icon: <ServerIcon />,
  },
] as const;

export function ArchitectureStrip() {
  return (
    <section id="how-it-works" className="launch-band" aria-labelledby="architecture-title">
      <h2 id="architecture-title" className="sr-only">
        How AgentKip connects
      </h2>
      <div className="launch-architecture">
        {ARCHITECTURE_ITEMS.map((item, index) => (
          <div key={item.title} className="contents">
            <article className="launch-architecture-item">
              <span className="launch-architecture-icon">{item.icon}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            </article>
            {index < ARCHITECTURE_ITEMS.length - 1 ? (
              <svg className="launch-architecture-arrow" viewBox="0 0 44 20" aria-hidden="true">
                <path d="m9 3-7 7 7 7M2 10h40M35 3l7 7-7 7" />
              </svg>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

export function GetKipStrip() {
  return (
    <section className="launch-get-strip" aria-labelledby="get-strip-title">
      <div className="launch-qr" aria-hidden="true">
        <QRCodeSVG
          value="https://agentkip.ai/get"
          size={76}
          level="M"
          marginSize={1}
          bgColor="#f0eee6"
          fgColor="#181918"
        />
      </div>
      <div>
        <h2 id="get-strip-title">Get Kip</h2>
        <p>
          Open <Link href="/get">agentkip.ai/get</Link> on your iPhone.
        </p>
        <Link href="/docs/deploy" className="launch-text-link">
          Open the setup guide <ArrowIcon />
        </Link>
      </div>
      <Link href="/get" className="launch-mobile-get">
        Open Get Kip <ArrowIcon />
      </Link>
    </section>
  );
}

export function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3 10h13M11 5l5 5-5 5" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6.5" y="2.5" width="11" height="19" rx="2" />
      <path d="M10 18.5h4" />
    </svg>
  );
}

function ConnectionIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="10" width="14" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
    </svg>
  );
}

function ServerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="18" height="7" rx="2" />
      <rect x="3" y="14" width="18" height="7" rx="2" />
      <path d="M7 6.5h.01M7 17.5h.01M11 6.5h7M11 17.5h7" />
    </svg>
  );
}
