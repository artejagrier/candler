"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Wordmark } from "@/components/brand/Wordmark";
import { buttonClassName } from "@/components/ui/Button";
import { MARKETING_NAV } from "@/config/marketing";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { cn } from "@/lib/utilities/cn";

/**
 * Marketing site header: a floating glass bar with the wordmark, primary nav,
 * and auth CTAs. On small screens the nav collapses into an accessible
 * full-screen overlay menu (scroll-locked, ESC to close, closes on navigation).
 *
 * Menu state is closed via link onClick rather than a pathname effect to respect
 * the enforced `react-hooks/set-state-in-effect` rule.
 */
export function MarketingHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isActive = (href: string) =>
    href.startsWith("/#") ? false : pathname === href;

  return (
    <header className="sticky top-0 z-50 px-4 pt-4 sm:px-6">
      <div className="glass ring-glow mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-full py-2.5 pl-4 pr-2.5">
        <Wordmark size="sm" />

        {/* Desktop nav */}
        <nav
          aria-label="Primary"
          className="hidden items-center gap-1 md:flex"
        >
          {MARKETING_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "bg-white/8 text-white"
                  : "text-fog hover:bg-white/6 hover:text-white",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href={AUTH_ROUTES.signIn}
            className="hidden rounded-full px-3.5 py-1.5 text-sm font-medium text-fog transition-colors hover:text-white sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href={AUTH_ROUTES.signUp}
            className={buttonClassName({ size: "sm", className: "hidden sm:inline-flex" })}
          >
            Get started
          </Link>

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            className="flex size-9 items-center justify-center rounded-full text-fog transition-colors hover:bg-white/8 hover:text-white md:hidden"
          >
            {open ? (
              <X className="size-5" aria-hidden="true" />
            ) : (
              <Menu className="size-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile overlay menu */}
      {open ? (
        <div
          id="mobile-menu"
          className="animate-rise fixed inset-x-0 bottom-0 top-[76px] z-40 px-4 md:hidden"
        >
          <div className="glass ring-glow flex h-full flex-col gap-1 rounded-3xl p-4">
            <nav aria-label="Mobile" className="flex flex-col gap-1">
              {MARKETING_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-2xl px-4 py-3 text-base font-medium transition-colors",
                    isActive(item.href)
                      ? "bg-white/8 text-white"
                      : "text-mist hover:bg-white/6 hover:text-white",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="mt-auto flex flex-col gap-2.5 border-t border-line pt-4">
              <Link
                href={AUTH_ROUTES.signIn}
                onClick={() => setOpen(false)}
                className={buttonClassName({
                  variant: "secondary",
                  size: "lg",
                  className: "w-full",
                })}
              >
                Sign in
              </Link>
              <Link
                href={AUTH_ROUTES.signUp}
                onClick={() => setOpen(false)}
                className={buttonClassName({ size: "lg", className: "w-full" })}
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
