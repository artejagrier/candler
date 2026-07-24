/**
 * Example projects used across the interface prototype.
 *
 * ⚠️ Prototype mock data only — not real secrets or credentials. Centralized
 * here so screens don't duplicate it. Richer project/vault models arrive in
 * later phases (1C/1D).
 */

export type ProjectStatus = "healthy" | "attention" | "offline";

export interface MockProject {
  id: string;
  name: string;
  framework: string;
  status: ProjectStatus;
  /** Connected service ids (see integrations). */
  services: string[];
}

export const MOCK_PROJECTS: MockProject[] = [
  {
    id: "candler",
    name: "Candler",
    framework: "Next.js",
    status: "healthy",
    services: ["github", "vercel", "supabase", "stripe", "cloudflare"],
  },
  {
    id: "kenyakeys",
    name: "KenyaKeys",
    framework: "Next.js",
    status: "attention",
    services: ["github", "vercel", "supabase", "openai"],
  },
  {
    id: "dianilinks",
    name: "DianiLinks",
    framework: "Astro",
    status: "healthy",
    services: ["github", "cloudflare", "resend"],
  },
  {
    id: "sentinel",
    name: "Sentinel",
    framework: "Node",
    status: "attention",
    services: ["github", "railway", "neon"],
  },
  {
    id: "movetokenya",
    name: "MoveToKenya",
    framework: "Next.js",
    status: "healthy",
    services: ["github", "vercel", "supabase", "stripe"],
  },
];
