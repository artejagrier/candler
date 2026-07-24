import { NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/env";
import { AUTH_ROUTES, safeNextPath } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth / PKCE callback. Exchanges the `?code` from an auth redirect for a
 * session cookie, then forwards to the (validated) `next` destination.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code && isSupabaseConfigured) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(
    `${origin}${AUTH_ROUTES.signIn}?error=auth_callback`,
  );
}
