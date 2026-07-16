import type { Metadata } from "next";
import Link from "next/link";
import { ArchitectureStrip, ArrowIcon, GetKipStrip } from "@/components/launch";

export const metadata: Metadata = {
  title: "How AgentKip works",
  description:
    "Kip is the app on your iPhone. Noggin is the small computer at home that does the thinking. Here's how the two fit together.",
};

const STEPS = [
  {
    number: "1",
    tone: "lilac",
    title: "Put Kip on your iPhone.",
    body: "That’s the app you talk to. Next, pair it with the small computer at home that runs Noggin.",
  },
  {
    number: "2",
    tone: "mint",
    title: "Pair it with its brain.",
    body: "Noggin is a small computer that lives in your home — a mini-PC, no bigger than a book. That's what Kip talks to when it needs to think.",
  },
  {
    number: "3",
    tone: "butter",
    title: "Ask for help anywhere.",
    body: "Kip works wherever you are. Noggin keeps your history and controls at home; your chosen AI provider processes requests when you use one.",
  },
] as const;

export default function HowItWorksPage() {
  return (
    <div className="launch-page">
      <section className="launch-band">
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          How AgentKip works
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-secondary">
          Kip is the app you talk to, right on your iPhone. Noggin is the small computer at home
          that keeps your history and controls close to you. It can use the AI provider you choose
          when it needs a response.
        </p>
      </section>

      <section className="launch-band" aria-labelledby="how-it-works-steps">
        <h2 id="how-it-works-steps" className="sr-only">
          Three steps to get started
        </h2>
        <ol className="flex flex-col gap-8">
          {STEPS.map((step) => (
            <li key={step.number} className="flex items-start gap-4">
              <span className={`launch-step-number launch-tone-${step.tone}`}>{step.number}</span>
              <div className="launch-step-copy">
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <ArchitectureStrip />

      <section className="launch-band">
        <h2 className="text-lg font-semibold text-ink">What you&apos;ll need</h2>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-secondary">
          You&apos;ll need three things: an iPhone, a small computer for your home (a mini-PC
          works great), and about an evening to get it running.
        </p>
        <Link href="/docs/deploy" className="launch-text-link mt-5 inline-flex">
          Advanced self-hosting <ArrowIcon />
        </Link>
      </section>

      <GetKipStrip />
    </div>
  );
}
