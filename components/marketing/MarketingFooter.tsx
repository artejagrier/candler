import Link from "next/link";

import { Wordmark } from "@/components/brand/Wordmark";
import { SITE } from "@/config/site";

const FOOTER_LINKS: { heading: string; links: { label: string; href: string }[] }[] =
  [
    {
      heading: "Product",
      links: [
        { label: "Features", href: "/features" },
        { label: "Integrations", href: "/#integrations" },
        { label: "Pricing", href: "/pricing" },
        { label: "Sign up", href: "/sign-up" },
      ],
    },
    {
      heading: "Company",
      links: [
        { label: "About", href: "/about" },
        { label: "Contact", href: "/contact" },
        { label: "FAQ", href: "/faq" },
      ],
    },
    {
      heading: "Legal",
      links: [
        { label: "Privacy", href: "/privacy" },
        { label: "Terms", href: "/terms" },
      ],
    },
  ];

export function MarketingFooter() {
  return (
    <footer className="mt-24 border-t border-line px-4 py-14 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div className="max-w-xs">
          <Wordmark size="md" href="/" />
          <p className="mt-4 text-sm leading-relaxed text-fog">
            {SITE.tagline} Candler bridges your stack — it doesn&apos;t replace
            it.
          </p>
        </div>

        {FOOTER_LINKS.map((column) => (
          <nav key={column.heading} aria-label={column.heading}>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-muted">
              {column.heading}
            </h2>
            <ul className="mt-4 flex flex-col gap-2.5">
              {column.links.map((link) => (
                <li key={link.href}>
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

      <div className="mx-auto mt-12 flex max-w-6xl flex-col items-start justify-between gap-3 border-t border-line pt-6 text-sm text-slate-muted sm:flex-row sm:items-center">
        <p>
          © {SITE.name} — {SITE.domain}. The dynamic sky follows your local time.
        </p>
        <p>Built with honest security. No fake encryption.</p>
      </div>
    </footer>
  );
}
