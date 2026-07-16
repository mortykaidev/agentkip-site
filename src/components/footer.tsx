import Link from "next/link";

const COLUMNS = [
  {
    heading: "Product",
    links: [
      { href: "/#product", label: "Overview" },
      { href: "/how-it-works", label: "How it works" },
      { href: "/get", label: "Get Kip" },
      { href: "/gallery", label: "Gallery" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { href: "/docs/deploy", label: "Documentation" },
      { href: "/support", label: "Support" },
      { href: "/faq", label: "FAQ" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/security", label: "Security" },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="launch-footer">
      <div className="launch-footer-inner">
        <div className="launch-footer-columns">
          {COLUMNS.map((column) => (
            <div key={column.heading}>
              <h2>{column.heading}</h2>
              <ul>
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="launch-footer-meta">
        <p>© {new Date().getFullYear()} Hayward Imagination Company LLC</p>
        <p>AgentKip is built to connect to a Noggin you control.</p>
      </div>
    </footer>
  );
}
