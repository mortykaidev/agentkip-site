import type { Metadata } from "next";
import Link from "next/link";
import type { ReactElement } from "react";
import { Kicker, KipCard, Pill, RoadmapBadge, Section, SectionHeader } from "@/components/ui";
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

   `short` is a 2-5 word compression of `text` for the Apple-style headline
   treatment — it must never introduce a claim the full sentence doesn't
   already make.
--------------------------------------------------------------------------- */

type Cell = { short: string; text: string; refs?: number[] };

type IconProps = { className?: string };

type CompareRow = {
  dimension: string;
  icon: (props: IconProps) => ReactElement;
  chatgpt: Cell;
  claudeCode: Cell;
  codex: Cell;
  kip: Cell;
};

/* ---------------------------------------------------------------------------
   Small inline stroke icons, one per dimension. viewBox 24, strokeWidth 1.4,
   no fills except tiny accent dots — kept local to this file since they're
   single-use.
--------------------------------------------------------------------------- */

function IconServer({ className = "" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="4" y="4" width="16" height="6" rx="1.5" />
      <rect x="4" y="14" width="16" height="6" rx="1.5" />
      <circle cx="7.5" cy="7" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="7.5" cy="17" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconLock({ className = "" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function IconSparkle({ className = "" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 4c.6 3.2 2.2 4.8 5.4 5.4-3.2.6-4.8 2.2-5.4 5.4-.6-3.2-2.2-4.8-5.4-5.4C9.8 8.8 11.4 7.2 12 4Z" />
      <path d="M18.5 15.5c.3 1.5 1 2.2 2.5 2.5-1.5.3-2.2 1-2.5 2.5-.3-1.5-1-2.2-2.5-2.5 1.5-.3 2.2-1 2.5-2.5Z" />
    </svg>
  );
}

function IconPhone({ className = "" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="7" y="3" width="10" height="18" rx="2.2" />
      <path d="M10.5 18h3" />
    </svg>
  );
}

function IconMic({ className = "" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="9.5" y="3.5" width="5" height="10" rx="2.5" />
      <path d="M6.5 11a5.5 5.5 0 0 0 11 0" />
      <path d="M12 16.5V20" />
      <path d="M9 20h6" />
    </svg>
  );
}

function IconWifiOff({ className = "" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 8.5a16 16 0 0 1 4.6-2.8" />
      <path d="M9.5 5.2A16 16 0 0 1 21 8.5" />
      <path d="M6.3 12.2a11 11 0 0 1 3-1.7" />
      <path d="M14.5 10.4a11 11 0 0 1 3.2 1.8" />
      <path d="M9.8 15.9a5.5 5.5 0 0 1 4.4 0" />
      <circle cx="12" cy="19" r="0.8" fill="currentColor" stroke="none" />
      <path d="M3 3l18 18" />
    </svg>
  );
}

function IconClock({ className = "" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

function IconTag({ className = "" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M11.5 4h-5A2.5 2.5 0 0 0 4 6.5v5c0 .53.21 1.04.59 1.41l7.5 7.5a2 2 0 0 0 2.82 0l4.68-4.68a2 2 0 0 0 0-2.82l-7.5-7.5A2 2 0 0 0 11.5 4Z" />
      <circle cx="8.2" cy="8.2" r="1.1" />
    </svg>
  );
}

function IconWrench({ className = "" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M14.7 6.3a4 4 0 0 0-5.4 4.9L4 16.5 7.5 20l5.3-5.3a4 4 0 0 0 4.9-5.4l-2.6 2.6-2.1-2.1 2.6-2.6Z" />
    </svg>
  );
}

function IconUnlock({ className = "" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 7.6-1.8" />
    </svg>
  );
}

const COMPARE_ROWS: CompareRow[] = [
  {
    dimension: "Where it runs",
    icon: IconServer,
    chatgpt: {
      short: "OpenAI’s cloud",
      text: "OpenAI’s cloud, with polished native mobile and desktop apps plus chatgpt.com.",
      refs: [1],
    },
    claudeCode: {
      short: "Your terminal, their models",
      text: "A CLI in your terminal, working directly on your local files; model calls go to Anthropic.",
      refs: [2],
    },
    codex: {
      short: "CLI plus OpenAI’s cloud",
      text: "A CLI on your machine, plus cloud agents that run tasks in OpenAI’s infrastructure.",
      refs: [3],
    },
    kip: {
      short: "Your own hardware",
      text: "A native iOS app paired to a server you run on your own hardware (Mac, Linux, Windows, or Docker).",
    },
  },
  {
    dimension: "Who hosts your conversations & data",
    icon: IconLock,
    chatgpt: {
      short: "OpenAI’s servers",
      text: "OpenAI hosts your conversations on its servers.",
      refs: [1],
    },
    claudeCode: {
      short: "Local session, cloud inference",
      text: "Sessions live on your machine; prompts and code context are sent to Anthropic’s API to generate responses.",
      refs: [2],
    },
    codex: {
      short: "OpenAI’s infrastructure",
      text: "Cloud-delegated tasks run and are stored in OpenAI’s infrastructure; CLI sessions live on your machine.",
      refs: [3],
    },
    kip: {
      short: "Your server, period",
      text: "Your server. Conversations, memory, and provider API keys stay on hardware you own.",
    },
  },
  {
    dimension: "Model choice",
    icon: IconSparkle,
    chatgpt: {
      short: "OpenAI models only",
      text: "OpenAI models only.",
      refs: [1],
    },
    claudeCode: {
      short: "Claude models only",
      text: "Anthropic’s Claude models only.",
      refs: [2],
    },
    codex: {
      short: "OpenAI models only",
      text: "OpenAI models only.",
      refs: [3],
    },
    kip: {
      short: "Whatever your server exposes",
      text: "Provider-agnostic: the app shows whatever models your server exposes, grouped into human lanes — Quick, Everyday, Deep, Best, Code, Budget, Vision.",
    },
  },
  {
    dimension: "iOS surface",
    icon: IconPhone,
    chatgpt: {
      short: "Strong native app",
      text: "A strong native iOS app — chat, voice, and image input in one place.",
      refs: [1],
    },
    claudeCode: {
      short: "No iOS app",
      text: "None — Claude Code is a terminal tool.",
      refs: [2],
    },
    codex: {
      short: "Tasks via the ChatGPT app",
      text: "Cloud tasks can be started and reviewed from inside the ChatGPT iOS app.",
      refs: [3],
    },
    kip: {
      short: "Deep system integration",
      text: "Deep system integration: 7 widgets, 2 Live Activities (incl. Dynamic Island), 6 Control Center / Lock Screen controls, Siri & App Intents, Spotlight, Handoff, and a Share extension.",
      refs: [4],
    },
  },
  {
    dimension: "Voice",
    icon: IconMic,
    chatgpt: {
      short: "Best-in-class voice",
      text: "Best-in-class: natural, low-latency voice conversations built into the app.",
      refs: [1],
    },
    claudeCode: {
      short: "No voice interface",
      text: "No built-in voice interface.",
      refs: [2],
    },
    codex: {
      short: "No voice interface",
      text: "No built-in voice interface.",
      refs: [3],
    },
    kip: {
      short: "Dictation & read-aloud",
      text: "Dictation, push-to-talk, and background read-aloud with an on-device TTS fallback. Not a realtime voice conversation like ChatGPT’s.",
    },
  },
  {
    dimension: "Works offline",
    icon: IconWifiOff,
    chatgpt: {
      short: "No",
      text: "No — it needs a connection to OpenAI.",
      refs: [1],
    },
    claudeCode: {
      short: "No",
      text: "No — model calls need a connection to Anthropic. (Roughly equal to the others here.)",
      refs: [2],
    },
    codex: {
      short: "No",
      text: "No — model calls need a network connection. (Roughly equal to the others here.)",
      refs: [3],
    },
    kip: {
      short: "Only a few on-device bits",
      text: "Limited, and we want to be precise: only specific on-device Apple Intelligence features work offline (drafts, session titles, briefings). Talking to your agent still requires reaching your server.",
      refs: [4],
    },
  },
  {
    dimension: "Long-running tasks from a phone",
    icon: IconClock,
    chatgpt: {
      short: "Some, in the cloud",
      text: "Some tasks (like Deep Research) continue running in OpenAI’s cloud after you ask.",
      refs: [1],
    },
    claudeCode: {
      short: "Not phone-driven",
      text: "Sessions are tied to your terminal — the phone isn’t the interface.",
      refs: [2],
    },
    codex: {
      short: "Yes, delegate and review",
      text: "Yes — delegate coding tasks to cloud agents, close the app, and review results later.",
      refs: [3],
    },
    kip: {
      short: "Yes, durable on your server",
      text: "Yes — durable runs survive backgrounding, network drops, and app restarts, with a Live Activity tracking progress and a watchdog for hung runs.",
    },
  },
  {
    dimension: "Cost model",
    icon: IconTag,
    chatgpt: {
      short: "Free plus subscription",
      text: "Free tier plus paid subscription plans.",
      refs: [1],
    },
    claudeCode: {
      short: "API usage or subscription",
      text: "Anthropic API usage billing, or included with paid Claude subscription plans.",
      refs: [2],
    },
    codex: {
      short: "Included with ChatGPT plans",
      text: "Included with paid ChatGPT plans; API-based usage is also available.",
      refs: [3],
    },
    kip: {
      short: "Free app, your own keys",
      text: "The app beta is free. You bring your own provider API keys and pay providers directly for what you use — no markup, but also no bundled flat-rate plan.",
    },
  },
  {
    dimension: "Setup effort",
    icon: IconWrench,
    chatgpt: {
      short: "Zero effort",
      text: "Zero — download, sign in, done. This is the bar for effortless, and the others don’t match it.",
      refs: [1],
    },
    claudeCode: {
      short: "Low effort",
      text: "Low — install the CLI and authenticate. (Roughly equal to Codex.)",
      refs: [2],
    },
    codex: {
      short: "Low effort",
      text: "Low — install the CLI or use it from ChatGPT. (Roughly equal to Claude Code.)",
      refs: [3],
    },
    kip: {
      short: "Highest — you self-host",
      text: "Honestly the highest here, and a real tradeoff: you install and run your own server, add provider keys, and pair your phone by QR code. That effort is the price of owning your data.",
    },
  },
  {
    dimension: "Open / self-hosted",
    icon: IconUnlock,
    chatgpt: {
      short: "Fully managed, closed",
      text: "Fully managed and closed — nothing to host, nothing to self-host.",
      refs: [1],
    },
    claudeCode: {
      short: "Proprietary CLI",
      text: "Proprietary CLI; models are hosted by Anthropic — there is no self-hosted model option.",
      refs: [2],
    },
    codex: {
      short: "CLI open, models closed",
      text: "The Codex CLI is open source; models are hosted by OpenAI.",
      refs: [3],
    },
    kip: {
      short: "Self-hosted by design",
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

/** Apple-style cell: bold short claim, full sentence as muted fine print below. */
function CompareCell({ cell }: { cell: Cell }) {
  return (
    <>
      <p className="text-[15px] font-semibold leading-snug text-ink sm:text-[16px]">
        {cell.short}
      </p>
      <p className="mt-2 text-[12px] leading-relaxed text-ink-muted sm:text-[13px]">
        <CellText cell={cell} />
      </p>
    </>
  );
}

export default function ComparePage() {
  return (
    <div className="py-16 sm:py-24">
      {/* Intro */}
      <Section>
        <Reveal>
          <SectionHeader
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
                      <th scope="row" className="px-5 py-7 align-top">
                        <div className="flex flex-col items-start gap-2.5">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-hairline text-ink-secondary">
                            <row.icon className="h-[18px] w-[18px]" />
                          </span>
                          <span className="text-[13px] font-semibold leading-snug text-ink">
                            {row.dimension}
                          </span>
                        </div>
                      </th>
                      <td className="px-5 py-7 align-top">
                        <CompareCell cell={row.chatgpt} />
                      </td>
                      <td className="px-5 py-7 align-top">
                        <CompareCell cell={row.claudeCode} />
                      </td>
                      <td className="px-5 py-7 align-top">
                        <CompareCell cell={row.codex} />
                      </td>
                      <td className="bg-elevated px-5 py-7 align-top">
                        <CompareCell cell={row.kip} />
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
