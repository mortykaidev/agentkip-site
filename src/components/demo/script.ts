/* Scripted content for the simulated homepage demo.
   Honesty rule: this is a canned transcript — the UI must always caption it as
   "Scripted demo. No live AI is running." */

export type DemoLaneId = "quick" | "everyday" | "deep" | "best" | "code";

export type DemoLane = {
  id: DemoLaneId;
  label: string;
  caption: string;
};

export const DEMO_LANES: DemoLane[] = [
  { id: "quick", label: "Quick", caption: "Fast answers" },
  { id: "everyday", label: "Everyday", caption: "Most tasks" },
  { id: "deep", label: "Deep", caption: "Harder questions" },
  { id: "best", label: "Best", caption: "Your top choice" },
  { id: "code", label: "Code", caption: "Coding help" },
];

export const DEFAULT_LANE_ID: DemoLaneId = "everyday";

export type DemoCardRow = {
  icon: "clock" | "check" | "coin";
  text: string;
};

export type DemoCard = {
  title: string;
  rows: DemoCardRow[];
  footer?: string;
};

export type DemoExchange = {
  userText: string;
  thinkingLabel: string;
  reply: string;
  card?: DemoCard;
};

export type DemoPrompt = DemoExchange & {
  id: string;
  chipLabel: string;
};

export const DEMO_PROMPTS: DemoPrompt[] = [
  {
    id: "week",
    chipLabel: "Plan my week",
    userText: "I’m starting a small candle shop. Help me plan this week.",
    thinkingLabel: "Turning that into steps…",
    reply: "Here’s a simple first week:",
    card: {
      title: "Your first week",
      rows: [
        { icon: "clock", text: "Monday — Pick three scents" },
        { icon: "clock", text: "Tuesday — Price each candle" },
        { icon: "clock", text: "Wednesday — Take product photos" },
        { icon: "clock", text: "Thursday — Write the shop page" },
      ],
      footer: "Friday — Ask five friends for feedback.",
    },
  },
  {
    id: "email",
    chipLabel: "Write a follow-up",
    userText: "Write a friendly follow-up for someone who hasn’t replied.",
    thinkingLabel: "Drafting a short note…",
    reply: "Here’s a warm version you can send:",
    card: {
      title: "Follow-up email",
      rows: [
        { icon: "check", text: "Hi Maya — just checking in on the note below." },
        { icon: "check", text: "No rush. I’d still love to hear what you think when you have a moment." },
        { icon: "check", text: "Thanks, Brandon" },
      ],
      footer: "Want it more casual or more direct?",
    },
  },
  {
    id: "receipt",
    chipLabel: "Read this receipt",
    userText: "Turn this grocery receipt into a short list.",
    thinkingLabel: "Reading the receipt…",
    reply: "I found three useful details:",
    card: {
      title: "Receipt summary",
      rows: [
        { icon: "coin", text: "Total — $64.12" },
        { icon: "coin", text: "8 items" },
        { icon: "coin", text: "Largest item — coffee beans, $18.00" },
      ],
      footer: "I can also sort the items by category.",
    },
  },
];

/** Played when a visitor types their own message into the composer. */
export const COMPOSER_EXCHANGE: Omit<DemoExchange, "userText"> = {
  thinkingLabel: "Reading your message…",
  reply:
    "This page only plays prepared examples. In the Kip app, you can ask in your own words.",
};

export const DEMO_DISCLAIMER = "Scripted demo. No live AI is running.";
