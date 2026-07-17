import type { Metadata } from "next";
import { getContent } from "@/lib/content";
import { Section, SectionHeader } from "@/components/ui";
import { Reveal } from "@/components/reveal";

export const metadata: Metadata = {
  title: "Quick answers",
  description: "Quick answers about AgentKip, setup, cost, privacy, devices, and the beta.",
};

export default async function FaqPage() {
  const faq = await getContent("faq");

  return (
    <Section className="py-16 sm:py-24">
      <SectionHeader
        kicker="FAQ"
        title="Quick answers"
        lead="Start here for setup, cost, privacy, and beta questions."
      />
      <div className="mt-10 max-w-3xl space-y-3">
        {faq.map((item, i) => (
          <Reveal key={item.question} delay={i * 30}>
            <details className="group kip-card overflow-hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[15px] font-semibold text-ink [&::-webkit-details-marker]:hidden [&::marker]:hidden">
                {item.question}
                <span
                  aria-hidden="true"
                  className="flex size-6 shrink-0 items-center justify-center rounded-full bg-elevated text-ink-secondary transition-transform duration-200 group-open:rotate-45"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12">
                    <path
                      d="M6 1 V11 M1 6 H11"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </summary>
              <div className="px-5 pb-5 text-[15px] leading-relaxed text-ink-secondary">
                {item.answer}
              </div>
            </details>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
