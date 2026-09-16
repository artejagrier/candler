import Link from "next/link";

import { Wordmark } from "@/components/brand/Wordmark";
import { SITE } from "@/config/site";

const FOOTER_COLUMNS: { heading: string; links: { label: string; href: string }[] }[] =
  [
    {
      heading: "Product",
      links: [
        { label: "Agent", href: "/#agent" },
        { label: "Vault", href: "/#vault" },
        { label: "Cloud", href: "/#cloud" },
        { label: "Authenticator", href: "/#auth" },
        { label: "Recovery", href: "/#auth" },
        { label: "Pricing", href: "/pricing" },
      ],
    },
    {
      heading: "Resources",
      links: [
        { label: "Documentation", href: "/docs" },
        { label: "Security", href: "/security" },
        { label: "FAQ", href: "/faq" },
        { label: "Status", href: "/status" },
      ],
    },
    {
      heading: "Company",
      links: [
        { label: "About", href: "/about" },
        { label: "Contact", href: "/contact" },
      ],
    },
    {
      heading: "Legal",
      links: [
        { label: "Privacy", href: "/privacy" },
        { label: "Terms", href: "/terms" },
        { label: "Refund Policy", href: "/refund" },
        { label: "Acceptable Use", href: "/acceptable-use" },
      ],
    },
  ];

export function MarketingFooter() {
  return (
    <footer className="border-t border-line px-4 py-14 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.6fr_1fr_1fr_1fr_1fr]">
        {/* Brand column */}
        <div className="max-w-xs">
          <Wordmark size="md" href="/" />
          <p className="mt-4 text-sm leading-relaxed text-fog">
            One guardian for your secrets, environments, and backups.
            Candler watches your stack so you don&apos;t have to.
          </p>
          <p className="mt-3 text-xs text-slate-muted">{SITE.domain}</p>
        </div>

        {/* Link columns */}
        {FOOTER_COLUMNS.map((col) => (
          <nav key={col.heading} aria-label={col.heading}>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-muted">
              {col.heading}
            </h2>
            <ul className="flex flex-col gap-2.5">
              {col.links.map((link) => (
                <li key={link.href + link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-fog transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="mx-auto mt-12 flex max-w-6xl flex-col items-start justify-between gap-3 border-t border-line pt-6 text-xs text-slate-muted sm:flex-row sm:items-center">
        <p>© {new Date().getFullYear()} {SITE.name}. All rights reserved.</p>
        <p>Encrypted by default. No fake security.</p>
      </div>
    </footer>
  );
}
