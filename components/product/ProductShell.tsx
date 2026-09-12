"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { PRODUCT_NAV } from "@/config/product";
import { Wordmark } from "@/components/brand/Wordmark";
import { AccountMenu } from "@/components/product/AccountMenu";
import { NotificationsMenu } from "@/components/product/NotificationsMenu";
import { CommandPalette } from "@/components/product/CommandPalette";
import { cn } from "@/lib/utilities/cn";

function useActive(href: string) {
  const pathname = usePathname();
  return pathname === href || (href !== "/app" && pathname.startsWith(`${href}/`));
}

function NavLink({ href, label }: { href: string; label: string }) {
  const active = useActive(href);
  return (
    <Link href={href} className={cn("app-nav-link", active && "app-nav-link--active")} aria-current={active ? "page" : undefined}>
      {label}
    </Link>
  );
}

export function ProductShell({
  children,
  userName,
  workspaceName,
}: {
  children: React.ReactNode;
  userName: string;
  workspaceName: string;
}) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  // Global ⌘K / Ctrl+K to toggle the command palette.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="app-shell">
      <header className="app-navbar">
        <Wordmark href="/app" size="sm" />
        <nav className="app-nav" aria-label="Primary">
          {PRODUCT_NAV.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} />
          ))}
        </nav>

        <div className="app-nav-actions">
          <button type="button" className="app-search" onClick={() => setPaletteOpen(true)} aria-label="Search and commands" aria-keyshortcuts="Meta+K Control+K">
            <Search className="size-4" aria-hidden="true" />
            <span className="app-search-label">Search…</span>
            <kbd>⌘K</kbd>
          </button>
          <NotificationsMenu />
          <AccountMenu userName={userName} workspaceName={workspaceName} />
        </div>
      </header>

      <main className="app-content">{children}</main>

      <nav className="app-mobile-nav" aria-label="Primary">
        {PRODUCT_NAV.map(({ href, label, icon: Icon }) => (
          <MobileLink key={href} href={href} label={label} Icon={Icon} />
        ))}
      </nav>

      {paletteOpen ? <CommandPalette onClose={closePalette} /> : null}
    </div>
  );
}

function MobileLink({ href, label, Icon }: { href: string; label: string; Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }> }) {
  const active = useActive(href);
  return (
    <Link href={href} className={cn(active && "app-mobile-link--active")} aria-current={active ? "page" : undefined}>
      <Icon className="size-5" aria-hidden={true} />
      <span>{label}</span>
    </Link>
  );
}
