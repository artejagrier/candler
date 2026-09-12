import {
  Activity,
  Bot,
  Cloud,
  CreditCard,
  FolderKanban,
  Home,
  KeyRound,
  Settings,
  ShieldCheck,
} from "lucide-react";

/**
 * Primary product destinations, shown in the global navbar and the mobile
 * bottom nav. Everything in Candler revolves around these five — the project is
 * the connective tissue between Vault, Cloud, and Agent.
 */
export const PRODUCT_NAV = [
  { href: "/app", label: "Home", icon: Home },
  { href: "/app/projects", label: "Projects", icon: FolderKanban },
  { href: "/app/vault", label: "Vault", icon: KeyRound },
  { href: "/app/cloud", label: "Cloud", icon: Cloud },
  { href: "/app/agent", label: "Agent", icon: Bot },
] as const;

/**
 * Account menu items (in the navbar avatar dropdown). Sign Out is rendered
 * separately because it posts a server action rather than navigating.
 */
export const ACCOUNT_MENU = [
  { href: "/app/settings", label: "Settings", icon: Settings },
  { href: "/app/settings/billing", label: "Billing", icon: CreditCard },
  { href: "/app/settings/security", label: "Security", icon: ShieldCheck },
  { href: "/app/activity", label: "Activity", icon: Activity },
] as const;

export type ProductNavItem = (typeof PRODUCT_NAV)[number];
export type AccountMenuItem = (typeof ACCOUNT_MENU)[number];
