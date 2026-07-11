import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";
import { KipCard, Section } from "@/components/ui";
import { isClerkConfigured } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your AgentKip account.",
};

export default function SignInPage() {
  if (!isClerkConfigured()) {
    return (
      <Section className="py-24">
        <KipCard className="mx-auto max-w-md p-8 text-center">
          <h1 className="text-xl font-semibold text-ink">
            Sign-in isn&apos;t set up in this environment yet
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
            This deployment doesn&apos;t have Clerk keys configured, so accounts are switched
            off. Everything else on the site works without one.
          </p>
        </KipCard>
      </Section>
    );
  }

  return (
    <Section className="py-16">
      <div className="flex justify-center">
        <SignIn />
      </div>
    </Section>
  );
}
