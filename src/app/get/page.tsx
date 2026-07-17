import type { Metadata } from "next";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { OsTabs } from "@/app/get/os-tabs";
import { WaitlistForm } from "@/components/forms/waitlist-form";
import { ArrowIcon, ProductPhone } from "@/components/launch";
import { Pill } from "@/components/ui";
import type { GetPageContent } from "@/lib/content-types";
import { getContent } from "@/lib/content";

export const metadata: Metadata = {
  title: "Get Kip",
  description: "Install the current AgentKip beta or join the waitlist from your iPhone.",
};

const GET_URL = "https://agentkip.ai/get";

export default async function GetPage() {
  const release = await getContent("getPage");

  return (
    <div className="get-page">
      <section className="get-hero" aria-labelledby="get-title">
        <div>
          <p className="get-eyebrow">One link for Kip</p>
          <h1 id="get-title">Get Kip.</h1>
          <p className="get-lead">
            Open this page on your iPhone. It always points to the latest available way to get Kip.
          </p>
          {release.betaStage !== "appstore" && (
            <Pill tone="neutral" className="mt-5">
              App Store — coming soon
            </Pill>
          )}
        </div>
        <div className="flex flex-col items-center gap-6">
          <ProductPhone
            src="/product/walkthrough/01-home.webp"
            alt="Kip home screen on iPhone, ready to say hello."
            className="launch-phone-inline"
          />
          <div className="get-page-qr" aria-label="QR code for agentkip.ai/get">
            <QRCodeSVG
              value={GET_URL}
              size={132}
              level="M"
              marginSize={1}
              bgColor="#f0eee6"
              fgColor="#181918"
            />
            <span>agentkip.ai/get</span>
            <span>Point your iPhone camera at the code.</span>
          </div>
        </div>
      </section>

      <section className="get-release" aria-labelledby="release-title">
        <ReleasePanel release={release} />
        <div className="get-release-note">
          <h2 id="release-title">One link to save</h2>
          <p>
            Save or share <strong>agentkip.ai/get</strong>. We update it when a new install link is
            ready.
          </p>
          <Link href="/support" className="launch-text-link">
            Need help? <ArrowIcon />
          </Link>
        </div>
      </section>

      <section className="get-advanced" aria-labelledby="noggin-title">
        <details>
          <summary>
            <span>
              <span className="get-eyebrow">Advanced</span>
              <strong id="noggin-title">Run your own Noggin</strong>
            </span>
            <span aria-hidden="true">+</span>
          </summary>
          <div className="get-advanced-body">
            {release.nogginStage === "repository" && release.nogginRepositoryUrl ? (
              <>
                <p>
                  Noggin is the program Kip connects to. Open the repository, then follow the
                  setup for your computer.
                </p>
                <p>
                  <a
                    href={release.nogginRepositoryUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="launch-text-link"
                  >
                    Open the Noggin repository <ArrowIcon />
                  </a>
                </p>
                <OsTabs repositoryUrl={release.nogginRepositoryUrl} />
              </>
            ) : (
              <div className="get-noggin-placeholder">
                <Pill tone="butter">Invite access</Pill>
                <h2>Noggin setup is invite-only.</h2>
                <p>
                  Public setup steps will appear here when the Noggin repository is ready. Beta
                  testers receive the current steps with their invite.
                </p>
              </div>
            )}
          </div>
        </details>
      </section>
    </div>
  );
}

function ReleasePanel({ release }: { release: GetPageContent }) {
  if (release.betaStage === "appstore" && release.appStoreUrl) {
    return (
      <div className="get-release-card">
        <Pill tone="mint">App Store</Pill>
        <h2>Kip is ready to install.</h2>
        <p>Open the App Store listing on your iPhone.</p>
        <a href={release.appStoreUrl} className="get-release-button" rel="noreferrer">
          View on the App Store <ArrowIcon />
        </a>
      </div>
    );
  }

  if (release.betaStage === "testflight" && release.testflightUrl) {
    return (
      <div className="get-release-card">
        <Pill tone="mint">TestFlight</Pill>
        <h2>Join the iPhone beta.</h2>
        <p>Open the TestFlight invite on your iPhone.</p>
        <a href={release.testflightUrl} className="get-release-button" rel="noreferrer">
          Open TestFlight <ArrowIcon />
        </a>
      </div>
    );
  }

  return (
    <div className="get-release-card">
      <Pill tone="butter">Invite-only beta</Pill>
      <h2>{release.inviteHeadline}</h2>
      <p>{release.inviteBody}</p>
      <WaitlistForm className="get-waitlist" />
      <p>We’ll email you when a place opens.</p>
    </div>
  );
}
