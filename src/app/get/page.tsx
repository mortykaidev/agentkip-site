import type { Metadata } from "next";
import Link from "next/link";
import { getContent } from "@/lib/content";
import { KipButton, KipCard, Kicker, Pill, Section, SectionHeader } from "@/components/ui";
import { Reveal } from "@/components/reveal";
import { WaitlistForm } from "@/components/forms/waitlist-form";
import { OsTabs } from "@/app/get/os-tabs";

export const metadata: Metadata = {
  title: "Get Kip",
  description:
    "The one link for AgentKip: get the invite-only iOS beta, or run your own Noggin server on macOS, Linux, Windows, or Docker.",
};

export default async function GetPage() {
  const getPage = await getContent("getPage");

  return (
    <>
      <Section className="pt-14 pb-10 sm:pt-20">
        <Reveal>
          <Kicker>Get Kip</Kicker>
          <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Get Kip
          </h1>
          <p className="mt-4 max-w-xl text-lg text-ink-secondary text-pretty">
            Two things you can do here: install the app, and stand up the server it talks to.
            Both are yours to run — this is the link people usually get texted.
          </p>
        </Reveal>

        <Reveal delay={80}>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <a href="#get-the-app" className="kip-card kip-press block p-6 transition-colors hover:border-hairline-strong">
              <Pill tone="mint">1</Pill>
              <p className="mt-4 text-xl font-semibold text-ink">Get the app</p>
              <p className="mt-2 text-sm text-ink-secondary">
                Install Kip on your iPhone and pair it with a server.
              </p>
            </a>
            <a href="#run-your-server" className="kip-card kip-press block p-6 transition-colors hover:border-hairline-strong">
              <Pill tone="sky">2</Pill>
              <p className="mt-4 text-xl font-semibold text-ink">Run your server</p>
              <p className="mt-2 text-sm text-ink-secondary">
                Stand up Noggin on hardware you own — macOS, Linux, Windows, or Docker.
              </p>
            </a>
          </div>
        </Reveal>
      </Section>

      <Section id="get-the-app" className="py-14">
        <Reveal>
          <SectionHeader kicker="Step 1" title="Get the app" />
        </Reveal>

        <Reveal delay={80}>
          <KipCard className="mt-8 max-w-2xl p-7">
            {getPage.betaStage === "invite" ? <InviteBlock inviteHeadline={getPage.inviteHeadline} inviteBody={getPage.inviteBody} /> : null}
            {getPage.betaStage === "testflight" ? (
              <TestFlightBlock testflightUrl={getPage.testflightUrl} />
            ) : null}
            {getPage.betaStage === "appstore" ? <AppStoreBlock /> : null}
          </KipCard>
        </Reveal>

        <Reveal delay={140}>
          <p className="mt-5 max-w-2xl text-sm text-ink-muted">
            Honest status: the app is currently invite-only for friends and testers. Nothing here
            claims a public App Store listing until it&apos;s actually live.
          </p>
        </Reveal>
      </Section>

      <Section id="run-your-server" className="py-14">
        <Reveal>
          <SectionHeader kicker="Step 2" title="Run your server" />
        </Reveal>

        <Reveal delay={80}>
          <KipCard className="mt-8 p-7">
            <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-muted">
              What you need
            </p>
            <ul className="mt-4 space-y-3 text-sm text-ink-secondary">
              <li>
                <span className="font-semibold text-ink">A computer that stays on</span> — a Mac,
                a Linux box, a Windows machine with Docker, or a VPS.
              </li>
              <li>
                <span className="font-semibold text-ink">An LLM provider API key</span> — the
                simplest path is a single OpenRouter key; Anthropic or OpenAI direct also work.
              </li>
              <li>
                <span className="font-semibold text-ink">A way to reach it from outside your network</span>{" "}
                — the agentkip.app relay (simplest, no setup) or your own Tailscale/Cloudflare
                Tunnel, if you&apos;d rather manage the tunnel yourself.
              </li>
            </ul>
          </KipCard>
        </Reveal>

        <Reveal delay={140}>
          <div className="mt-8">
            <OsTabs />
          </div>
        </Reveal>

        <Reveal delay={200}>
          <KipCard className="mt-8 max-w-2xl border-hairline-strong p-6">
            <p className="font-semibold text-ink">A word on security</p>
            <p className="mt-2 text-sm text-ink-secondary">
              Always pair through the agentkip.app relay, Tailscale, or another encrypted tunnel
              — plus HTTPS. Never expose plain <code className="font-mono text-ink">http://</code> on an untrusted LAN —
              the pairing token is a bearer credential. For the full threat model and
              mitigations, see{" "}
              <Link href="/security" className="font-semibold text-ink underline underline-offset-4">
                /security
              </Link>
              .
            </p>
          </KipCard>
        </Reveal>

        <Reveal delay={240}>
          <p className="mt-6 max-w-2xl text-sm text-ink-secondary">
            Want to run this in the cloud instead of on hardware at home? See{" "}
            <Link href="/docs/deploy" className="font-semibold text-ink underline underline-offset-4">
              /docs/deploy
            </Link>{" "}
            for a VPS walkthrough.
          </p>
        </Reveal>
      </Section>

      <Section className="py-14">
        <Reveal>
          <p className="text-sm text-ink-secondary">
            Questions?{" "}
            <Link href="/faq" className="font-semibold text-ink underline underline-offset-4">
              /faq
            </Link>{" "}
            ·{" "}
            <Link href="/contact" className="font-semibold text-ink underline underline-offset-4">
              /contact
            </Link>
          </p>
        </Reveal>
      </Section>
    </>
  );
}

function InviteBlock({ inviteHeadline, inviteBody }: { inviteHeadline: string; inviteBody: string }) {
  return (
    <div>
      <Pill tone="butter">Invite-only beta</Pill>
      <p className="mt-4 text-xl font-semibold text-ink">{inviteHeadline}</p>
      <p className="mt-2 text-sm text-ink-secondary">{inviteBody}</p>
      <div className="mt-6">
        <WaitlistForm />
      </div>
      <p className="mt-5 text-sm text-ink-secondary">
        Already know Brandon?{" "}
        <Link href="/contact" className="font-semibold text-ink underline underline-offset-4">
          Ask for an invite directly
        </Link>
        .
      </p>
    </div>
  );
}

function TestFlightBlock({ testflightUrl }: { testflightUrl: string | null }) {
  return (
    <div>
      <Pill tone="mint">TestFlight</Pill>
      <p className="mt-4 text-xl font-semibold text-ink">Join the TestFlight beta</p>
      <p className="mt-2 text-sm text-ink-secondary">
        Still invite-only for friends and testers — TestFlight just makes installs and updates
        easier once you&apos;re in.
      </p>
      {testflightUrl ? (
        <div className="mt-6">
          <KipButton href={testflightUrl}>Open TestFlight invite</KipButton>
        </div>
      ) : null}
      <div className="mt-6 space-y-3 text-sm text-ink-secondary">
        <p className="font-semibold text-ink">How it works</p>
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>Install TestFlight from the App Store.</li>
          <li>Open your invite link.</li>
          <li>Install AgentKip through TestFlight.</li>
          <li>Updates arrive automatically through TestFlight.</li>
        </ol>
      </div>
    </div>
  );
}

function AppStoreBlock() {
  return (
    <div>
      <Pill tone="mint">Available now</Pill>
      <p className="mt-4 text-xl font-semibold text-ink">Download on the App Store</p>
      <p className="mt-2 text-sm text-ink-secondary">
        Kip is live on the App Store. Grab it, then come back here to set up your server.
      </p>
      <div className="mt-6">
        <KipButton href="https://apps.apple.com/">View on the App Store</KipButton>
      </div>
    </div>
  );
}
