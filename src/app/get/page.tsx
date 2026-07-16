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
  description:
    "Open the current AgentKip install destination, or see when the next iPhone release becomes available.",
};

const GET_URL = "https://agentkip.ai/get";

export default async function GetPage() {
  const release = await getContent("getPage");

  return (
    <div className="get-page">
      <section className="get-hero" aria-labelledby="get-title">
        <div>
          <p className="get-eyebrow">One link. The current release.</p>
          <h1 id="get-title">Get Kip.</h1>
          <p className="get-lead">
            Open this page on your iPhone. When an App Store or TestFlight release is ready, this
            same link will take you straight there.
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
          <h2 id="release-title">A stable destination</h2>
          <p>
            You can share <strong>agentkip.ai/get</strong> now. The destination behind it changes
            only after a real release URL has been verified.
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
                  Noggin is the server Kip connects to. Start with the public repository, then
                  follow the setup for your platform.
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
                <h2>The public Noggin repository is not linked yet.</h2>
                <p>
                  Self-hosting instructions will appear here only when there is a verified public
                  repository. Until then, beta setup details arrive with an invite.
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
        <h2>Kip is ready for your iPhone.</h2>
        <p>Open the verified App Store listing to install the current release.</p>
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
        <h2>Join the current iPhone beta.</h2>
        <p>Open the verified TestFlight invitation on your iPhone to install Kip.</p>
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
      <p>Join the list and you&rsquo;ll be first to know the moment a spot opens up.</p>
    </div>
  );
}
