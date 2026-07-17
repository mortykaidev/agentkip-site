"use client";

import { useState } from "react";
import { CodeBlock } from "@/app/get/code-block";
import { TAILSCALE_LINKS, TAILSCALE_SERVE_COMMAND } from "@/lib/tailscale-links";

/**
 * Client-side OS tab switcher for the "run your server" quickstart on /get.
 * Used by: src/app/get/page.tsx.
 * Steps come from verified noggin facts (README.md, docker-compose.yml,
 * docker-compose.windows.yml, .env.example, AgentKip iOS pairing docs) —
 * It is rendered only after the admin content model contains a verified public
 * repository URL, so the commands never expose a fake clone destination.
 */

type OsKey = "macos" | "linux" | "windows" | "docker";

const TABS: { key: OsKey; label: string }[] = [
  { key: "macos", label: "macOS" },
  { key: "linux", label: "Linux" },
  { key: "windows", label: "Windows" },
  { key: "docker", label: "Docker" },
];

export function OsTabs({ repositoryUrl }: { repositoryUrl: string }) {
  const [active, setActive] = useState<OsKey>("macos");

  return (
    <div>
      <div className="flex flex-wrap gap-2 border-b border-hairline pb-4">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={`kip-press rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              active === tab.key
                ? "bg-accent text-on-accent"
                : "bg-surface text-ink-secondary hover:text-ink"
            }`}
            aria-pressed={active === tab.key}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {active === "macos" ? <MacLinuxSteps os="macos" repositoryUrl={repositoryUrl} /> : null}
        {active === "linux" ? <MacLinuxSteps os="linux" repositoryUrl={repositoryUrl} /> : null}
        {active === "windows" ? <WindowsSteps repositoryUrl={repositoryUrl} /> : null}
        {active === "docker" ? <DockerSteps repositoryUrl={repositoryUrl} /> : null}
      </div>
    </div>
  );
}

function StepList({ children }: { children: React.ReactNode }) {
  return <ol className="space-y-6">{children}</ol>;
}

function Step({
  n,
  title,
  body,
  code,
  codeLabel,
}: {
  n: number;
  title: string;
  body?: React.ReactNode;
  code?: string;
  codeLabel?: string;
}) {
  return (
    <li className="flex gap-4">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-elevated text-xs font-semibold text-ink-secondary">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">{title}</p>
        {body ? <div className="mt-1 text-sm text-ink-secondary">{body}</div> : null}
        {code ? (
          <div className="mt-3">
            <CodeBlock code={code} label={codeLabel} />
          </div>
        ) : null}
      </div>
    </li>
  );
}

function TailscaleResources({
  description,
  installHref,
  installLabel,
}: {
  description: string;
  installHref: string;
  installLabel: string;
}) {
  return (
    <>
      <p>{description}</p>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        <a
          href={installHref}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-accent underline underline-offset-4 hover:text-ink"
        >
          {installLabel}
        </a>
        <a
          href={TAILSCALE_LINKS.serve}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-accent underline underline-offset-4 hover:text-ink"
        >
          Tailscale Serve guide
        </a>
      </p>
    </>
  );
}

function MacLinuxSteps({
  os,
  repositoryUrl,
}: {
  os: "macos" | "linux";
  repositoryUrl: string;
}) {
  return (
    <StepList>
      <Step
        n={1}
        title="Clone Noggin"
        body="Clone the verified public repository wherever you keep projects."
        code={`git clone ${repositoryUrl} noggin\ncd noggin`}
      />
      <Step
        n={2}
        title="Create a Python 3.11+ virtual environment"
        code={`python3 -m venv .venv\nsource .venv/bin/activate\npip install -e ".[all,dev]"`}
      />
      <Step
        n={3}
        title="Add your provider key"
        body="Simplest path is a single OpenRouter key. Prefer to go direct? Anthropic or OpenAI keys work too — see the .env.example for both."
        code={`mkdir -p ~/.hermes\ncat >> ~/.hermes/.env <<'EOF'\nOPENROUTER_API_KEY=sk-or-...\nEOF`}
        codeLabel="~/.hermes/.env"
      />
      <Step
        n={4}
        title="Generate a strong API server key"
        body="The server refuses to start with a weak or missing key — under 16 characters gets rejected outright."
        code={`openssl rand -hex 32\n# paste the output as API_SERVER_KEY in ~/.hermes/.env\n# also set API_SERVER_HOST=0.0.0.0 and API_SERVER_ENABLED=true`}
      />
      <Step
        n={5}
        title="Start the gateway"
        code={`python -m hermes_cli.main gateway run`}
      />
      <Step
        n={6}
        title="Expose it over Tailscale — or skip this with the agentkip.app relay"
        body={
          <TailscaleResources
            installHref={os === "macos" ? TAILSCALE_LINKS.mac : TAILSCALE_LINKS.linux}
            installLabel={os === "macos" ? "Install Tailscale on Mac" : "Install Tailscale on Linux"}
            description={
              os === "macos"
                ? "Sign in to Tailscale, then share Noggin privately over HTTPS. The agentkip.app relay is the no-install option."
                : "Tailscale gives Noggin a private HTTPS address without opening router ports. The agentkip.app relay is the no-install option."
            }
          />
        }
        code={TAILSCALE_SERVE_COMMAND}
      />
      <Step
        n={7}
        title="Generate a pairing QR and scan it in the app"
        code={`scripts/noggin-host.py qr --mode tailscale --output /tmp/noggin-pairing.png`}
      />
    </StepList>
  );
}

function WindowsSteps({ repositoryUrl }: { repositoryUrl: string }) {
  return (
    <StepList>
      <Step
        n={1}
        title="Install Docker Desktop"
        body="Noggin on Windows runs through Docker Desktop — there's a dedicated compose file for it."
      />
      <Step
        n={2}
        title="Clone Noggin"
        body="Clone the verified public repository."
        code={`git clone ${repositoryUrl} noggin\ncd noggin`}
      />
      <Step
        n={3}
        title="Add your provider key"
        body={`Put it in %USERPROFILE%\\.hermes\\.env — OpenRouter single key, or Anthropic/OpenAI direct.`}
        code={`OPENROUTER_API_KEY=sk-or-...`}
        codeLabel="%USERPROFILE%\.hermes\.env"
      />
      <Step
        n={4}
        title="Generate a strong API server key"
        body="Under 16 characters gets refused at startup — use a real random key."
        code={`openssl rand -hex 32`}
      />
      <Step
        n={5}
        title="Start with the Windows compose file"
        code={`docker compose -f docker-compose.windows.yml up -d`}
      />
      <Step
        n={6}
        title="Expose it over Tailscale, then pair"
        body={
          <TailscaleResources
            installHref={TAILSCALE_LINKS.windows}
            installLabel="Install Tailscale on Windows"
            description="Pair over Tailscale or the agentkip.app relay. Never use plain HTTP on a network you do not trust."
          />
        }
        code={TAILSCALE_SERVE_COMMAND}
      />
    </StepList>
  );
}

function DockerSteps({ repositoryUrl }: { repositoryUrl: string }) {
  return (
    <StepList>
      <Step
        n={1}
        title="Clone Noggin"
        body="Clone the verified public repository."
        code={`git clone ${repositoryUrl} noggin\ncd noggin`}
      />
      <Step
        n={2}
        title="Add your provider key to ~/.hermes/.env"
        code={`mkdir -p ~/.hermes\ncat >> ~/.hermes/.env <<'EOF'\nOPENROUTER_API_KEY=sk-or-...\nEOF`}
      />
      <Step
        n={3}
        title="Turn on the API server"
        body="It's off by default in the compose file — uncomment API_SERVER_HOST and API_SERVER_KEY in docker-compose.yml (or set them in the env file) before starting."
        code={`# in docker-compose.yml, under the gateway service:\n# - API_SERVER_HOST=0.0.0.0\n# - API_SERVER_KEY=\${API_SERVER_KEY}\n\nexport API_SERVER_KEY=$(openssl rand -hex 32)`}
      />
      <Step
        n={4}
        title="Bring it up"
        code={`HERMES_UID=$(id -u) HERMES_GID=$(id -g) docker compose up -d`}
      />
      <Step
        n={5}
        title="Expose it over Tailscale, then pair"
        body={
          <TailscaleResources
            installHref={TAILSCALE_LINKS.download}
            installLabel="Get Tailscale for your host"
            description="Run Tailscale on the computer hosting Docker, or use the agentkip.app relay. Never pair over plain HTTP on a network you do not trust."
          />
        }
        code={TAILSCALE_SERVE_COMMAND}
      />
    </StepList>
  );
}
