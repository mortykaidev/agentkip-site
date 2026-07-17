import type { ContentMap } from "@/lib/content-types";

/* Seeded site content. The live site reads DB-first; these values render
   until Brandon edits a section in /admin (and any section can be reset to these). */

export const DEFAULT_CONTENT: ContentMap = {
  hero: {
    announcement: null,
    headline: "Whatever you’re trying to do, Kip can help.",
    subhead:
      "Plan the business. Write the email. Research the idea. Fix the code. All from your iPhone.",
    primaryCtaLabel: "Get Kip",
    secondaryCtaLabel: "See what Kip can do",
  },
  homeBenefits: [
    {
      title: "Plan & organize",
      description: "Turn a big idea into clear next steps.",
    },
    {
      title: "Write & research",
      description: "Draft, rewrite, summarize, and find what matters.",
    },
    {
      title: "Build & fix",
      description: "Work through code, errors, and projects with you.",
    },
    {
      title: "Scan & understand",
      description: "Read receipts, screenshots, documents, and photos.",
    },
    {
      title: "Talk & listen",
      description: "Ask by voice and hear answers when your hands are busy.",
    },
    {
      title: "Keep going",
      description: "Run longer tasks and check progress from your phone.",
    },
  ],
  getPage: {
    betaStage: "invite",
    inviteHeadline: "Kip is invite-only for now.",
    inviteBody: "Join the waitlist and we’ll email you when a beta place opens.",
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
    blurb: "Questions, bugs, or beta requests? Send Brandon a note.",
    socials: [],
  },
  faq: [
    {
      question: "Do you see my data?",
      answer:
        "Kip saves your chats, memory, and files on the computer running Noggin. AgentKip does not receive them. An online AI company will still process anything you send to its model. This website stores sign-in details, waitlist emails, and messages you choose to send us.",
    },
    {
      question: "What does it cost?",
      answer:
        "The beta is free. You pay the AI company you choose for what you use, with no AgentKip markup. Longer or harder tasks usually cost more.",
    },
    {
      question: "Why do I need my own API key?",
      answer:
        "The computer running Noggin uses your key to reach the AI company you choose. That keeps the account and bill in your name. Never share a key in chat or email.",
    },
    {
      question: "What do I need to run it?",
      answer:
        "You need an iPhone and a computer that can stay on. A Mac, Linux computer, Windows computer with Docker, or small hosted computer can work. The setup guide walks through the choices.",
    },
    {
      question: "When is TestFlight coming?",
      answer:
        "The beta is invite-only right now. Join the waitlist and we’ll email you when a place opens.",
    },
    {
      question: "Which iPhones and iOS versions does it support?",
      answer:
        "Kip is built for iOS 27. A smaller Kip26 build supports iOS 26 while the beta grows.",
    },
    {
      question: "Is it open source?",
      answer:
        "Kip grew from the open Hermes agent framework. The license and release plan for the app are still being decided.",
    },
    {
      question: "What models can I use?",
      answer:
        "You choose from the models connected to your Noggin. That can include OpenAI, Anthropic, OpenRouter, or local models through Ollama.",
    },
    {
      question: "Can it code?",
      answer:
        "Yes. Kip can help explain code, find problems, and work through fixes. Sending work to Claude Code or Codex from your phone is planned, but not available yet.",
    },
    {
      question: "How do I report a bug or a security issue?",
      answer:
        "Use the Contact page or email hello@agentkip.ai. Your message goes to Brandon.",
    },
  ],
  roadmap: [
    {
      title: "TestFlight public beta",
      description:
        "Open the iPhone beta to more people.",
      status: "building",
    },
    {
      title: "Coding tools from iPhone",
      description: "Start Claude Code or Codex work and follow it from Kip.",
      status: "planned",
    },
    {
      title: "Desktop app",
      description: "Use Kip from a computer as well as your iPhone.",
      status: "planned",
    },
    {
      title: "Managed hosting",
      description: "Use Kip without keeping your own computer online.",
      status: "planned",
    },
    {
      title: "Family accounts",
      description: "Let a few people share one Noggin with separate chats and memory.",
      status: "exploring",
    },
    {
      title: "Memory browser UI",
      description: "See, search, change, or remove what Kip remembers.",
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
      description: "Say an idea before you lose it, without stopping to type.",
      tags: ["Voice"],
      result: null,
    },
    {
      title: "Start the day with a briefing",
      description: "See a short morning summary before you open the app.",
      tags: ["Widgets", "On-device AI"],
      result: null,
    },
    {
      title: "Scan a receipt, skip the typing",
      description: "Point your camera at a receipt and let Kip pull out the items and total.",
      tags: ["Vision"],
      result: null,
    },
    {
      title: "Keep a long task moving",
      description: "Lock your phone and follow the task from the Dynamic Island.",
      tags: ["Durable runs"],
      result: null,
    },
    {
      title: "Draft messages on a plane",
      description: "Draft a short reply on your iPhone when you have no signal.",
      tags: ["On-device AI"],
      result: null,
    },
    {
      title: "Run a focus sprint",
      description: "Start a timer and follow it from your Lock Screen.",
      tags: ["Focus"],
      result: null,
    },
    {
      title: "Ask Kip without opening the app",
      description: "Use a Control Center button to start a quick request.",
      tags: ["Widgets", "Siri"],
      result: null,
    },
    {
      title: "Share a page or screenshot into Kip",
      description: "Send a page or screenshot to Kip from another app.",
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
