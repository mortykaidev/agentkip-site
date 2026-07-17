import type { Metadata } from "next";
import { getContent } from "@/lib/content";
import { Section, SectionHeader, KipCard, Pill, Kicker, type PillTone } from "@/components/ui";
import type { RoadmapItem } from "@/lib/content-types";

export const metadata: Metadata = {
  title: "Roadmap",
  description: "See what the AgentKip team is building, planning, and exploring.",
};

const COLUMNS: { status: RoadmapItem["status"]; heading: string; tone: PillTone }[] = [
  { status: "building", heading: "Building now", tone: "mint" },
  { status: "planned", heading: "Planned", tone: "butter" },
  { status: "exploring", heading: "Exploring", tone: "lilac" },
];

export default async function RoadmapPage() {
  const roadmap = await getContent("roadmap");

  return (
    <Section className="py-16 sm:py-24">
      <SectionHeader kicker="Roadmap" title="What we’re building" />
      <p className="mt-4 max-w-2xl text-sm text-ink-muted">
        Plans can change. A feature is available only after it appears in What changed.
      </p>
      <div className="mt-10 grid gap-8 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const items = roadmap.filter((item) => item.status === col.status);
          return (
            <div key={col.status}>
              <Kicker className="mb-4">{col.heading}</Kicker>
              <div className="space-y-4">
                {items.map((item) => (
                  <KipCard key={item.title}>
                    <Pill tone={col.tone}>{col.heading}</Pill>
                    <h3 className="mt-3 text-base font-semibold text-ink">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                      {item.description}
                    </p>
                  </KipCard>
                ))}
                {items.length === 0 ? (
                  <p className="text-sm text-ink-muted">Nothing here yet.</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
