"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AgentKipWordmark } from "@/components/brand";

const LINKS = [
  { href: "/#product", label: "Product" },
  { href: "/security", label: "Security" },
  { href: "/docs/deploy", label: "Docs" },
] as const;

export function Nav({ accountSlot }: { accountSlot?: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.documentElement.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <header className="launch-header">
      <nav className="launch-nav" aria-label="Primary navigation">
        <Link
          href="/"
          className="launch-wordmark-link"
          aria-label="AgentKip home"
          onClick={() => setOpen(false)}
        >
          <AgentKipWordmark />
        </Link>

        <div className="launch-nav-links">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(pathname, link.href) ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="launch-nav-actions">
          <Link
            href="/get"
            className="launch-nav-get"
            aria-current={pathname === "/get" ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            Get Kip
          </Link>
          <button
            type="button"
            className="launch-menu-button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="launch-mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              {open ? (
                <path d="M5 5 15 15M15 5 5 15" />
              ) : (
                <path d="M3 5.5h14M3 10h14M3 14.5h14" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {open ? (
        <div id="launch-mobile-menu" className="launch-mobile-menu">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(pathname, link.href) ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {accountSlot ? <div className="launch-mobile-account">{accountSlot}</div> : null}
        </div>
      ) : null}
    </header>
  );
}

function isActive(pathname: string, href: string) {
  if (href.startsWith("/#")) return false;
  return pathname === href;
}
