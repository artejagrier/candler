import { NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/env";
import {
  isExternalProviderEnabled,
  isOAuthProvider,
  oauthFailurePath,
  oauthRedirectTo,
  publicOriginFromRequest,
} from "@/lib/auth/oauth";
import { createClient } from "@/lib/supabase/server";

/**
 * Starts Google or GitHub OAuth through Supabase. The provider callback is
 * `/auth/callback` on this origin; Google/GitHub themselves must redirect to
 * the Supabase project callback, not this route.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const provider = url.searchParams.get("provider");
  const origin = publicOriginFromRequest(request);

  if (!isSupabaseConfigured || !isOAuthProvider(provider)) {
    return NextResponse.redirect(new URL(oauthFailurePath(), origin));
  }

  const enabled = await isExternalProviderEnabled(provider);
  if (enabled === false) {
    return NextResponse.redirect(
      new URL(oauthFailurePath({ message: "Unsupported provider: provider is not enabled" }, provider), origin),
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: oauthRedirectTo(
        url.searchParams.get("next") ?? undefined,
        origin,
        process.env.VERCEL_ENV,
      ),
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(new URL(oauthFailurePath(error, provider), origin));
  }

  return NextResponse.redirect(data.url);
}
