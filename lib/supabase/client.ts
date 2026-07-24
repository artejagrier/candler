import { createBrowserClient } from "@supabase/ssr";

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/env";

/**
 * Supabase client for Client Components / browser code. Reads and writes the
 * session from cookies via `@supabase/ssr` so it stays in sync with the server.
 * Create one per use — the underlying instance is cheap and cookie-backed.
 */
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
}
