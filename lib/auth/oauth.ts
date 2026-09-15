import { AUTH_ROUTES, DEFAULT_AUTHENTICATED_REDIRECT, safeNextPath } from "@/lib/auth/routes";
import {
  SITE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
  resolveAuthSiteUrl,
  supabaseAuthCallbackUrl,
} from "@/lib/env";

export const OAUTH_PROVIDERS = ["google", "github"] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

export type AuthErrorCode =
  | "auth_callback"
  | "verify"
  | "oauth"
  | "oauth_unavailable"
  | "oauth_google"
  | "oauth_github"
  | "oauth_canceled"
  | "oauth_conflict";

export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  auth_callback: "Candler couldn't complete sign-in. Please try again.",
  verify: "That verification link is invalid or has expired.",
  oauth: "Candler couldn't complete sign-in. Please try again.",
  oauth_unavailable:
    "Candler couldn't connect to that sign-in method right now. Please try again.",
  oauth_google: "Candler couldn't connect to Google right now. Please try again.",
  oauth_github: "Candler couldn't connect to GitHub right now. Please try again.",
  oauth_canceled: "Sign-in was canceled. No changes were made.",
  oauth_conflict: "We couldn't complete sign-in with that account.",
};

const PRODUCTION_HOSTS = new Set(["candler.dev", "www.candler.dev"]);

/** HttpOnly flag set only after the sign-up legal checkbox is accepted. */
export const OAUTH_LEGAL_COOKIE = "candler_oauth_legal_v1";

export const VERIFICATION_REQUESTED_MESSAGE =
  "Verification email requested. Check your inbox and spam folder.";

export function isOAuthProvider(value: string | null | undefined): value is OAuthProvider {
  return value === "google" || value === "github";
}

export function oauthStartPath(provider: OAuthProvider, next?: string): string {
  const params = new URLSearchParams({ provider });
  const target = safeNextPath(next);
  if (target !== DEFAULT_AUTHENTICATED_REDIRECT) {
    params.set("next", target);
  }
  return `/auth/oauth?${params.toString()}`;
}

export function oauthRedirectTo(next?: string, siteUrl: string = SITE_URL): string {
  const target = safeNextPath(next);
  return `${siteUrl}/auth/callback?next=${encodeURIComponent(target)}`;
}

export function emailConfirmRedirectTo(
  next: string = DEFAULT_AUTHENTICATED_REDIRECT,
  siteUrl: string = SITE_URL,
): string {
  return `${siteUrl}/auth/confirm?next=${encodeURIComponent(safeNextPath(next))}`;
}

export function supabaseProviderCallbackUrl(supabaseUrl?: string): string {
  return supabaseAuthCallbackUrl(supabaseUrl);
}

export function publicOriginFromRequest(
  request: Request,
  siteUrl: string = SITE_URL,
  vercelEnv: string | undefined = process.env.VERCEL_ENV,
): string {
  const url = new URL(request.url);
  const hostHeader = request.headers.get("x-forwarded-host") ?? url.host;
  const host = (hostHeader.split(",")[0]?.trim() || url.host).toLowerCase();
  const protoHeader = request.headers.get("x-forwarded-proto");
  const proto = protoHeader?.split(",")[0]?.trim() || url.protocol.replace(":", "") || "http";

  if (vercelEnv === "production") {
    if (PRODUCTION_HOSTS.has(host)) return `https://${host}`;
    return resolveAuthSiteUrl({ siteUrl, vercelEnv });
  }

  return `${proto}://${host}`;
}

/** Public Auth settings only — never logs the payload. */
export async function isExternalProviderEnabled(
  provider: OAuthProvider,
): Promise<boolean | null> {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return null;
  try {
    const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/auth/v1/settings`, {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { external?: Record<string, boolean> };
    return data.external?.[provider] === true;
  } catch {
    return null;
  }
}

export function oauthErrorCode(
  message: string | undefined,
  provider?: OAuthProvider,
): AuthErrorCode {
  const text = message ?? "";
  if (/access_denied|user.?cancel|denied access/i.test(text)) return "oauth_canceled";
  if (
    /identity|already registered|manual linking|multiple.?identit|email.*exists/i.test(
      text,
    )
  ) {
    return "oauth_conflict";
  }
  if (/unsupported provider|provider is not enabled/i.test(text)) {
    if (provider === "google") return "oauth_google";
    if (provider === "github") return "oauth_github";
    return "oauth_unavailable";
  }
  if (/redirect_uri|redirect uri|invalid request/i.test(text)) {
    if (provider === "google") return "oauth_google";
    if (provider === "github") return "oauth_github";
  }
  return "oauth";
}

export function mapOAuthCallbackParams(
  params: URLSearchParams,
): AuthErrorCode | null {
  const error = params.get("error") || params.get("error_code");
  if (!error) return null;
  return oauthErrorCode(error);
}

export function mapAuthProviderError(message: string | undefined): string | null {
  const text = message ?? "";
  if (!text) return null;
  if (/unsupported provider|provider is not enabled|access_denied|identity|already registered/i.test(text)) {
    return AUTH_ERROR_MESSAGES[oauthErrorCode(text)];
  }
  if (/redirect_uri|redirect uri|invalid request/i.test(text) && /oauth|provider/i.test(text)) {
    return AUTH_ERROR_MESSAGES.oauth;
  }
  return null;
}

export function publicAuthError(
  error: { message?: string; code?: string; status?: number } | null | undefined,
  fallback: string,
): string {
  const message = error?.message ?? "";
  const code = error?.code ?? "";
  const mapped = mapAuthProviderError(message);
  if (mapped) return mapped;
  if (
    error?.status === 429 ||
    /rate.?limit|over_email_send_rate_limit|too many/i.test(`${message} ${code}`)
  ) {
    return "Too many emails were requested. Wait a minute and try again.";
  }
  if (/error sending|smtp|unable to send|confirmation email/i.test(message)) {
    return "We couldn't send the email. Try again in a few minutes.";
  }
  return fallback;
}

export function oauthFailurePath(
  error?: { message?: string } | null,
  provider?: OAuthProvider,
): string {
  const code = oauthErrorCode(error?.message, provider);
  return `${AUTH_ROUTES.signIn}?error=${code}`;
}
