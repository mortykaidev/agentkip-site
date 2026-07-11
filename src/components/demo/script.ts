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

export type DemoExchange = {
  userText: string;
  thinkingLabel: string;
  reply: string;
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
    reply:
      "Here's a morning that fits what's on your plate:\n\n7:30 — Coffee + the briefing I queued overnight\n8:00 — Deep-work block: finish the deploy checklist\n9:30 — Reply to Sam about the beta invite\n10:00 — Walk. You skipped it yesterday.\n\nWant me to start a Focus sprint for the 8:00 block?",
  },
  {
    id: "build",
    chipLabel: "Fix the failing build",
    userText: "Fix the failing build",
    thinkingLabel: "Reading the build log…",
    reply:
      "Found it. tests/test_notify.py still imports schedule_brief, which was renamed to schedule_briefing in yesterday's refactor.\n\nI updated the import and re-ran the suite: 42 passed, 0 failed. The fix is on the fix/notify-import branch, ready for your review.",
  },
  {
    id: "grocery",
    chipLabel: "What did I spend at the grocery store?",
    userText: "What did I spend at the grocery store?",
    thinkingLabel: "Searching scanned receipts…",
    reply:
      "From the receipts you scanned this month: three grocery trips totaling $187.40 — $64.12, $58.90, and $64.38.\n\nThat's about $23 under last month. Biggest repeat line item: coffee beans, twice.",
  },
];

/** Played when a visitor types their own message into the composer. */
export const COMPOSER_EXCHANGE: Omit<DemoExchange, "userText"> = {
  thinkingLabel: "Reading that…",
  reply:
    "Nice try — this demo is a scripted tour, not a live model, so I can't actually run that one.\n\nOn your own server I'd take a real swing at it. Grab an invite and ask me again for real.",
};

export const DEMO_DISCLAIMER =
  "Simulated demo — a scripted transcript, not a live model.";
