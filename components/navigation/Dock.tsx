"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { PRIMARY_NAV } from "@/config/navigation";
import { useCommandPalette } from "@/components/navigation/CommandPaletteProvider";
import { cn } from "@/lib/utilities/cn";
import { Kbd } from "@/components/ui/Kbd";

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Candler's signature navigation: a floating glass dock centered at the bottom
 * of the viewport — deliberately not a permanent left sidebar. Icon buttons
 * reveal their label on hover/focus (desktop) and stay reachable via swipe +
 * screen-reader labels on mobile. The trailing button opens the command palette.
 */
export function Dock() {
  const pathname = usePathname();
  const { setOpen } = useCommandPalette();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4"
    >
      <div
        className={cn(
          "glass ring-glow flex max-w-[calc(100vw-2rem)] items-center gap-1 rounded-full p-1.5",
          "overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        )}
      >
        {PRIMARY_NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex size-11 shrink-0 items-center justify-center rounded-full transition-colors",
                active
                  ? "bg-purple text-white shadow-glow-sm"
                  : "text-fog hover:bg-white/8 hover:text-white",
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
              {/* Tooltip label (desktop hover/focus). */}
              <span
                role="tooltip"
                className={cn(
                  "pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg px-2.5 py-1",
                  "glass text-xs font-medium text-white opacity-0 transition-opacity",
                  "group-hover:opacity-100 group-focus-visible:opacity-100",
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}

        <span className="mx-1 h-6 w-px shrink-0 bg-line" aria-hidden="true" />

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open command palette"
          aria-keyshortcuts="Meta+K Control+K"
          className="flex h-11 shrink-0 items-center gap-2 rounded-full px-3.5 text-fog transition-colors hover:bg-white/8 hover:text-white"
        >
          <Search className="size-5" aria-hidden="true" />
          <span className="hidden items-center gap-1 sm:flex">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>
      </div>
    </nav>
  );
}
