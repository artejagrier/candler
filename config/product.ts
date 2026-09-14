import {
  Activity,
  Bot,
  Cloud,
  CreditCard,
  FolderKanban,
  KeyRound,
  LayoutDashboard,
  Settings,
  Shield,
  UserRound,
} from "lucide-react";

/** Primary destinations in the authenticated sidebar and mobile drawer. */
export const PRIMARY_NAV = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard, tone: "default" as const, match: "exact" as const },
  { href: "/app/projects", label: "Projects", icon: FolderKanban, tone: "default" as const, match: "prefix" as const },
  { href: "/app/vault", label: "Vault", icon: KeyRound, tone: "protect" as const, match: "vault" as const },
  { href: "/app/vault/authenticator", label: "Authenticator", icon: Shield, tone: "protect" as const, match: "prefix" as const },
  { href: "/app/cloud", label: "Cloud", icon: Cloud, tone: "protect" as const, match: "prefix" as const },
  { href: "/app/agent", label: "Agent", icon: Bot, tone: "intel" as const, match: "prefix" as const },
  { href: "/app/activity", label: "Activity", icon: Activity, tone: "default" as const, match: "prefix" as const },
] as const;

/** Compact footer in the sidebar. Profile lives here; the avatar remains a menu. */
export const SIDEBAR_FOOTER = [
  { href: "/app/settings", label: "Settings", icon: Settings, match: "exact" as const },
  { href: "/app/settings/billing", label: "Billing", icon: CreditCard, match: "prefix" as const },
  { href: "/app/settings/security", label: "Account", icon: UserRound, match: "prefix" as const },
] as const;

/** Contextual links when a project is selected. */
export const PROJECT_NAV = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "vault", label: "Vault", icon: KeyRound },
  { key: "authenticator", label: "Authenticator", icon: Shield },
  { key: "cloud", label: "Cloud", icon: Cloud },
  { key: "agent", label: "Agent", icon: Bot },
  { key: "activity", label: "Activity", icon: Activity },
] as const;

/**
 * Account menu items (avatar dropdown). Sign Out is rendered separately because
 * it posts a server action rather than navigating.
 */
export const ACCOUNT_MENU = [
  { href: "/app/settings", label: "Settings", icon: Settings },
  { href: "/app/settings/billing", label: "Billing", icon: CreditCard },
  { href: "/app/settings/security", label: "Account", icon: UserRound },
] as const;

/** Global destinations kept when a project is selected — avoids duplicating Authenticator/Activity. */
export const PROJECT_GLOBAL_NAV = PRIMARY_NAV.filter((item) =>
  item.label === "Dashboard" ||
  item.label === "Projects" ||
  item.label === "Vault" ||
  item.label === "Cloud" ||
  item.label === "Agent",
);

export type PrimaryNavItem = (typeof PRIMARY_NAV)[number];
export type SidebarFooterItem = (typeof SIDEBAR_FOOTER)[number];
export type AccountMenuItem = (typeof ACCOUNT_MENU)[number];

/** Alias used by older shell code; prefer PRIMARY_NAV. */
export const PRODUCT_NAV = PRIMARY_NAV;
