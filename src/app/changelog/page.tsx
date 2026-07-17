import type { Metadata } from "next";
import { getContent } from "@/lib/content";
import { Section, SectionHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "What changed",
  description: "A dated list of changes available in AgentKip.",
};

export default async function ChangelogPage() {
  const changelog = await getContent("changelog");

  return (
    <Section className="py-16 sm:py-24">
      <SectionHeader kicker="Changelog" title="What changed" lead="New work, in date order." />
      <div className="relative mt-10 max-w-2xl">
        <div
          aria-hidden="true"
          className="absolute bottom-2 left-[5px] top-2 w-px bg-hairline"
        />
        <ul className="space-y-10">
          {changelog.map((entry) => (
            <li key={entry.date} className="relative pl-8">
              <span
                aria-hidden="true"
                className="absolute left-0 top-1.5 size-[11px] rounded-full border-2 border-accent bg-bg"
              />
              <time
                dateTime={entry.date}
                className="font-mono text-xs uppercase tracking-wide text-ink-muted"
              >
                {entry.date}
              </time>
              <h3 className="mt-1.5 text-lg font-semibold text-ink">{entry.title}</h3>
              <ul className="mt-2 space-y-1.5">
                {entry.notes.map((note) => (
                  <li key={note} className="flex gap-2 text-sm leading-relaxed text-ink-secondary">
                    <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-ink-muted" />
                    {note}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
