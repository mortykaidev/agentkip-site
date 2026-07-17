/* Scripted content for the simulated homepage demo.
   Honesty rule: this is a canned transcript — the UI must always caption it as
   "Simulated demo — a scripted transcript, not a live model." Lane captions stay
   provider-agnostic (Kip shows whatever models your server exposes). */

export type DemoLaneId = "quick" | "everyday" | "deep" | "best" | "code";

export type DemoLane = {
  id: DemoLaneId;
  label: string;
  caption: string;
};

export const DEMO_LANES: DemoLane[] = [
  { id: "quick", label: "Quick", caption: "fast, low-cost lane" },
  { id: "everyday", label: "Everyday", caption: "balanced default" },
  { id: "deep", label: "Deep", caption: "extended reasoning" },
  { id: "best", label: "Best", caption: "your strongest model" },
  { id: "code", label: "Code", caption: "tuned for code work" },
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
    id: "morning",
    chipLabel: "Plan my morning",
    userText: "Plan my morning",
    thinkingLabel: "Checking your notes…",
    reply: "Here's a morning that fits what's on your plate:",
    card: {
      title: "Your morning",
      rows: [
        { icon: "clock", text: "7:30 — Coffee + overnight briefing" },
        { icon: "clock", text: "8:00 — Deep work: deploy checklist" },
        { icon: "clock", text: "9:30 — Reply to Sam" },
        { icon: "clock", text: "10:00 — Walk (you skipped yesterday)" },
      ],
      footer: "Start a Focus sprint for 8:00?",
    },
  },
  {
    id: "build",
    chipLabel: "Fix the failing build",
    userText: "Fix the failing build",
    thinkingLabel: "Reading the build log…",
    reply: "Found it — the import was stale. Here's what changed:",
    card: {
      title: "Build fixed",
      rows: [
        { icon: "check", text: "tests/test_notify.py imported schedule_brief, renamed to schedule_briefing" },
        { icon: "check", text: "Suite re-run: 42 passed, 0 failed" },
        { icon: "check", text: "Fix pushed to fix/notify-import" },
      ],
      footer: "Ready for your review.",
    },
  },
  {
    id: "grocery",
    chipLabel: "What did I spend at the grocery store?",
    userText: "What did I spend at the grocery store?",
    thinkingLabel: "Searching scanned receipts…",
    reply: "From the receipts you scanned this month, here's the grocery breakdown:",
    card: {
      title: "Grocery spend",
      rows: [
        { icon: "coin", text: "3 trips — $187.40 total" },
        { icon: "coin", text: "$64.12 · $58.90 · $64.38" },
        { icon: "coin", text: "About $23 under last month" },
      ],
      footer: "Biggest repeat item: coffee beans, twice.",
    },
  },
];

/** Played when a visitor types their own message into the composer. */
export const COMPOSER_EXCHANGE: Omit<DemoExchange, "userText"> = {
  thinkingLabel: "Reading that…",
  reply:
    "Nice try — this demo is a scripted tour, not a live model, so I can't actually run that one.\n\nOn your own Kip box I'd take a real swing at it. Grab an invite and ask me again for real.",
};

export const DEMO_DISCLAIMER =
  "Simulated demo — a scripted transcript, not a live model.";
