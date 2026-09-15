import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/env";
import {
  OAUTH_LEGAL_COOKIE,
  mapOAuthCallbackParams,
  oauthErrorCode,
  publicOriginFromRequest,
  type AuthErrorCode,
} from "@/lib/auth/oauth";
import { AUTH_ROUTES, safeNextPath } from "@/lib/auth/routes";
import { recordLegalConsent } from "@/lib/legal/consent";
import { createClient } from "@/lib/supabase/server";

function fail(origin: string, code: AuthErrorCode) {
  const response = NextResponse.redirect(
    `${origin}${AUTH_ROUTES.signIn}?error=${code}`,
  );
  response.cookies.delete(OAUTH_LEGAL_COOKIE);
  return response;
}

async function succeed(origin: string, next: string, userId?: string) {
  const jar = await cookies();
  const acceptedOnSignup = jar.get(OAUTH_LEGAL_COOKIE)?.value === "1";
  if (acceptedOnSignup && userId) {
    await recordLegalConsent({ userId, source: "signup" });
  }
  const response = NextResponse.redirect(`${origin}${next}`);
  response.cookies.delete(OAUTH_LEGAL_COOKIE);
  return response;
}

/**
 * OAuth / PKCE callback. Exchanges the `?code` from an auth redirect for a
 * session cookie, then forwards to the (validated) `next` destination.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = publicOriginFromRequest(request);
  const next = safeNextPath(searchParams.get("next"));
  const oauthError = mapOAuthCallbackParams(searchParams);
  if (oauthError) return fail(origin, oauthError);

  const code = searchParams.get("code");

  if (code && isSupabaseConfigured) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return succeed(origin, next, user?.id);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) return succeed(origin, next, user.id);
    return fail(origin, oauthErrorCode(error.message));
  }

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) return succeed(origin, next, user.id);
  }

  return fail(origin, "auth_callback");
}
