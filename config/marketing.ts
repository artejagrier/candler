import {
  Blocks,
  BookOpen,
  Command,
  GitBranch,
  Globe,
  KeyRound,
  LayoutDashboard,
  ShieldCheck,
  Terminal,
  Workflow,
  type LucideIcon,
} from "lucide-react";

/** Top-level marketing navigation. Integrations is an on-page section. */
export const MARKETING_NAV: { label: string; href: string }[] = [
  { label: "Features", href: "/features" },
  { label: "Integrations", href: "/#integrations" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
  { label: "FAQ", href: "/faq" },
];

export interface Feature {
  title: string;
  description: string;
  icon: LucideIcon;
}

export const FEATURES: Feature[] = [
  {
    title: "Every project, one home",
    description:
      "Group repos, environments, domains, docs, and commands under each project — not scattered across a dozen dashboards.",
    icon: LayoutDashboard,
  },
  {
    title: "A vault for secrets",
    description:
      "Organize API keys, tokens, and env vars per project and environment, with a clear record of what's used where.",
    icon: KeyRound,
  },
  {
    title: "Bridges your stack",
    description:
      "Connect GitHub, Vercel, Supabase, Stripe, and Cloudflare so their status lives beside the project they power.",
    icon: Blocks,
  },
  {
    title: "Command palette navigation",
    description:
      "Jump anywhere with ⌘K. A floating dock and keyboard-first flow keep you moving without a heavy sidebar.",
    icon: Command,
  },
  {
    title: "Domains & deployments",
    description:
      "See DNS, SSL, and deployment state at a glance, tied to the project and environment they belong to.",
    icon: Globe,
  },
  {
    title: "Docs & runbooks",
    description:
      "Keep setup steps, runbooks, and the commands you always forget right next to the project that needs them.",
    icon: BookOpen,
  },
];

export interface Integration {
  name: string;
  blurb: string;
  /** Monogram shown in the logo tile. */
  initial: string;
  /** Accent color for the tile (CSS color). */
  accent: string;
}

export const INTEGRATIONS: Integration[] = [
  {
    name: "GitHub",
    blurb: "Repositories, branches, and pull requests.",
    initial: "GH",
    accent: "#e8e7ee",
  },
  {
    name: "Vercel",
    blurb: "Deployments, previews, and build status.",
    initial: "▲",
    accent: "#ffffff",
  },
  {
    name: "Supabase",
    blurb: "Postgres, auth, and storage.",
    initial: "SB",
    accent: "#34d399",
  },
  {
    name: "Stripe",
    blurb: "Billing, subscriptions, and payouts.",
    initial: "S",
    accent: "#a855f7",
  },
  {
    name: "Cloudflare",
    blurb: "DNS, SSL, and edge caching.",
    initial: "CF",
    accent: "#fbbf24",
  },
  {
    name: "Linear",
    blurb: "Issues and cycles tied to each project.",
    initial: "L",
    accent: "#d8b4fe",
  },
];

export interface PricingTier {
  name: string;
  price: string;
  cadence?: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
  highlighted?: boolean;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    name: "Solo",
    price: "$0",
    cadence: "/ forever",
    description: "For individual developers organizing their own projects.",
    features: [
      "Up to 5 projects",
      "Connect 3 integrations",
      "Project vault & environments",
      "Command palette + dynamic sky",
    ],
    cta: "Start for free",
    href: "/sign-up",
  },
  {
    name: "Team",
    price: "$18",
    cadence: "/ user / month",
    description: "For teams that ship together and share a stack.",
    features: [
      "Unlimited projects",
      "Unlimited integrations",
      "Roles, invitations & audit trail",
      "MFA + recovery codes enforced",
      "Priority support",
    ],
    cta: "Start a team",
    href: "/sign-up",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For organizations with security and compliance needs.",
    features: [
      "Everything in Team",
      "SSO / SAML",
      "Custom data residency",
      "Dedicated support & SLAs",
    ],
    cta: "Contact sales",
    href: "/contact",
  },
];

export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ: FaqItem[] = [
  {
    question: "Does Candler replace GitHub, Vercel, or Supabase?",
    answer:
      "No — Candler bridges them. Your code stays on GitHub, your deploys on Vercel, your database on Supabase. Candler organizes everything around each project and links out to the tools you already use.",
  },
  {
    question: "How does Candler handle my secrets?",
    answer:
      "Candler is built for honest security. Authentication runs on Supabase Auth with session cookies, MFA, and recovery codes. We never fake encryption — this build is transparent about what is real infrastructure and what is still being wired up.",
  },
  {
    question: "What authentication does Candler use?",
    answer:
      "Email + password today, with email verification, password reset, TOTP-based two-factor authentication, recovery codes, and team invitations — all backed by Supabase Auth and protected server-side.",
  },
  {
    question: "Is there a free plan?",
    answer:
      "Yes. The Solo plan is free forever for individual developers, including the project vault, environments, and the command palette.",
  },
  {
    question: "What is the dynamic sky?",
    answer:
      "Candler's background shifts with your local time of day — morning, afternoon, evening, and night — so your workspace feels alive without getting in the way of the work.",
  },
];

export interface Stat {
  value: string;
  label: string;
}

export const STATS: Stat[] = [
  { value: "1", label: "home for every project" },
  { value: "5+", label: "services bridged" },
  { value: "⌘K", label: "to go anywhere" },
  { value: "0", label: "fake encryption" },
];

export interface HowStep {
  title: string;
  description: string;
  icon: LucideIcon;
}

export const HOW_IT_WORKS: HowStep[] = [
  {
    title: "Create a project",
    description: "Add a project and describe its stack in seconds.",
    icon: GitBranch,
  },
  {
    title: "Connect your services",
    description: "Link GitHub, Vercel, Supabase, Stripe, and more.",
    icon: Workflow,
  },
  {
    title: "Work from one place",
    description: "Secrets, domains, docs, and commands — all in reach.",
    icon: Terminal,
  },
  {
    title: "Stay secure",
    description: "MFA, recovery codes, and an audit trail by default.",
    icon: ShieldCheck,
  },
];
