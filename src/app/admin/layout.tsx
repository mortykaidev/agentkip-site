import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AdminNav, type AdminNavItem } from "@/app/admin/_components/admin-nav";
import { ADMIN_SECTIONS } from "@/app/admin/_lib/sections";
import { Kicker, KipCard, Pill, Section } from "@/components/ui";
import { checkAdminAccess, isClerkConfigured } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Site manager",
  robots: { index: false, follow: false },
};

/* Submissions are live data and the gate must re-run per request. */
export const dynamic = "force-dynamic";

const NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard" },
  ...ADMIN_SECTIONS.map((section) => ({
    href: `/admin/${section.slug}`,
    label: section.title,
  })),
  { href: "/admin/waitlist", label: "Waitlist" },
  { href: "/admin/messages", label: "Messages" },
];

function DeniedCard() {
  return (
    <Section className="py-24">
      <KipCard className="mx-auto max-w-md p-8 text-center">
        <h1 className="text-xl font-semibold text-ink">This area is for the site owner</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
          Your account doesn&apos;t have access to the site manager. If that seems wrong, make
          sure your Clerk user id is listed in ADMIN_USER_IDS.
        </p>
      </KipCard>
    </Section>
  );
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const access = await checkAdminAccess();
  if (!access.allowed) {
    if (access.reason === "signed-out") redirect("/sign-in");
    return <DeniedCard />;
  }

  return (
    <Section className="py-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Kicker className="mb-2">Site manager</Kicker>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Admin</h1>
        </div>
        {!isClerkConfigured() ? <Pill tone="butter">Local dev mode — no sign-in</Pill> : null}
      </div>

      <AdminNav items={NAV_ITEMS} />

      <div className="mt-8">{children}</div>
    </Section>
  );
}
