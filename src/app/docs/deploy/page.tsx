import type { Metadata } from "next";
import Link from "next/link";
import { KipCard, Kicker, Pill, Section, SectionHeader } from "@/components/ui";
import { Reveal } from "@/components/reveal";
import { CodeBlock } from "@/app/get/code-block";

export const metadata: Metadata = {
  title: "Deploy your own server",
  description:
    "Run Noggin on a cloud VPS instead of hardware at home — Ubuntu bootstrap, hardening, Tailscale vs Cloudflare Tunnel, and what not to do.",
};

export default function DeployDocsPage() {
  return (
    <>
      <Section className="pt-14 pb-10 sm:pt-20">
        <Reveal>
          <Kicker>Docs</Kicker>
          <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Deploy your own server
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-secondary text-pretty">
            Noggin doesn&apos;t need to live on a computer at your desk. A small cloud VPS keeps
            it online 24/7 without your laptop staying awake. This guide is provider-agnostic —
            it works on DigitalOcean, Hetzner, Linode, AWS Lightsail, or anywhere you can get a
            fresh Ubuntu box.
          </p>
        </Reveal>
        <Reveal delay={80}>
          <Pill tone="peach" className="mt-6">
            For comfortable-with-a-terminal users
          </Pill>
        </Reveal>
      </Section>

      <Section className="py-10">
        <Reveal>
          <SectionHeader kicker="When to prefer this" title="VPS vs. a machine at home" />
        </Reveal>
        <Reveal delay={80}>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <KipCard>
              <p className="font-semibold text-ink">Prefer a VPS when...</p>
              <ul className="mt-3 space-y-2 text-sm text-ink-secondary">
                <li>You don&apos;t have a machine that stays powered on 24/7.</li>
                <li>You want a stable public hostname instead of relying on your home network.</li>
                <li>You&apos;re fine paying a few dollars a month for a small cloud box.</li>
              </ul>
            </KipCard>
            <KipCard>
              <p className="font-semibold text-ink">Prefer /get&apos;s home setup when...</p>
              <ul className="mt-3 space-y-2 text-sm text-ink-secondary">
                <li>You already have a Mac, Linux box, or Windows machine that&apos;s always on.</li>
                <li>You&apos;d rather keep everything on hardware you physically control.</li>
                <li>
                  You want the simplest path —{" "}
                  <Link href="/get#run-your-server" className="font-semibold text-ink underline underline-offset-4">
                    see /get
                  </Link>
                  .
                </li>
              </ul>
            </KipCard>
          </div>
        </Reveal>
      </Section>

      <Section className="py-10">
        <Reveal>
          <SectionHeader kicker="Setup" title="Ubuntu server: bootstrap and harden" />
          <p className="mt-4 max-w-2xl text-ink-secondary text-pretty">
            The noggin repo ships scripts under <code className="font-mono text-ink">deploy/</code>{" "}
            that were built for Brandon&apos;s own multi-tenant pilot host, so treat them as a
            reference to crib from rather than a single button to press — but the Docker,
            hardening, and sandboxing pieces apply directly to a single-user deploy too.
          </p>
        </Reveal>

        <Reveal delay={80}>
          <div className="mt-8 space-y-6">
            <KipCard className="p-6">
              <p className="font-semibold text-ink">1. Get Docker running</p>
              <p className="mt-2 text-sm text-ink-secondary">
                <code className="font-mono text-ink">deploy/bootstrap-ubuntu.sh</code> installs
                Docker Engine from the official repo on a fresh Ubuntu Server box, plus a default
                firewall posture. It also sets up pieces specific to Brandon&apos;s tenant-hosting
                pilot (a control-plane service, Cloudflare Tunnel ingress) — read it before
                running the whole thing, and feel free to run just the Docker install section by
                hand if that&apos;s all you need.
              </p>
              <div className="mt-3">
                <CodeBlock code={`sudo -E ./deploy/bootstrap-ubuntu.sh`} label="run as root, from the noggin repo" />
              </div>
            </KipCard>

            <KipCard className="p-6">
              <p className="font-semibold text-ink">2. Harden the host</p>
              <p className="mt-2 text-sm text-ink-secondary">
                <code className="font-mono text-ink">deploy/harden-host.sh</code> locks down SSH
                (no password auth, no root login), enforces a default-deny inbound firewall with
                nftables, and turns on unattended security upgrades. Run it after Tailscale is up
                so its rules can see the tailnet interface.
              </p>
              <div className="mt-3">
                <CodeBlock code={`sudo tailscale up --ssh --hostname noggin-host\nsudo ./deploy/harden-host.sh`} />
              </div>
            </KipCard>

            <KipCard className="p-6">
              <p className="font-semibold text-ink">3. Optional: gVisor sandboxing</p>
              <p className="mt-2 text-sm text-ink-secondary">
                <code className="font-mono text-ink">deploy/install-gvisor.sh</code> registers
                gVisor (<code className="font-mono text-ink">runsc</code>) as an available Docker
                runtime without touching your existing daemon config. It doesn&apos;t change
                Docker&apos;s default runtime — you opt a container into it explicitly. This is the
                real isolation boundary worth having, since the agent can run shell commands on
                the host it&apos;s deployed to.
              </p>
              <div className="mt-3">
                <CodeBlock code={`sudo ./deploy/install-gvisor.sh\n\n# then run the gateway container with:\ndocker run --runtime runsc ... hermes-agent`} />
              </div>
            </KipCard>

            <KipCard className="p-6">
              <p className="font-semibold text-ink">4. Start the gateway with Docker Compose</p>
              <p className="mt-2 text-sm text-ink-secondary">
                The repo&apos;s <code className="font-mono text-ink">docker-compose.yml</code> is
                built for exactly this — a single-user deploy. Set your provider key in{" "}
                <code className="font-mono text-ink">~/.hermes/.env</code>, generate a strong{" "}
                <code className="font-mono text-ink">API_SERVER_KEY</code> (
                <code className="font-mono text-ink">openssl rand -hex 32</code> — anything under
                16 characters is refused at startup), uncomment{" "}
                <code className="font-mono text-ink">API_SERVER_HOST</code> /{" "}
                <code className="font-mono text-ink">API_SERVER_KEY</code> in the compose file,
                and bring it up.
              </p>
              <div className="mt-3">
                <CodeBlock code={`HERMES_UID=$(id -u) HERMES_GID=$(id -g) docker compose up -d`} />
              </div>
              <p className="mt-3 text-sm text-ink-secondary">
                <code className="font-mono text-ink">restart: unless-stopped</code> in the compose
                file keeps the gateway running across reboots — the repo&apos;s{" "}
                <code className="font-mono text-ink">deploy/systemd/</code> units are specific to
                Brandon&apos;s multi-tenant pilot, so Compose&apos;s own restart policy is the
                simplest way to keep a single-user gateway alive. If you&apos;d rather run the
                gateway as a bare process, wrap{" "}
                <code className="font-mono text-ink">python -m hermes_cli.main gateway run</code>{" "}
                in your own minimal systemd unit.
              </p>
            </KipCard>
          </div>
        </Reveal>
      </Section>

      <Section className="py-10">
        <Reveal>
          <SectionHeader kicker="Exposure" title="Tailscale vs. Cloudflare Tunnel" />
        </Reveal>
        <Reveal delay={80}>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <KipCard className="p-6">
              <Pill tone="mint">Recommended</Pill>
              <p className="mt-4 font-semibold text-ink">Tailscale</p>
              <p className="mt-2 text-sm text-ink-secondary">
                Private mesh network — only your own devices can reach the server, over an
                encrypted tunnel, with no public DNS record at all.
              </p>
              <div className="mt-3">
                <CodeBlock code={`tailscale serve https / http://127.0.0.1:8642`} />
              </div>
            </KipCard>
            <KipCard className="p-6">
              <Pill tone="sky">Alternative</Pill>
              <p className="mt-4 font-semibold text-ink">Cloudflare Tunnel</p>
              <p className="mt-2 text-sm text-ink-secondary">
                Gives you a real public HTTPS hostname without opening any inbound ports — useful
                if you want to reach the server from a device that isn&apos;t on your tailnet.
                Get a tunnel token from the Cloudflare Zero Trust dashboard, then:
              </p>
              <div className="mt-3">
                <CodeBlock
                  code={`curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb\nsudo apt-get install -y ./cloudflared.deb\nsudo cloudflared service install <your-tunnel-token>`}
                />
              </div>
            </KipCard>
          </div>
        </Reveal>
      </Section>

      <Section className="py-10">
        <Reveal>
          <SectionHeader kicker="Checklist" title="Hardening checklist" />
        </Reveal>
        <Reveal delay={80}>
          <KipCard className="mt-8 max-w-2xl p-7">
            <ul className="space-y-3 text-sm text-ink-secondary">
              <li>
                <span className="font-semibold text-ink">Strong API_SERVER_KEY</span> — generate
                with <code className="font-mono text-ink">openssl rand -hex 32</code>; the server
                refuses anything under 16 characters.
              </li>
              <li>
                <span className="font-semibold text-ink">Dashboard stays localhost-only</span> —
                the dashboard service binds to 127.0.0.1 by default and stores API keys; if you
                need remote access, tunnel it (<code className="font-mono text-ink">ssh -L</code>)
                rather than exposing it directly.
              </li>
              <li>
                <span className="font-semibold text-ink">Default-deny inbound firewall</span> —
                only allow the ports you actually need exposed (or none, if you&apos;re routing
                everything through Tailscale/Cloudflare Tunnel).
              </li>
              <li>
                <span className="font-semibold text-ink">Keep the host updated</span> —
                unattended security upgrades, and re-run{" "}
                <code className="font-mono text-ink">deploy/harden-host.sh</code> after major
                changes.
              </li>
            </ul>
          </KipCard>
        </Reveal>
      </Section>

      <Section className="py-14">
        <Reveal>
          <KipCard className="max-w-2xl border-hairline-strong p-7">
            <p className="font-semibold text-ink">What NOT to do</p>
            <ul className="mt-4 space-y-3 text-sm text-ink-secondary">
              <li>
                Don&apos;t pair or serve over plain{" "}
                <code className="font-mono text-ink">http://</code> on the open internet — the
                pairing token is a bearer credential.
              </li>
              <li>Don&apos;t expose the dashboard beyond localhost/a tunnel — it stores API keys.</li>
              <li>
                Don&apos;t run this as multi-user infrastructure from one instance — it&apos;s
                single-user software today. One server, one person.
              </li>
            </ul>
          </KipCard>
        </Reveal>
      </Section>
    </>
  );
}
