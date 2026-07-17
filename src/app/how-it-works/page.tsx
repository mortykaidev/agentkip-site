import type { Metadata } from "next";
import Link from "next/link";
import { ArchitectureStrip, ArrowIcon, GetKipStrip } from "@/components/launch";

export const metadata: Metadata = {
  title: "Kip on your iPhone",
  description:
    "See how Kip on your iPhone connects to Noggin and the AI you choose.",
};

const STEPS = [
  {
    number: "1",
    tone: "lilac",
    title: "Get Kip on iPhone",
    body: "Open Kip whenever you want to ask, write, plan, scan, or check a task.",
  },
  {
    number: "2",
    tone: "mint",
    title: "Set up Noggin",
    body: "Noggin runs on a computer you control and keeps your saved chats, settings, and AI connections there.",
  },
  {
    number: "3",
    tone: "butter",
    title: "Pair and start",
    body: "Scan the pairing code, choose an AI, and ask for help from your iPhone.",
  },
] as const;

export default function HowItWorksPage() {
  return (
    <div className="launch-page">
      <section className="launch-band">
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Kip on your iPhone
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-secondary">
          Kip is the app you use. Noggin is the part that runs on a computer you control. When you
          choose an online AI, that company processes the request and sends the answer back.
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
          You&apos;ll need an iPhone, a computer that can stay on, and an account with the AI company
          you want to use.
        </p>
        <Link href="/docs/deploy" className="launch-text-link mt-5 inline-flex">
          Open the setup guide <ArrowIcon />
        </Link>
      </section>

      <GetKipStrip />
    </div>
  );
}
