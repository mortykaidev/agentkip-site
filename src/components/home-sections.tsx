"use client";

import Link from "next/link";
import { ArrowIcon, ProductPhone } from "@/components/launch";
import { PhoneDemo } from "@/components/demo/phone-demo";

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
    label: "Where your conversations live",
    kip: "On a little computer you own",
    others: "On the company's computers",
  },
  {
    label: "Which AI answers you",
    kip: "Your pick — mix and match",
    others: "Only theirs",
  },
  {
    label: "Cost during beta",
    kip: "App is free; you pay your AI provider",
    others: "Usually a free tier or subscription",
  },
  {
    label: "Put it offline",
    kip: "Unplug the box you own",
    others: "Use the app’s account controls",
  },
  {
    label: "Setup",
    kip: "Some — that's the tradeoff",
    others: "None — download and go",
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
            <th scope="col">Kip</th>
            <th scope="col">Most AI apps</th>
          </tr>
        </thead>
        <tbody>
          {COMPARE_ROWS.map((row) => (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              <td>{row.kip}</td>
              <td>{row.others}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="home-compare-mobile">
        {COMPARE_ROWS.map((row) => (
          <article key={row.label} className="home-compare-card">
            <h3>{row.label}</h3>
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
      <Link href="/compare" className="home-compare-link">
        See the full comparison <ArrowIcon />
      </Link>
    </section>
  );
}
