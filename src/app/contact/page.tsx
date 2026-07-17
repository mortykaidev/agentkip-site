import type { Metadata } from "next";
import { getContent } from "@/lib/content";
import { Section, SectionHeader, KipCard } from "@/components/ui";
import { ContactForm } from "@/components/forms/contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Ask Brandon about AgentKip, the beta, a bug, or a security concern.",
};

export default async function ContactPage() {
  const contact = await getContent("contact");

  return (
    <Section className="py-16 sm:py-24">
      <SectionHeader kicker="Contact" title="Talk to Brandon" lead={contact.blurb} />
      <div className="mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
        <KipCard className="flex flex-col justify-center">
          <h3 className="text-base font-semibold text-ink">Email</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
            Prefer email? Your note goes to Brandon.
          </p>
          <a
            href={`mailto:${contact.email}`}
            className="mt-4 inline-block text-[15px] font-semibold text-accent"
          >
            {contact.email}
          </a>
        </KipCard>
        <ContactForm />
      </div>
    </Section>
  );
}
