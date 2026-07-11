import { currentUser } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Kicker, KipButton, KipCard, Pill, Section } from "@/components/ui";
import { isClerkConfigured } from "@/lib/auth";
import { getContent } from "@/lib/content";

export const metadata: Metadata = {
  title: "Account",
  description: "Your AgentKip account and beta status.",
};

export const dynamic = "force-dynamic";

function initialsOf(name: string | null, email: string | null): string {
  const source = name?.trim() || email || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export default async function AccountPage() {
  if (!isClerkConfigured()) {
    return (
      <Section className="py-24">
        <KipCard className="mx-auto max-w-md p-8 text-center">
          <h1 className="text-xl font-semibold text-ink">Accounts aren&apos;t set up here yet</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
            This environment has no Clerk keys configured, so there&apos;s nothing to sign in
            to. Add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY to enable accounts.
          </p>
        </KipCard>
      </Section>
    );
  }

  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const name = user.fullName;
  const email = user.primaryEmailAddress?.emailAddress ?? null;
  const status = await getContent("siteStatus");

  return (
    <Section className="py-14">
      <div className="mx-auto max-w-2xl">
        <Kicker className="mb-3">Your account</Kicker>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          {name ? `Hey, ${name.split(" ")[0]}` : "Hey there"}
        </h1>

        <div className="mt-8 space-y-5">
          {/* Profile */}
          <KipCard className="flex items-center gap-4">
            <span
              aria-hidden="true"
              className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-base font-semibold text-on-accent"
            >
              {initialsOf(name, email)}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">{name ?? "Beta tester"}</p>
              {email ? <p className="truncate text-sm text-ink-secondary">{email}</p> : null}
            </div>
          </KipCard>

          {/* Plan — placeholder for future billing */}
          <KipCard>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-muted">
                  Current plan
                </p>
                <p className="mt-1 text-xl font-semibold text-ink">Free Beta</p>
              </div>
              <Pill tone="mint">Active</Pill>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
              Everything is free while Kip is in beta. You bring your own provider API keys, so
              your only costs are the ones you already pay your model provider.
            </p>
            <p className="mt-2 text-xs text-ink-muted">
              Billing isn&apos;t wired up yet — this card is a placeholder for future plans.
            </p>
          </KipCard>

          {/* Beta status */}
          <KipCard>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-muted">
                Beta status
              </p>
              <Pill tone={status.tone}>{status.label}</Pill>
            </div>
            {status.buildNote ? (
              <p className="mt-3 text-sm text-ink-secondary">{status.buildNote}</p>
            ) : null}
          </KipCard>

          {/* Quick links */}
          <div className="flex flex-wrap gap-3">
            <KipButton href="/get" size="sm">
              Get Kip
            </KipButton>
            <KipButton href="/faq" variant="secondary" size="sm">
              Read the FAQ
            </KipButton>
          </div>
        </div>
      </div>
    </Section>
  );
}
