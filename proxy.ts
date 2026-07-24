import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
} from "@/lib/env";
import {
  AUTH_ROUTES,
  DEFAULT_AUTHENTICATED_REDIRECT,
  SIGN_IN_PATH,
  isMfaPath,
  isProtectedPath,
  isRedirectIfAuthenticatedPath,
} from "@/lib/auth/routes";

/**
 * Next.js 16 renamed `middleware` → `proxy` (see the framework docs and
 * AGENTS.md). This runs on the Node.js runtime before every matched request.
 *
 * Responsibilities:
 *   1. Refresh the Supabase session cookie (the sole authoritative refresh
 *      point — Server Components can't write cookies).
 *   2. Gate protected workspace routes behind an authenticated session.
 *   3. Enforce MFA step-up: a user with an enrolled factor but an `aal1`
 *      session is sent to the challenge screen before reaching the workspace.
 *   4. Bounce already-signed-in users away from sign-in / sign-up.
 *
 * With no Supabase credentials the app runs in preview mode: this passes every
 * request straight through so the marketing site and smoke tests still work.
 * Route handlers and Server Actions re-check auth themselves — the proxy is a
 * fast gate, never the only one.
 */
export async function proxy(request: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.next();

  // `response` is reassigned by setAll so refreshed cookies ride along.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Do not insert logic between client creation and getUser(): this call is
  // what refreshes an expiring session token.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Unauthenticated → protected area: send to sign-in, remembering the target.
  if (!user && isProtectedPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = SIGN_IN_PATH;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user) {
    // Fully signed-in users don't need sign-in / sign-up.
    if (isRedirectIfAuthenticatedPath(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = DEFAULT_AUTHENTICATED_REDIRECT;
      url.search = "";
      return NextResponse.redirect(url);
    }

    // MFA step-up: enrolled factor but session is still aal1 → force challenge.
    if (isProtectedPath(pathname) && !isMfaPath(pathname)) {
      try {
        const { data: aal } =
          await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal?.currentLevel === "aal1" && aal?.nextLevel === "aal2") {
          const url = request.nextUrl.clone();
          url.pathname = AUTH_ROUTES.mfa;
          url.searchParams.set("next", pathname);
          return NextResponse.redirect(url);
        }
      } catch {
        // If the AAL lookup fails, fall through — the workspace pages
        // re-verify server-side rather than hard-failing navigation.
      }
    }
  }

  return response;
}

export const config = {
  /**
   * Run on everything except Next internals, metadata files, and static image
   * assets. Excluding these keeps the proxy off CSS/JS/image requests.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon|opengraph-image|twitter-image|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
