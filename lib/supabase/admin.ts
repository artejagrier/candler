import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_URL, getSupabaseSecretKey } from "@/lib/env";

/**
 * Privileged, server-only Supabase client backed by the secret key. Bypasses
 * Row Level Security, so it must never be imported into client code and should
 * only be used behind an authenticated + authorized server boundary (e.g.
 * sending team invitations via the Admin API).
 */
export function createAdminClient() {
  const secret = getSupabaseSecretKey();
  if (!SUPABASE_URL || !secret) {
    throw new Error(
      "Admin operations require NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.",
    );
  }

  return createSupabaseClient(SUPABASE_URL, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
