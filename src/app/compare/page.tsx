import type { Metadata } from "next";
import Link from "next/link";
import { Kicker, KipCard, Pill, RoadmapBadge, Section, SectionHeader, PageHeader } from "@/components/ui";
import { Reveal } from "@/components/reveal";

export const metadata: Metadata = {
  title: "How Kip compares",
  description:
    "An honest, sourced comparison of AgentKip with the ChatGPT app, Claude Code, and Codex — different tools for different jobs, including what each does better than Kip.",
};

/* ---------------------------------------------------------------------------
   Comparison data. Every competitor cell is a well-known, publicly verifiable
   fact, footnoted to official sources below. No pricing numbers, no guesses
   about internals. Where tools are roughly equal, the cell says so.
--------------------------------------------------------------------------- */

type Cell = { text: string; refs?: number[] };

type CompareRow = {
  dimension: string;
  chatgpt: Cell;
  claudeCode: Cell;
  codex: Cell;
  kip: Cell;
};

const COMPARE_ROWS: CompareRow[] = [
  {
    dimension: "Where it runs",
    chatgpt: {
      text: "OpenAI’s cloud, with polished native mobile and desktop apps plus chatgpt.com.",
      refs: [1],
    },
    claudeCode: {
      text: "A CLI in your terminal, working directly on your local files; model calls go to Anthropic.",
      refs: [2],
    },
    codex: {
      text: "A CLI on your machine, plus cloud agents that run tasks in OpenAI’s infrastructure.",
      refs: [3],
    },
    kip: {
      text: "A native iOS app paired to a server you run on your own hardware (Mac, Linux, Windows, or Docker).",
    },
  },
  {
    dimension: "Who hosts your conversations & data",
    chatgpt: {
      text: "OpenAI hosts your conversations on its servers.",
      refs: [1],
    },
    claudeCode: {
      text: "Sessions live on your machine; prompts and code context are sent to Anthropic’s API to generate responses.",
      refs: [2],
    },
    codex: {
      text: "Cloud-delegated tasks run and are stored in OpenAI’s infrastructure; CLI sessions live on your machine.",
      refs: [3],
    },
    kip: {
      text: "Your server. Conversations, memory, and provider API keys stay on hardware you own.",
    },
  },
  {
    dimension: "Model choice",
    chatgpt: {
      text: "OpenAI models only.",
      refs: [1],
    },
    claudeCode: {
      text: "Anthropic’s Claude models only.",
      refs: [2],
    },
    codex: {
      text: "OpenAI models only.",
      refs: [3],
    },
    kip: {
      text: "Provider-agnostic: the app shows whatever models your server exposes, grouped into human lanes — Quick, Everyday, Deep, Best, Code, Budget, Vision.",
    },
  },
  {
    dimension: "iOS surface",
    chatgpt: {
      text: "A strong native iOS app — chat, voice, and image input in one place.",
      refs: [1],
    },
    claudeCode: {
      text: "None — Claude Code is a terminal tool.",
      refs: [2],
    },
    codex: {
      text: "Cloud tasks can be started and reviewed from inside the ChatGPT iOS app.",
      refs: [3],
    },
    kip: {
      text: "Deep system integration: 7 widgets, 2 Live Activities (incl. Dynamic Island), 6 Control Center / Lock Screen controls, Siri & App Intents, Spotlight, Handoff, and a Share extension.",
      refs: [4],
    },
  },
  {
    dimension: "Voice",
    chatgpt: {
      text: "Best-in-class: natural, low-latency voice conversations built into the app.",
      refs: [1],
    },
    claudeCode: {
      text: "No built-in voice interface.",
      refs: [2],
    },
    codex: {
      text: "No built-in voice interface.",
      refs: [3],
    },
    kip: {
      text: "Dictation, push-to-talk, and background read-aloud with an on-device TTS fallback. Not a realtime voice conversation like ChatGPT’s.",
    },
  },
  {
    dimension: "Works offline",
    chatgpt: {
      text: "No — it needs a connection to OpenAI.",
      refs: [1],
    },
    claudeCode: {
      text: "No — model calls need a connection to Anthropic. (Roughly equal to the others here.)",
      refs: [2],
    },
    codex: {
      text: "No — model calls need a network connection. (Roughly equal to the others here.)",
      refs: [3],
    },
    kip: {
      text: "Limited, and we want to be precise: only specific on-device Apple Intelligence features work offline (drafts, session titles, briefings). Talking to your agent still requires reaching your server.",
      refs: [4],
    },
  },
  {
    dimension: "Long-running tasks from a phone",
    chatgpt: {
      text: "Some tasks (like Deep Research) continue running in OpenAI’s cloud after you ask.",
      refs: [1],
    },
    claudeCode: {
      text: "Sessions are tied to your terminal — the phone isn’t the interface.",
      refs: [2],
    },
    codex: {
      text: "Yes — delegate coding tasks to cloud agents, close the app, and review results later.",
      refs: [3],
    },
    kip: {
      text: "Yes — durable runs survive backgrounding, network drops, and app restarts, with a Live Activity tracking progress and a watchdog for hung runs.",
    },
  },
  {
    dimension: "Cost model",
    chatgpt: {
      text: "Free tier plus paid subscription plans.",
      refs: [1],
    },
    claudeCode: {
      text: "Anthropic API usage billing, or included with paid Claude subscription plans.",
      refs: [2],
    },
    codex: {
      text: "Included with paid ChatGPT plans; API-based usage is also available.",
      refs: [3],
    },
    kip: {
      text: "The app beta is free. You bring your own provider API keys and pay providers directly for what you use — no markup, but also no bundled flat-rate plan.",
    },
  },
  {
    dimension: "Setup effort",
    chatgpt: {
      text: "Zero — download, sign in, done. This is the bar for effortless, and the others don’t match it.",
      refs: [1],
    },
    claudeCode: {
      text: "Low — install the CLI and authenticate. (Roughly equal to Codex.)",
      refs: [2],
    },
    codex: {
      text: "Low — install the CLI or use it from ChatGPT. (Roughly equal to Claude Code.)",
      refs: [3],
    },
    kip: {
      text: "Honestly the highest here, and a real tradeoff: you install and run your own server, add provider keys, and pair your phone by QR code. That effort is the price of owning your data.",
    },
  },
  {
    dimension: "Open / self-hosted",
    chatgpt: {
      text: "Fully managed and closed — nothing to host, nothing to self-host.",
      refs: [1],
    },
    claudeCode: {
      text: "Proprietary CLI; models are hosted by Anthropic — there is no self-hosted model option.",
      refs: [2],
    },
    codex: {
      text: "The Codex CLI is open source; models are hosted by OpenAI.",
      refs: [3],
    },
    kip: {
      text: "Self-hosted by design — the agent server runs entirely on your hardware. The iOS app is in invite-only beta.",
    },
  },
];

/* Official documentation roots only — no fabricated deep links. */
const SOURCES: { id: number; label: string; links: { text: string; href: string }[] }[] = [
  {
    id: 1,
    label: "ChatGPT — official product page and OpenAI Help Center (apps, voice, plans, data handling).",
    links: [
      { text: "chatgpt.com", href: "https://chatgpt.com" },
      { text: "help.openai.com", href: "https://help.openai.com" },
    ],
  },
  {
    id: 2,
    label: "Claude Code — Anthropic’s official documentation (installation, how it works, billing).",
    links: [
      {
        text: "docs.anthropic.com — Claude Code",
        href: "https://docs.anthropic.com/en/docs/claude-code/overview",
      },
    ],
  },
  {
    id: 3,
    label: "Codex — OpenAI’s official Codex pages (CLI, cloud tasks, ChatGPT integration, plans).",
    links: [
      { text: "openai.com/codex", href: "https://openai.com/codex/" },
      { text: "developers.openai.com/codex", href: "https://developers.openai.com/codex/" },
    ],
  },
  {
    id: 4,
    label:
      "Apple Developer — the system frameworks Kip builds on: WidgetKit (widgets), ActivityKit (Live Activities / Dynamic Island), and FoundationModels (on-device Apple Intelligence).",
    links: [
      {
        text: "WidgetKit",
        href: "https://developer.apple.com/documentation/widgetkit",
      },
      {
        text: "ActivityKit",
        href: "https://developer.apple.com/documentation/activitykit",
      },
      {
        text: "FoundationModels",
        href: "https://developer.apple.com/documentation/foundationmodels",
      },
    ],
  },
];

const TLDR_CARDS: { name: string; tone: "sky" | "lilac" | "peach" | "mint"; blurb: string }[] = [
  {
    name: "ChatGPT app",
    tone: "sky",
    blurb:
      "Reach for it when you want zero setup and the most polished all-purpose assistant — voice conversations, image understanding, and managed everything.",
  },
  {
    name: "Claude Code",
    tone: "lilac",
    blurb:
      "Reach for it when you’re at a terminal doing deep, repo-scale coding work and want an agent living inside your codebase.",
  },
  {
    name: "Codex",
    tone: "peach",
    blurb:
      "Reach for it when you want to hand coding tasks to cloud agents in parallel and come back to review the results.",
  },
  {
    name: "AgentKip",
    tone: "mint",
    blurb:
      "Reach for it when you want a personal agent that lives on your own hardware, uses your own API keys, and is driven from a genuinely native iPhone app.",
  },
];

function CellText({ cell }: { cell: Cell }) {
  return (
    <>
      {cell.text}
      {cell.refs?.map((n) => (
        <sup key={n} className="ml-0.5">
          <a href={`#source-${n}`} className="text-accent no-underline hover:underline">
            {n}
          </a>
        </sup>
      ))}
    </>
  );
}

export default function ComparePage() {
  return (
    <div className="py-16 sm:py-24">
      {/* Intro */}
      <Section>
        <Reveal>
          <PageHeader
            kicker="How Kip compares"
            title="Different tools for different jobs"
            lead="Kip isn’t a model, and it isn’t trying to replace the companies that make them. It works with the providers’ models through your own API keys. ChatGPT, Claude Code, and Codex are excellent at what they do — this page maps where each one shines, sources included."
          />
        </Reveal>
      </Section>

      {/* TL;DR cards */}
      <Section className="mt-14">
        <Reveal>
          <Kicker className="mb-5">The short version</Kicker>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TLDR_CARDS.map((card, i) => (
            <Reveal key={card.name} delay={i * 60}>
              <KipCard className="h-full">
                <Pill tone={card.tone}>{card.name}</Pill>
                <p className="mt-3 text-sm leading-relaxed text-ink-secondary">{card.blurb}</p>
              </KipCard>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Detailed table */}
      <Section className="mt-20">
        <Reveal>
          <SectionHeader
            kicker="The detail"
            title="Side by side, with sources"
            lead="Every claim about another tool is footnoted to its official documentation. If a cell is wrong or goes stale, we want to know — there’s a link at the bottom for exactly that."
          />
        </Reveal>
        <Reveal className="mt-8">
          <div className="kip-card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] border-collapse text-left text-sm">
                <caption className="sr-only">
                  Feature comparison of the ChatGPT app, Claude Code, Codex, and AgentKip
                </caption>
                <thead>
                  <tr className="border-b border-hairline">
                    <th scope="col" className="w-[15%] px-5 py-4 align-bottom">
                      <span className="text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-muted">
                        Dimension
                      </span>
                    </th>
                    <th scope="col" className="w-[21%] px-5 py-4 align-bottom">
                      <Pill tone="sky">ChatGPT app</Pill>
                    </th>
                    <th scope="col" className="w-[21%] px-5 py-4 align-bottom">
                      <Pill tone="lilac">Claude Code</Pill>
                    </th>
                    <th scope="col" className="w-[21%] px-5 py-4 align-bottom">
                      <Pill tone="peach">Codex</Pill>
                    </th>
                    <th scope="col" className="w-[22%] bg-elevated px-5 py-4 align-bottom">
                      <Pill tone="mint">AgentKip</Pill>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_ROWS.map((row) => (
                    <tr key={row.dimension} className="border-b border-hairline last:border-b-0">
                      <th
                        scope="row"
                        className="px-5 py-4 align-top text-[13px] font-semibold text-ink"
                      >
                        {row.dimension}
                      </th>
                      <td className="px-5 py-4 align-top leading-relaxed text-ink-secondary">
                        <CellText cell={row.chatgpt} />
                      </td>
                      <td className="px-5 py-4 align-top leading-relaxed text-ink-secondary">
                        <CellText cell={row.claudeCode} />
                      </td>
                      <td className="px-5 py-4 align-top leading-relaxed text-ink-secondary">
                        <CellText cell={row.codex} />
                      </td>
                      <td className="bg-elevated px-5 py-4 align-top leading-relaxed text-ink-secondary">
                        <CellText cell={row.kip} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>
        <Reveal className="mt-4">
          <p className="text-xs text-ink-muted">
            Superscripts link to the official sources listed below. We deliberately avoid quoting
            exact prices or internal details — those change; the official pages are the truth.
          </p>
        </Reveal>
      </Section>

      {/* What they do better */}
      <Section className="mt-20">
        <Reveal>
          <SectionHeader
            kicker="Credit where it’s due"
            title="What these tools do better than Kip"
            lead="We’d rather tell you this ourselves. Each of these tools beats Kip at something real."
          />
        </Reveal>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Reveal>
            <KipCard className="h-full">
              <Pill tone="sky">ChatGPT</Pill>
              <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
                Zero setup, fully managed infrastructure, and the most polished multimodal
                experience on the market — realtime voice, image understanding, and a free tier.
                If you never want to think about servers, ChatGPT is the right call.
              </p>
            </KipCard>
          </Reveal>
          <Reveal delay={60}>
            <KipCard className="h-full">
              <Pill tone="lilac">Claude Code</Pill>
              <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
                Deep, repo-scale coding in the terminal. It reads, edits, and tests across an
                entire codebase in ways a phone-first agent doesn’t. For serious hands-on-keyboard
                development sessions, it’s the better tool.
              </p>
            </KipCard>
          </Reveal>
          <Reveal delay={120}>
            <KipCard className="h-full">
              <Pill tone="peach">Codex</Pill>
              <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
                Cloud-delegated, parallel coding tasks with managed compute. Kick off several
                tasks at once and review the diffs later — Kip’s durable runs are one task on your
                own server, not a fleet in someone else’s cloud.
              </p>
            </KipCard>
          </Reveal>
        </div>
      </Section>

      {/* Sources */}
      <Section className="mt-20">
        <Reveal>
          <Kicker className="mb-5">Sources</Kicker>
        </Reveal>
        <Reveal>
          <KipCard>
            <ol className="space-y-4">
              {SOURCES.map((source) => (
                <li
                  key={source.id}
                  id={`source-${source.id}`}
                  className="flex gap-3 text-sm leading-relaxed text-ink-secondary"
                >
                  <span className="font-semibold text-ink">{source.id}.</span>
                  <span>
                    {source.label}{" "}
                    {source.links.map((link, i) => (
                      <span key={link.href}>
                        {i > 0 ? " · " : ""}
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:underline"
                        >
                          {link.text}
                        </a>
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ol>
          </KipCard>
        </Reveal>
      </Section>

      {/* Honesty footer */}
      <Section className="mt-16">
        <Reveal>
          <KipCard className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <RoadmapBadge />
              <p className="text-sm text-ink-secondary">
                One more disclosure: delegating work from Kip to Claude Code and Codex is planned —
                it is not shipped today. Nothing on this page should read otherwise.
              </p>
            </div>
            <p className="text-sm text-ink-secondary">
              Spotted something outdated or unfair to another tool?{" "}
              <Link href="/contact" className="text-accent hover:underline">
                Tell us
              </Link>{" "}
              and we’ll fix it.
            </p>
          </KipCard>
        </Reveal>
      </Section>
    </div>
  );
}
