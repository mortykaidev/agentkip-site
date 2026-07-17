"use client";

import Link from "next/link";
import { ArrowIcon, ProductPhone } from "@/components/launch";
import { PhoneDemo } from "@/components/demo/phone-demo";
import type { HomeBenefit } from "@/lib/content-types";

export function BenefitsSection({ benefits }: { benefits: HomeBenefit[] }) {
  return (
    <section
      id="what-kip-can-do"
      className="launch-band"
      aria-labelledby="home-benefits-title"
    >
      <h2 id="home-benefits-title" className="text-3xl font-semibold tracking-tight text-ink">
        One AI. Many ways to help.
      </h2>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {benefits.map((benefit) => (
          <article key={benefit.title} className="kip-card h-full">
            <h3 className="font-semibold text-ink">{benefit.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
              {benefit.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function DemoSection() {
  return (
    <section className="home-demo" aria-labelledby="home-demo-title">
      <h2 id="home-demo-title">See Kip in action.</h2>
      <PhoneDemo />
    </section>
  );
}

const SCREENS = [
  {
    src: "/product/walkthrough/01-home.webp",
    alt: "Kip home screen on iPhone",
    caption: "Say hello to Kip.",
  },
  {
    src: "/product/walkthrough/02-compose.webp",
    alt: "Composing a message to Kip on iPhone",
    caption: "Ask in your own words.",
  },
  {
    src: "/product/walkthrough/05-complete.webp",
    alt: "Kip showing a completed answer on iPhone",
    caption: "Your answer, saved for you.",
  },
] as const;

export function ScreensStrip() {
  return (
    <section className="home-screens" aria-labelledby="home-screens-title">
      <h2 id="home-screens-title">A look inside.</h2>
      <p className="home-screens-swipe-cue">Swipe to see all three</p>
      <div className="home-screens-track">
        {SCREENS.map((screen) => (
          <div key={screen.src} className="home-screens-item">
            <ProductPhone src={screen.src} alt={screen.alt} className="launch-phone-inline" />
            <p className="home-screens-caption">{screen.caption}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const COMPARE_ROWS = [
  {
    label: "Saved chats",
    kip: "Your computer",
    others: "Their cloud",
    icon: <HouseIcon />,
  },
  {
    label: "AI models",
    kip: "Your choice",
    others: "Their choice",
    icon: <SparkleIcon />,
  },
  {
    label: "Price",
    kip: "Pay for use",
    others: "Free or paid",
    icon: <TagIcon />,
  },
  {
    label: "Control",
    kip: "Yours",
    others: "Theirs",
    icon: <PowerIcon />,
  },
  {
    label: "Setup",
    kip: "A few steps",
    others: "Sign in",
    icon: <WrenchIcon />,
  },
] as const;

export function CompareStrip() {
  return (
    <section className="home-compare-wrap" aria-labelledby="home-compare-title">
      <h2 id="home-compare-title">How Kip compares.</h2>
      <table className="home-compare">
        <caption className="sr-only">How Kip compares to most AI apps</caption>
        <thead>
          <tr>
            <th scope="col"></th>
            <th scope="col">
              <span className="home-compare-pill home-compare-pill-kip">Kip</span>
            </th>
            <th scope="col">
              <span className="home-compare-pill">Most AI apps</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {COMPARE_ROWS.map((row) => (
            <tr key={row.label}>
              <th scope="row">
                <span className="home-compare-row-icon" aria-hidden="true">
                  {row.icon}
                </span>
                {row.label}
              </th>
              <td>{row.kip}</td>
              <td>{row.others}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="home-compare-mobile">
        {COMPARE_ROWS.map((row) => (
          <article key={row.label} className="home-compare-card">
            <h3>
              <span className="home-compare-row-icon" aria-hidden="true">
                {row.icon}
              </span>
              {row.label}
            </h3>
            <dl>
              <div>
                <dt>Kip</dt>
                <dd>{row.kip}</dd>
              </div>
              <div>
                <dt>Most AI apps</dt>
                <dd>{row.others}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
      <p className="mt-5 max-w-3xl text-sm leading-relaxed text-ink-secondary">
        Kip saves chats on the computer running Noggin. When you choose an online AI model, that
        provider still processes the prompt and reply under its own terms.
      </p>
      <Link href="/compare" className="home-compare-link">
        See the full comparison <ArrowIcon />
      </Link>
    </section>
  );
}

function HouseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9.5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V10" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3c0 4.5-2 6.5-6.5 6.5 4.5 0 6.5 2 6.5 6.5 0-4.5 2-6.5 6.5-6.5-4.5 0-6.5-2-6.5-6.5Z" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 12.5 12.5 20 4 11.5V4h7.5L20 12.5Z" />
      <path d="M8 8h.01" />
    </svg>
  );
}

function PowerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v9" />
      <path d="M7 6.5a7 7 0 1 0 10 0" />
    </svg>
  );
}

function WrenchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14.5 3.5a4.5 4.5 0 0 0-5.9 5.9L3 15l2 2 5.6-5.6a4.5 4.5 0 0 0 5.9-5.9l-2.6 2.6-2-2 2.6-2.6Z" />
    </svg>
  );
}
