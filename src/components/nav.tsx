"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { KipLockup } from "@/components/brand";

const PRIMARY_LINKS = [
  { href: "/", label: "Product" },
  { href: "/ios", label: "How it works" },
  { href: "/security", label: "Security" },
  { href: "/changelog", label: "Updates" },
];

const MORE_LINKS = [
  { href: "/roadmap", label: "Roadmap" },
  { href: "/compare", label: "Compare" },
  { href: "/use-cases", label: "Use cases" },
  { href: "/faq", label: "FAQ" },
  { href: "/docs/deploy", label: "Deploy a server" },
  { href: "/kip", label: "Kip's Corner" },
  { href: "/contact", label: "Contact" },
];

export function Nav({ accountSlot }: { accountSlot?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  /* Close the menu on route change. Adjusting state during render (rather than
     in an effect) — the endorsed pattern for resetting state when a prop changes. */
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-bg">
      <nav className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-5 sm:px-8">
        <Link href="/" className="flex items-center text-ink" aria-label="AgentKip home">
          <KipLockup height={22} />
        </Link>

        <div className="ml-auto hidden items-center gap-1 lg:flex">
          {PRIMARY_LINKS.map((link) => (
            <NavLink key={link.href} {...link} active={pathname === link.href} />
          ))}
          <div className="group relative">
            <button
              type="button"
              className="rounded-full px-3.5 py-2 text-sm text-ink-secondary transition-colors hover:text-ink"
              aria-haspopup="true"
            >
              Explore
            </button>
            <div className="invisible absolute right-0 top-full pt-2 opacity-0 transition-all group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
              <div className="kip-card flex w-48 flex-col p-2 shadow-xl shadow-black/20">
                {MORE_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-[10px] px-3 py-2 text-sm text-ink-secondary transition-colors hover:bg-elevated hover:text-ink"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 lg:ml-3">
          {accountSlot}
          <Link
            href="/get"
            className="kip-press rounded-full bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:brightness-105"
          >
            Join private beta
          </Link>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="flex size-10 items-center justify-center rounded-full text-ink lg:hidden"
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
              {open ? (
                <path
                  d="M5 5 L15 15 M15 5 L5 15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M3 6 H17 M3 10 H17 M3 14 H17"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {open ? (
        <div className="fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto border-t border-hairline bg-bg lg:hidden">
          <div className="flex flex-col gap-1 px-5 py-6">
            {[...PRIMARY_LINKS, ...MORE_LINKS].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-[10px] px-4 py-3 text-lg ${
                  pathname === link.href ? "bg-surface text-ink" : "text-ink-secondary"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/get"
              className="kip-press mt-4 rounded-[14px] bg-accent px-4 py-3.5 text-center text-lg font-semibold text-on-accent"
            >
            Join private beta
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3.5 py-2 text-sm transition-colors ${
        active ? "bg-surface text-ink" : "text-ink-secondary hover:text-ink"
      }`}
      aria-current={active ? "page" : undefined}
    >
      {label}
    </Link>
  );
}
