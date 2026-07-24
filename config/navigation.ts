import {
  Activity,
  Blocks,
  Home,
  KeyRound,
  Settings,
  Shield,
  Users,
  FolderGit2,
} from "lucide-react";

import type { NavItem } from "@/types/navigation";

/**
 * Primary workspace navigation. Rendered in the floating dock and mirrored in
 * the command palette. Order here is the order shown in the dock.
 */
export const PRIMARY_NAV: NavItem[] = [
  {
    id: "home",
    label: "Home",
    href: "/dashboard",
    icon: Home,
    description: "Your personalized workspace overview",
  },
  {
    id: "projects",
    label: "Projects",
    href: "/projects",
    icon: FolderGit2,
    description: "Every software project you build and maintain",
  },
  {
    id: "vault",
    label: "Vault",
    href: "/vault",
    icon: KeyRound,
    description: "Secrets, keys, and credentials — encrypted",
  },
  {
    id: "integrations",
    label: "Integrations",
    href: "/integrations",
    icon: Blocks,
    description: "Connected services across your stack",
  },
  {
    id: "activity",
    label: "Activity",
    href: "/activity",
    icon: Activity,
    description: "A timeline of everything that changed",
  },
  {
    id: "team",
    label: "Team",
    href: "/team",
    icon: Users,
    description: "Members, roles, and workspace access",
  },
  {
    id: "security",
    label: "Security",
    href: "/security",
    icon: Shield,
    description: "Security health, sessions, and audit trails",
  },
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Workspace, appearance, and timezone",
  },
];
