import type { LucideIcon } from "lucide-react";

/** A primary destination in the Candler workspace, shown in the dock. */
export interface NavItem {
  /** Stable id, also used as the command-palette key. */
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Short description surfaced in the command palette. */
  description: string;
}

/** A grouping of command-palette entries. */
export interface CommandGroup {
  id: string;
  heading: string;
  items: CommandItem[];
}

export interface CommandItem {
  id: string;
  label: string;
  /** Optional context line (e.g. the owning project). */
  hint?: string;
  icon: LucideIcon;
  href?: string;
  keywords?: string[];
}
