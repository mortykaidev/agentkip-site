import Link from "next/link";
import { ADMIN_SECTIONS } from "@/app/admin/_lib/sections";
import { Pill } from "@/components/ui";
import { getStore } from "@/lib/store";
import { getErrorMessage } from "@/lib/store-types";

/* Admin dashboard: every editable surface plus submission counts. */

type DashboardData = {
  customized: Record<string, boolean>;
  waitlistCount: number;
  messageCount: number;
};

async function loadDashboard(): Promise<DashboardData | { error: string }> {
  try {
    const store = getStore();
    const [sections, waitlistEntries, messages] = await Promise.all([
      Promise.all(ADMIN_SECTIONS.map((section) => store.getSection(section.key))),
      store.listWaitlist(),
      store.listContactMessages(),
    ]);
    const customized = Object.fromEntries(
      ADMIN_SECTIONS.map((section, index) => [section.slug, sections[index] !== null]),
    );
    return { customized, waitlistCount: waitlistEntries.length, messageCount: messages.length };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}

export default async function AdminDashboardPage() {
  const data = await loadDashboard();

  if ("error" in data) {
    return (
      <div className="kip-card p-5">
        <p className="text-sm text-danger" role="alert">
          Couldn&apos;t reach the store: {data.error}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-muted">
          Content sections
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {ADMIN_SECTIONS.map((section) => (
            <Link
              key={section.slug}
              href={`/admin/${section.slug}`}
              className="kip-card kip-press block p-4 transition-colors hover:border-hairline-strong"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-ink">{section.title}</p>
                {data.customized[section.slug] ? (
                  <Pill tone="mint">Customized</Pill>
                ) : (
                  <Pill tone="outline">Defaults</Pill>
                )}
              </div>
              <p className="mt-1.5 text-sm text-ink-secondary">{section.description}</p>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-muted">
          Submissions
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/admin/waitlist"
            className="kip-card kip-press block p-4 transition-colors hover:border-hairline-strong"
          >
            <p className="text-3xl font-semibold text-ink">{data.waitlistCount}</p>
            <p className="mt-1 text-sm text-ink-secondary">Waitlist signups</p>
          </Link>
          <Link
            href="/admin/messages"
            className="kip-card kip-press block p-4 transition-colors hover:border-hairline-strong"
          >
            <p className="text-3xl font-semibold text-ink">{data.messageCount}</p>
            <p className="mt-1 text-sm text-ink-secondary">Contact messages</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
