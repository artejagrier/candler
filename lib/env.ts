/**
 * Centralised environment access.
 *
 * Public values are read through *literal* `process.env.NEXT_PUBLIC_*`
 * references so Next.js can inline them into the client bundle at build time.
 * The secret key is only ever read on the server (see `getSupabaseSecretKey`),
 * so it can never leak into client JavaScript.
 *
 * Nothing here throws at import time: with no credentials the app runs in an
 * unauthenticated "preview" mode (the marketing site renders, auth forms show a
 * configuration notice), which keeps `next build` and route smoke-tests green
 * before a Supabase project is wired up.
 */

/** Supabase project URL — safe on the client. */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

/**
 * Publishable (a.k.a. anon) key — safe on the client. Prefers the current
 * `publishable` key naming and falls back to the legacy `anon` key so either
 * works during Supabase's key migration.
 */
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

/** Absolute site URL, used for auth redirects, email links, and metadata. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

/**
 * Whether the public Supabase config is present. Safe to evaluate on the client
 * and the server; gates every real auth call so the UI degrades gracefully when
 * unconfigured instead of crashing.
 */
export const isSupabaseConfigured =
  SUPABASE_URL.length > 0 && SUPABASE_PUBLISHABLE_KEY.length > 0;

/**
 * Server-only secret key (replaces the legacy service-role key). Never prefixed
 * `NEXT_PUBLIC_`, so it is never inlined into a client bundle. The runtime guard
 * is defense-in-depth against accidental client import.
 */
export function getSupabaseSecretKey(): string {
  if (typeof window !== "undefined") {
    throw new Error(
      "SUPABASE_SECRET_KEY must never be accessed in the browser.",
    );
  }
  return (
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    ""
  );
}

/** Whether server-side admin operations (invites, etc.) can run. */
export function isSupabaseAdminConfigured(): boolean {
  return SUPABASE_URL.length > 0 && getSupabaseSecretKey().length > 0;
}
