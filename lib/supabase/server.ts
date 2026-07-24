import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/env";

/**
 * Supabase client for Server Components, Server Actions, and Route Handlers.
 *
 * Next.js 16 makes `cookies()` async, so this factory is async too. Session
 * refresh writes happen through the cookie store; when called from a Server
 * Component (where cookies are read-only) the write throws and is swallowed —
 * `proxy.ts` performs the authoritative refresh on every request instead.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component — cookie writes are read-only here.
          // Safe to ignore; the proxy refreshes the session cookie.
        }
      },
    },
  });
}
