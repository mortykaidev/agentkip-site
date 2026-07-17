import type { Metadata } from "next";
import { KipCard, Pill, Section, SectionHeader, type PillTone } from "@/components/ui";
import { StatusGlyph } from "@/components/brand";
import { Reveal } from "@/components/reveal";
import { getContent } from "@/lib/content";

export const metadata: Metadata = {
  title: "Ways Kip can help",
  description: "See everyday ways Kip can help you plan, write, scan, focus, and keep going.",
};

/* Pastel rotation for tag pills — deterministic per tag position. */
const TAG_TONES: PillTone[] = ["sky", "mint", "pink", "peach", "lilac", "butter"];

export default async function UseCasesPage() {
  const useCases = await getContent("useCases");

  return (
    <div className="py-16 sm:py-24">
      <Section>
        <Reveal>
          <SectionHeader
            kicker="Everyday ideas"
            title="Ways Kip can help"
            lead="Start with one of these, or ask in your own words."
          />
        </Reveal>
      </Section>

      <Section className="mt-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {useCases.map((useCase, i) => (
            <Reveal key={useCase.title} delay={(i % 3) * 60}>
              <KipCard className="flex h-full flex-col">
                <h3 className="font-semibold leading-snug">{useCase.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                  {useCase.description}
                </p>
                {useCase.tags.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {useCase.tags.map((tag, tagIndex) => (
                      <Pill key={tag} tone={TAG_TONES[tagIndex % TAG_TONES.length]}>
                        {tag}
                      </Pill>
                    ))}
                  </div>
                ) : null}
                <div className="mt-auto pt-5">
                  {useCase.result === null ? (
                    <div className="flex items-center gap-2.5 rounded-[10px] border border-dashed border-hairline px-4 py-3">
                      <StatusGlyph state="sleeping" size={22} className="shrink-0" />
                      <p className="text-[13px] text-ink-muted">Example result coming soon</p>
                    </div>
                  ) : (
                    <div className="rounded-[10px] border border-hairline bg-elevated p-4">
                      <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted">
                        <StatusGlyph state="done" size={16} className="shrink-0" />
                        Example result
                      </p>
                      <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-ink-secondary">
                        {useCase.result}
                      </pre>
                    </div>
                  )}
                </div>
              </KipCard>
            </Reveal>
          ))}
        </div>
      </Section>
    </div>
  );
}
