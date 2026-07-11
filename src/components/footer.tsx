import Link from "next/link";
import { KipLockup, OrbitMark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";

const COLUMNS: { heading: string; links: { href: string; label: string }[] }[] = [
  {
    heading: "Product",
    links: [
      { href: "/ios", label: "iOS 27 features" },
      { href: "/compare", label: "How Kip compares" },
      { href: "/use-cases", label: "Use cases" },
      { href: "/gallery", label: "Gallery" },
      { href: "/roadmap", label: "Roadmap" },
      { href: "/changelog", label: "Changelog" },
    ],
  },
  {
    heading: "Get started",
    links: [
      { href: "/get", label: "Get Kip" },
      { href: "/docs/deploy", label: "Deploy a server" },
      { href: "/security", label: "Security" },
      { href: "/faq", label: "FAQ" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/kip", label: "Kip's Corner" },
      { href: "/contact", label: "Contact" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

export function Footer({ statusSlot }: { statusSlot?: React.ReactNode }) {
  return (
    <footer className="mt-24 border-t border-hairline">
      <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8">
        <div className="flex flex-col gap-12 md:flex-row md:justify-between">
          <div className="max-w-xs">
            <div className="flex items-center gap-3 text-ink">
              <KipLockup height={22} />
            </div>
            <p className="mt-4 text-sm leading-relaxed text-ink-secondary">
              Your personal AI agent, living on your iPhone — powered by a server you own.
            </p>
            <div className="mt-5 flex items-center gap-3">
              {statusSlot}
              <ThemeToggle />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            {COLUMNS.map((col) => (
              <div key={col.heading}>
                <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-muted">
                  {col.heading}
                </p>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-ink-secondary transition-colors hover:text-ink"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-hairline pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-ink-muted">
            © {new Date().getFullYear()} AgentKip. Self-hosted, by design.
          </p>
          <div className="flex items-center gap-2 text-xs text-ink-muted">
            <OrbitMark size={18} />
            <span>made with orbit dust</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
