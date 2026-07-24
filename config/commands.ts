import { Blocks, FolderGit2, Globe, KeyRound } from "lucide-react";

import { MOCK_PROJECTS } from "@/lib/mock/projects";
import type { CommandGroup } from "@/types/navigation";
import { PRIMARY_NAV } from "@/config/navigation";

/**
 * Command palette content. In Phase 1 this is assembled from static nav + mock
 * data; the architecture (grouped, keyword-searchable items) is intentionally
 * shaped so a real indexed search can populate the same structure later.
 */
export function getCommandGroups(): CommandGroup[] {
  return [
    {
      id: "navigation",
      heading: "Go to",
      items: PRIMARY_NAV.map((item) => ({
        id: `nav-${item.id}`,
        label: item.label,
        hint: item.description,
        icon: item.icon,
        href: item.href,
        keywords: [item.id],
      })),
    },
    {
      id: "projects",
      heading: "Projects",
      items: MOCK_PROJECTS.map((project) => ({
        id: `project-${project.id}`,
        label: project.name,
        hint: `${project.framework} · ${project.services.length} services`,
        icon: FolderGit2,
        href: `/projects/${project.id}`,
        keywords: ["project", project.framework.toLowerCase(), ...project.services],
      })),
    },
    {
      id: "quick",
      heading: "Quick actions",
      items: [
        {
          id: "quick-vault",
          label: "Open Vault",
          hint: "Secrets, keys, and credentials",
          icon: KeyRound,
          href: "/vault",
          keywords: ["secret", "key", "credential", "env"],
        },
        {
          id: "quick-integrations",
          label: "Manage integrations",
          hint: "GitHub, Vercel, Supabase, Stripe, Cloudflare",
          icon: Blocks,
          href: "/integrations",
          keywords: ["connect", "service", "provider"],
        },
        {
          id: "quick-domains",
          label: "Find a domain",
          hint: "DNS, SSL, and expiration",
          icon: Globe,
          href: "/projects",
          keywords: ["domain", "dns", "ssl", "cloudflare"],
        },
      ],
    },
  ];
}
