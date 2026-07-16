import type { ContentMap } from "@/lib/content-types";

/* Seeded site content. The live site reads DB-first; these values render
   until Brandon edits a section in /admin (and any section can be reset to these). */

export const DEFAULT_CONTENT: ContentMap = {
  hero: {
    announcement: null,
    headline: "Your personal AI. On your iPhone. In your home.",
    subhead:
      "An iPhone app with its brain on a small computer in your home — so your conversations stay yours.",
    primaryCtaLabel: "Get Kip",
    secondaryCtaLabel: "See how it works",
  },
  getPage: {
    betaStage: "invite",
    inviteHeadline: "Kip is available by invitation right now.",
    inviteBody:
      "Join the waitlist and the current install link will be sent when a beta place becomes available.",
    testflightUrl: null,
    appStoreUrl: null,
    nogginStage: "invite",
    nogginRepositoryUrl: null,
  },
  siteStatus: {
    label: "Private beta",
    tone: "butter",
    buildNote: null,
  },
  contact: {
    email: "hello@agentkip.ai",
    blurb:
      "Questions, bug reports, or beta invite requests — send a note and Brandon will get back to you.",
    socials: [],
  },
  faq: [
    {
      question: "Do you see my data?",
      answer:
        "No. Your conversations, memory, and files live on your own box — the AgentKip project never has access to them. The website itself only stores what it needs to run: your sign-in info (via Clerk), waitlist emails, and any message you send through the contact form.",
    },
    {
      question: "What does it cost?",
      answer:
        "The app and the beta are free. You pay your own model-provider account directly for whatever you use — Kip doesn't mark that up or route it through a shared backend. Casual use tends to be cheap; heavier coding or research runs cost more, same as using that provider anywhere else.",
    },
    {
      question: "Why do I need my own API key?",
      answer:
        "Your box talks straight to the model provider you choose, using a key only you hold. That's what keeps your prompts, your data, and your bill entirely yours — nothing passes through a Kip-run relay.",
    },
    {
      question: "What do I need to run it?",
      answer:
        "A Mac, a Linux box, a Windows machine with Docker, or a small VPS — basically anything that can stay on and be reachable from your phone (directly on your network, or over Tailscale). It's mostly waiting on API calls, so it doesn't need to be powerful.",
    },
    {
      question: "When is TestFlight coming?",
      answer:
        "It's being set up now. Until it's live, the beta is invite-only — ask Brandon for a spot, or join the waitlist and you'll get a link as soon as one opens up.",
    },
    {
      question: "Which iPhones and iOS versions does it support?",
      answer:
        "Kip is built for iOS 27, with a compatibility build targeting iOS 26 so more devices can join the beta in the meantime.",
    },
    {
      question: "Is it open source?",
      answer:
        "It descends from the open Hermes agent framework. Exactly how the app itself will be distributed and licensed is still being worked out — more details once that's settled.",
    },
    {
      question: "What models can I use?",
      answer:
        "Whatever your box exposes. Go through OpenRouter with a single key for access to a lot of models at once, connect directly to a provider like OpenAI or Anthropic, or run local models through Ollama.",
    },
    {
      question: "Can it code?",
      answer:
        "Yes — there's a dedicated Code model lane, and durable runs mean a long task keeps going even if you back out of the app or lose connection for a moment. Delegating out to Claude Code or Codex from your phone is on the roadmap, but it isn't shipped yet.",
    },
    {
      question: "How do I report a bug or a security issue?",
      answer:
        "Head to the Contact page — every message goes straight to Brandon, no ticket queue in between.",
    },
  ],
  roadmap: [
    {
      title: "TestFlight public beta",
      description:
        "Getting the public TestFlight link ready so anyone can join the beta without waiting on an invite.",
      status: "building",
    },
    {
      title: "Per-device expiring pairing tokens",
      description:
        "Replacing today's long-lived pairing key with tokens that are issued per device and expire on their own.",
      status: "building",
    },
    {
      title: "Claude Code & Codex delegation from your phone",
      description:
        "Kick off a Claude Code or Codex run from inside Kip and keep tabs on it, without opening a laptop.",
      status: "planned",
    },
    {
      title: "Desktop app",
      description: "A native desktop companion that talks to the same server you already run.",
      status: "planned",
    },
    {
      title: "Managed hosting",
      description:
        "A hosted option for people who'd rather not run their own server — bring your provider key, skip the setup.",
      status: "planned",
    },
    {
      title: "Family accounts",
      description:
        "Exploring what it looks like for a few people to share one server, each with their own memory and conversations.",
      status: "exploring",
    },
    {
      title: "Memory browser UI",
      description: "A visual way to see, search, and edit what Kip remembers about you.",
      status: "exploring",
    },
  ],
  changelog: [
    {
      date: "2026-07-11",
      title: "agentkip.ai goes live",
      notes: ["First public website for the AgentKip beta."],
    },
  ],
  useCases: [
    {
      title: "Capture a thought on the go",
      description:
        "Tap into dictation or push-to-talk and get a thought out of your head and into Kip before you lose it — no typing required.",
      tags: ["Voice"],
      result: null,
    },
    {
      title: "Start the day with a briefing",
      description:
        "A morning notification summarizes what's on deck, put together on-device before you've even opened the app.",
      tags: ["Widgets", "On-device AI"],
      result: null,
    },
    {
      title: "Scan a receipt, skip the typing",
      description:
        "Point the camera at a receipt and Kip pulls out the line items and total instead of you retyping them.",
      tags: ["Vision"],
      result: null,
    },
    {
      title: "Kick off a long run, watch it in the Dynamic Island",
      description:
        "Start a coding or research task, lock your phone, and watch it keep working from the Dynamic Island — durable runs survive backgrounding.",
      tags: ["Durable runs"],
      result: null,
    },
    {
      title: "Draft messages on a plane",
      description:
        "No signal, no problem — on-device intelligence drafts replies and notes offline, and Kip picks the thread back up once you're online.",
      tags: ["On-device AI"],
      result: null,
    },
    {
      title: "Run a focus sprint",
      description:
        "Start a timed Focus sprint and track it from a Live Activity on your lock screen — no need to keep the app open.",
      tags: ["Focus"],
      result: null,
    },
    {
      title: "Ask Kip without opening the app",
      description:
        "Add a Control Center button and fire off a quick question or command straight from the control panel.",
      tags: ["Widgets", "Siri"],
      result: null,
    },
    {
      title: "Share a page or screenshot into Kip",
      description:
        "Send a webpage or screenshot from any app straight into Kip using the share sheet, and pick up the conversation from there.",
      tags: ["Share"],
      result: null,
    },
  ],
  gallery: [
    {
      src: "/product/walkthrough/01-home.webp",
      alt: "Kip home screen in an offline product preview, ready for a new conversation.",
      caption: "Say hello to Kip.",
    },
    {
      src: "/product/walkthrough/02-compose.webp",
      alt: "AgentKip composer showing native message controls and model selection.",
      caption: "Ask in your own words.",
    },
    {
      src: "/product/walkthrough/05-complete.webp",
      alt: "AgentKip product preview showing a completed response.",
      caption: "Your answer, saved for you.",
    },
  ],
};
