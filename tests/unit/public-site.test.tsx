import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HomePage from "@/app/page";
import ComparePage from "@/app/compare/page";
import HowItWorksPage from "@/app/how-it-works/page";
import sitemap from "@/app/sitemap";

describe("public site", () => {
  it("keeps the locked beginner-first hero, benefit groups, and comparison copy", async () => {
    const markup = renderToStaticMarkup(await HomePage());

    expect(markup).toContain("Whatever you’re trying to do, Kip can help.");
    expect(markup).toContain(
      "Plan the business. Write the email. Research the idea. Fix the code. All from your iPhone.",
    );
    expect(markup).toContain("Get Kip");
    expect(markup).toContain("See what Kip can do");
    expect(markup).toContain("One AI. Many ways to help.");
    expect(markup).toContain("Plan &amp; organize");
    expect(markup).toContain("Write &amp; research");
    expect(markup).toContain("Build &amp; fix");
    expect(markup).toContain("Scan &amp; understand");
    expect(markup).toContain("Talk &amp; listen");
    expect(markup).toContain("Keep going");
    expect(markup).toContain("Scripted demo. No live AI is running.");
    expect(markup).toContain("Saved chats");
    expect(markup).toContain("Your computer");
    expect(markup).toContain("Their cloud");
    expect(markup).toContain("AI models");
    expect(markup).toContain("Your choice");
    expect(markup).toContain("Their choice");
    expect(markup).toContain("Pay for use");
    expect(markup).toContain("A few steps");
    expect(markup).toContain("provider still processes the prompt and reply");
    expect(markup).not.toContain("provider-agnostic");
    expect(markup).not.toContain("native client");
    expect(markup).not.toContain("architecture");
  });

  it("masks each legacy screenshot callout without changing the product images", async () => {
    const markup = renderToStaticMarkup(await HomePage());

    expect(markup.match(/launch-phone-legacy-mask/g)).toHaveLength(8);
    expect(markup.match(/launch-phone-legacy-mask-home/g)).toHaveLength(2);
    expect(markup.match(/launch-phone-legacy-mask-compose/g)).toHaveLength(1);
    expect(markup.match(/launch-phone-legacy-mask-complete/g)).toHaveLength(1);
    expect(markup).toContain('aria-hidden="true"');
  });

  it("keeps both static comparison representations available before hydration", async () => {
    const markup = renderToStaticMarkup(await HomePage());

    expect(markup).toContain('<table class="home-compare">');
    expect(markup).toContain('<div class="home-compare-mobile">');
    expect(markup).not.toContain('<table class="home-compare" aria-hidden=');
    expect(markup).not.toContain('<div class="home-compare-mobile" aria-hidden=');
  });

  it("keeps the full comparison short in the table and detailed below it", () => {
    const markup = renderToStaticMarkup(<ComparePage />);

    expect(markup).toContain("Pick the AI that fits");
    expect(markup).toContain("The short comparison");
    expect(markup).toContain("OpenAI cloud");
    expect(markup).toContain("Local or cloud");
    expect(markup).toContain("Your Noggin");
    expect(markup).toContain("<details");
    expect(markup).toContain("official pricing and voice help");
    expect(markup).not.toContain("Provider-agnostic");
    expect(markup).not.toContain("Best-in-class");
  });

  it("uses honest Noggin setup wording without overstating where processing happens", () => {
    const markup = renderToStaticMarkup(<HowItWorksPage />);

    expect(markup).toContain(
      "Kip is the app you use. Noggin is the part that runs on a computer you control.",
    );
    expect(markup).toContain("that company processes the request and sends the answer back");
    expect(markup).not.toContain("conversations stay on the box at home");
    expect(markup).not.toContain("not off in someone else’s data center");
    expect(markup).not.toContain("Nothing else to install.");
  });

  it("publishes the how-it-works route in the sitemap", () => {
    expect(sitemap().map((entry) => entry.url)).toContain("https://agentkip.ai/how-it-works");
  });
});
