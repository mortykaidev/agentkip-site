import { describe, expect, it } from "vitest";
import {
  isValidAppStoreUrl,
  isValidNogginRepositoryUrl,
  isValidTestFlightUrl,
} from "@/lib/release-links";
import { CONTENT_SCHEMAS } from "@/lib/store-schemas";

describe("release destinations", () => {
  it("accepts only direct TestFlight invitations", () => {
    expect(isValidTestFlightUrl("https://testflight.apple.com/join/AbC123")).toBe(true);
    expect(isValidTestFlightUrl("https://testflight.apple.com/")).toBe(false);
    expect(isValidTestFlightUrl("https://testflight.apple.com.evil.invalid/join/AbC123")).toBe(false);
    expect(isValidTestFlightUrl("http://testflight.apple.com/join/AbC123")).toBe(false);
    expect(isValidTestFlightUrl("https://user@testflight.apple.com/join/AbC123")).toBe(false);
  });

  it("requires a concrete App Store listing", () => {
    expect(isValidAppStoreUrl("https://apps.apple.com/us/app/agentkip/id1234567890")).toBe(true);
    expect(isValidAppStoreUrl("https://apps.apple.com/app/id1234567890")).toBe(true);
    expect(isValidAppStoreUrl("https://apps.apple.com/")).toBe(false);
    expect(isValidAppStoreUrl("https://apps.apple.com/us/app/agentkip")).toBe(false);
    expect(isValidAppStoreUrl("https://apps.apple.com.evil.invalid/app/id1234567890")).toBe(false);
  });

  it("accepts only a public GitHub repository-shaped Noggin URL", () => {
    expect(isValidNogginRepositoryUrl("https://github.com/mortykaidev/noggin")).toBe(true);
    expect(isValidNogginRepositoryUrl("https://github.com/mortykaidev/noggin/releases")).toBe(false);
    expect(isValidNogginRepositoryUrl("https://gitlab.com/mortykaidev/noggin")).toBe(false);
    expect(isValidNogginRepositoryUrl("https://github.com/mortykaidev/noggin?tab=readme")).toBe(false);
  });

  it("fails closed when a promoted stage has no matching destination", () => {
    const base = {
      inviteHeadline: "Invite only",
      inviteBody: "Ask for access.",
      testflightUrl: null,
      appStoreUrl: null,
      nogginStage: "invite" as const,
      nogginRepositoryUrl: null,
    };

    expect(CONTENT_SCHEMAS.getPage.safeParse({ ...base, betaStage: "invite" }).success).toBe(true);
    expect(CONTENT_SCHEMAS.getPage.safeParse({ ...base, betaStage: "testflight" }).success).toBe(false);
    expect(CONTENT_SCHEMAS.getPage.safeParse({ ...base, betaStage: "appstore" }).success).toBe(false);
    expect(
      CONTENT_SCHEMAS.getPage.safeParse({
        ...base,
        betaStage: "appstore",
        appStoreUrl: "https://apps.apple.com/",
      }).success,
    ).toBe(false);
    expect(
      CONTENT_SCHEMAS.getPage.safeParse({
        ...base,
        betaStage: "invite",
        nogginStage: "repository",
      }).success,
    ).toBe(false);
  });
});
