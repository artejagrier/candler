import { SITE_URL } from "@/lib/env";

/** Static product metadata shared across the app. */
export const SITE = {
  name: "Candler",
  domain: "candler.dev",
  /** Absolute deployment URL (from NEXT_PUBLIC_SITE_URL); used for metadata. */
  url: SITE_URL,
  tagline: "The home for every software project.",
  description:
    "Candler brings your projects, secrets, environments, deployments, domains, documentation, and developer tools into one secure workspace.",
  /** One-line pitch used in marketing copy and social cards. */
  pitch:
    "The secure developer workspace that connects GitHub, Vercel, Supabase, Stripe, and Cloudflare beneath every project — without replacing them.",
  social: {
    x: "https://x.com/candlerdev",
    github: "https://github.com/candlerdev",
  },
} as const;
