import type { Metadata } from "next";
import Link from "next/link";
import type { ReactElement } from "react";
import { Kicker, KipCard, Pill, RoadmapBadge, Section, SectionHeader } from "@/components/ui";
import { Reveal } from "@/components/reveal";

export const metadata: Metadata = {
  title: "Pick the AI that fits",
  description: "Compare AgentKip, ChatGPT, Claude Code, and Codex in plain language.",
};

/* ---------------------------------------------------------------------------
   Comparison data. Every competitor cell is a well-known, publicly verifiable
   fact, footnoted to official sources below. No pricing numbers, no guesses
   about internals. Where tools are roughly equal, the cell says so.

   `short` is a 1-3 word compression of `text` for the headline
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
    dimension: "Main use",
    icon: IconSparkle,
    chatgpt: {
      short: "Everyday help",
      text: "A ready-to-use assistant for writing, research, images, voice, and everyday questions.",
      refs: [1],
    },
    claudeCode: {
      short: "Coding agent",
      text: "A coding agent available across terminal, editor, desktop, web, and mobile surfaces.",
      refs: [2],
    },
    codex: {
      short: "Coding work",
      text: "A coding agent for local work, cloud tasks, reviews, and other software projects.",
      refs: [3],
    },
    kip: {
      short: "iPhone help",
      text: "An iPhone-first helper for planning, writing, research, scanning, coding, and longer tasks.",
    },
  },
  {
    dimension: "Where it works",
    icon: IconServer,
    chatgpt: {
      short: "OpenAI cloud",
      text: "ChatGPT is a managed service available on the web and in OpenAI apps.",
      refs: [1],
    },
    claudeCode: {
      short: "Local or cloud",
      text: "Claude Code can work with files on your computer or run tasks in Anthropic-managed cloud sessions.",
      refs: [2],
    },
    codex: {
      short: "Local or cloud",
      text: "Codex can work from local tools or run tasks in an OpenAI cloud environment.",
      refs: [3],
    },
    kip: {
      short: "iPhone plus Noggin",
      text: "Kip runs on your iPhone and connects to Noggin on a computer you control.",
    },
  },
  {
    dimension: "Saved work",
    icon: IconLock,
    chatgpt: {
      short: "OpenAI account",
      text: "ChatGPT saves chats in your OpenAI account. Retention and model-improvement choices depend on your plan and settings.",
      refs: [1],
    },
    claudeCode: {
      short: "Local or cloud",
      text: "Local sessions work with your project; web and mobile tasks can run in Anthropic-managed infrastructure.",
      refs: [2],
    },
    codex: {
      short: "Local or cloud",
      text: "Local sessions work with files on your computer; cloud tasks use an OpenAI environment.",
      refs: [3],
    },
    kip: {
      short: "Your Noggin",
      text: "Kip saves chats, memory, and AI keys on the computer running your Noggin.",
    },
  },
  {
    dimension: "AI choice",
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
      short: "Your choice",
      text: "Kip shows the models connected to your Noggin, including supported online and local options.",
    },
  },
  {
    dimension: "iPhone",
    icon: IconPhone,
    chatgpt: {
      short: "Full app",
      text: "ChatGPT has an iPhone app with chat, voice, and image features.",
      refs: [1],
    },
    claudeCode: {
      short: "Claude iOS app",
      text: "Claude Code tasks can start or continue in the Claude iOS app, and Remote Control can follow a local session.",
      refs: [2],
    },
    codex: {
      short: "Remote in ChatGPT",
      text: "Remote in the ChatGPT mobile app can start, steer, review, and organize Codex work on connected computers.",
      refs: [3],
    },
    kip: {
      short: "Full app",
      text: "Kip has widgets, Live Activities, Control Center actions, Siri shortcuts, Spotlight, Handoff, and sharing.",
      refs: [4],
    },
  },
  {
    dimension: "Voice",
    icon: IconMic,
    chatgpt: {
      short: "Voice chat",
      text: "ChatGPT supports back-and-forth voice conversations in its mobile app.",
      refs: [1],
    },
    claudeCode: {
      short: "No built-in",
      text: "No built-in voice interface.",
      refs: [2],
    },
    codex: {
      short: "No built-in",
      text: "No built-in voice interface.",
      refs: [3],
    },
    kip: {
      short: "Dictate and listen",
      text: "Kip supports dictation, push-to-talk, and read-aloud, but not a live voice conversation like ChatGPT.",
    },
  },
  {
    dimension: "Works offline",
    icon: IconWifiOff,
    chatgpt: {
      short: "No AI",
      text: "ChatGPT needs a network connection for AI responses.",
      refs: [1],
    },
    claudeCode: {
      short: "No AI",
      text: "Claude Code needs a network connection for AI processing.",
      refs: [2],
    },
    codex: {
      short: "No AI",
      text: "Codex needs a network connection for AI processing.",
      refs: [3],
    },
    kip: {
      short: "Small on-device jobs",
      text: "A few Apple Intelligence extras can run on the iPhone. Normal Kip requests still need Noggin and the chosen AI.",
      refs: [4],
    },
  },
  {
    dimension: "Long tasks",
    icon: IconClock,
    chatgpt: {
      short: "Cloud tasks",
      text: "Some ChatGPT tasks can continue in OpenAI’s cloud after you leave the chat.",
      refs: [1],
    },
    claudeCode: {
      short: "Local or cloud",
      text: "Claude Code supports longer local sessions, cloud sessions, and scheduled routines.",
      refs: [2],
    },
    codex: {
      short: "Cloud tasks",
      text: "Codex cloud tasks can continue in a managed environment for later review.",
      refs: [3],
    },
    kip: {
      short: "Noggin tasks",
      text: "Kip can keep a task on Noggin moving while the iPhone app is in the background.",
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
      short: "Plan or usage",
      text: "Anthropic API usage billing, or included with paid Claude subscription plans.",
      refs: [2],
    },
    codex: {
      short: "ChatGPT plans",
      text: "Included with paid ChatGPT plans; API-based usage is also available.",
      refs: [3],
    },
    kip: {
      short: "Pay for use",
      text: "The Kip beta is free. You pay the AI company you choose for what you use, with no AgentKip markup.",
    },
  },
  {
    dimension: "Setup effort",
    icon: IconWrench,
    chatgpt: {
      short: "Sign in",
      text: "Open the app or website and sign in.",
      refs: [1],
    },
    claudeCode: {
      short: "Install and connect",
      text: "Install Claude Code, then connect an Anthropic, Claude, or supported cloud account.",
      refs: [2],
    },
    codex: {
      short: "Install or sign-in",
      text: "Use a Codex surface and connect the account or project it needs.",
      refs: [3],
    },
    kip: {
      short: "A few steps",
      text: "Set up Noggin, add an AI key, and pair your iPhone with a code.",
    },
  },
  {
    dimension: "Self-hosted",
    icon: IconUnlock,
    chatgpt: {
      short: "No",
      text: "ChatGPT is a managed OpenAI service.",
      refs: [1],
    },
    claudeCode: {
      short: "No",
      text: "Claude Code uses Claude through Anthropic or a supported cloud service.",
      refs: [2],
    },
    codex: {
      short: "Tools only",
      text: "Some Codex tools are open source, while OpenAI provides the hosted AI models and cloud service.",
      refs: [3],
    },
    kip: {
      short: "Yes",
      text: "You run Noggin on a computer you control. Online AI companies still process requests sent to their models.",
    },
  },
];

/* Official documentation only. Recheck these claims when the products change. */
const SOURCES: { id: number; label: string; links: { text: string; href: string }[] }[] = [
  {
    id: 1,
    label: "ChatGPT — official pricing and voice help.",
    links: [
      { text: "ChatGPT pricing", href: "https://openai.com/chatgpt/pricing/" },
      { text: "Voice help", href: "https://help.openai.com/en/articles/8400625-voice-mode" },
    ],
  },
  {
    id: 2,
    label: "Claude Code — official overview and setup guide.",
    links: [
      {
        text: "Claude Code overview",
        href: "https://code.claude.com/docs/en/overview",
      },
      {
        text: "Claude Code setup",
        href: "https://code.claude.com/docs/en/quickstart",
      },
    ],
  },
  {
    id: 3,
    label: "Codex — official overview, cloud guide, and pricing.",
    links: [
      { text: "Codex overview", href: "https://learn.chatgpt.com/docs" },
      { text: "Codex cloud", href: "https://learn.chatgpt.com/docs/cloud" },
      { text: "Codex pricing", href: "https://learn.chatgpt.com/docs/pricing" },
      {
        text: "Codex on phone",
        href: "https://learn.chatgpt.com/blog/mastering-codex-remote-for-engineering",
      },
    ],
  },
  {
    id: 4,
    label: "Apple Developer — widgets, Live Activities, and on-device Apple Intelligence.",
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
    blurb: "Pick it for a ready-to-use helper with voice and no setup.",
  },
  {
    name: "Claude Code",
    tone: "lilac",
    blurb: "Pick it for coding across your terminal, editor, desktop, web, or phone.",
  },
  {
    name: "Codex",
    tone: "peach",
    blurb: "Pick it for coding work across local and cloud tools.",
  },
  {
    name: "AgentKip",
    tone: "mint",
    blurb: "Pick it for iPhone help connected to a computer you control.",
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

function CompareCell({ cell }: { cell: Cell }) {
  return <p className="text-[15px] font-semibold leading-snug text-ink">{cell.short}</p>;
}

export default function ComparePage() {
  return (
    <div className="py-16 sm:py-24">
      {/* Intro */}
      <Section>
        <Reveal>
          <SectionHeader
            kicker="Compare"
            title="Pick the AI that fits"
            lead="Each tool starts in a different place. Choose the one that matches what you want to do."
          />
        </Reveal>
      </Section>

      {/* TL;DR cards */}
      <Section className="mt-14">
        <Reveal>
          <Kicker className="mb-5">Start here</Kicker>
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
            kicker="Side by side"
            title="The short comparison"
            lead="Open any row below the table for an explanation and official sources."
          />
        </Reveal>
        <Reveal className="mt-8">
          <div className="kip-card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <caption className="sr-only">
                  Feature comparison of the ChatGPT app, Claude Code, Codex, and AgentKip
                </caption>
                <thead>
                  <tr className="border-b border-hairline">
                    <th scope="col" className="w-[15%] px-5 py-4 align-bottom">
                      <span className="text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-muted">
                        Topic
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
            Product details change. The explanations below link to the official pages checked for
            this comparison.
          </p>
        </Reveal>
        <div className="mt-6 space-y-3">
          {COMPARE_ROWS.map((row) => (
            <details key={row.dimension} className="group kip-card overflow-hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold text-ink [&::-webkit-details-marker]:hidden [&::marker]:hidden">
                {row.dimension}
                <span
                  aria-hidden="true"
                  className="text-xl text-ink-muted transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <div className="mt-4 grid gap-4 border-t border-hairline pt-4 sm:grid-cols-2">
                {([
                  ["ChatGPT app", row.chatgpt],
                  ["Claude Code", row.claudeCode],
                  ["Codex", row.codex],
                  ["AgentKip", row.kip],
                ] as const).map(([name, cell]) => (
                  <div key={name}>
                    <h3 className="text-sm font-semibold text-ink">{name}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
                      <CellText cell={cell} />
                    </p>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      </Section>

      {/* Where other tools lead */}
      <Section className="mt-20">
        <Reveal>
          <SectionHeader
            kicker="Good reasons to choose"
            title="Where the others lead"
            lead="Kip is not the best fit for every job."
          />
        </Reveal>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Reveal>
            <KipCard className="h-full">
              <Pill tone="sky">ChatGPT</Pill>
              <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
                ChatGPT is easier to start and supports live voice conversations. Choose it when
                you do not want to set up or manage anything.
              </p>
            </KipCard>
          </Reveal>
          <Reveal delay={60}>
            <KipCard className="h-full">
              <Pill tone="lilac">Claude Code</Pill>
              <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
                Claude Code is built for software work across local and cloud surfaces. Choose it
                when the project itself is the center of the task.
              </p>
            </KipCard>
          </Reveal>
          <Reveal delay={120}>
            <KipCard className="h-full">
              <Pill tone="peach">Codex</Pill>
              <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
                Codex offers dedicated coding surfaces and managed cloud tasks. Choose it when the
                work belongs in a software project.
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

      {/* Availability footer */}
      <Section className="mt-16">
        <Reveal>
          <KipCard className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <RoadmapBadge />
              <p className="text-sm text-ink-secondary">
                Sending work from Kip to Claude Code or Codex is planned, not available today.
              </p>
            </div>
            <p className="text-sm text-ink-secondary">
              Found something outdated?{" "}
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
