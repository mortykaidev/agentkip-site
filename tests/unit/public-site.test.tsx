import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HomePage from "@/app/page";
import HowItWorksPage from "@/app/how-it-works/page";
import sitemap from "@/app/sitemap";

describe("public site", () => {
  it("keeps the locked homepage hero and beta-safe comparison copy", () => {
    const markup = renderToStaticMarkup(<HomePage />);

    expect(markup).toContain("Your personal AI.");
    expect(markup).toContain("On your iPhone.");
    expect(markup).toContain("In your home.");
    expect(markup).toContain("Cost during beta");
    expect(markup).toContain("App is free; you pay your AI provider");
    expect(markup).toContain("Usually a free tier or subscription");
    expect(markup).toContain("Put it offline");
    expect(markup).toContain("Unplug the box you own");
    expect(markup).toContain("Use the app’s account controls");
    expect(markup).not.toContain("Monthly subscription");
    expect(markup).not.toContain("Want it all gone?");
  });

  it("uses the honest Noggin setup wording", () => {
    const markup = renderToStaticMarkup(<HowItWorksPage />);

    expect(markup).toContain(
      "That’s the app you talk to. Next, pair it with the small computer at home that runs Noggin.",
    );
    expect(markup).not.toContain("Nothing else to install.");
  });

  it("publishes the how-it-works route in the sitemap", () => {
    expect(sitemap().map((entry) => entry.url)).toContain("https://agentkip.ai/how-it-works");
  });
});
