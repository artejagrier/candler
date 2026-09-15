/**
 * Central route map for authentication and access control. Imported by the
 * proxy (edge of every request), server actions, and UI links so the paths stay
 * in one place.
 */

export const AUTH_ROUTES = {
  signIn: "/sign-in",
  signUp: "/sign-up",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  verifyEmail: "/verify-email",
  mfa: "/mfa",
  recoveryCode: "/recovery-code",
  invitation: "/invitation",
} as const;

/** Where to send a user after a successful, fully-assured sign-in. */
export const DEFAULT_AUTHENTICATED_REDIRECT = "/app";
export const SIGN_IN_PATH = AUTH_ROUTES.signIn;

/** Workspace areas that require an authenticated session. */
const PROTECTED_PREFIXES = [
  "/app",
  "/dashboard",
  "/projects",
  "/vault",
  "/integrations",
  "/activity",
  "/team",
  "/settings",
] as const;

/**
 * Auth pages a *fully* signed-in user should be bounced away from. Deliberately
 * excludes reset-password, mfa, recovery-code, and invitation — those are
 * reachable while holding a session (e.g. from an email link or a step-up
 * challenge) and must not redirect.
 */
const REDIRECT_IF_AUTHENTICATED = [
  AUTH_ROUTES.signIn,
  AUTH_ROUTES.signUp,
  "/login",
  "/signup",
] as const;

function matches(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((base) => matches(pathname, base));
}

export function isRedirectIfAuthenticatedPath(pathname: string): boolean {
  return REDIRECT_IF_AUTHENTICATED.some((base) => matches(pathname, base));
}

export function isMfaPath(pathname: string): boolean {
  return matches(pathname, AUTH_ROUTES.mfa);
}

/**
 * Guard against open-redirects: only allow same-origin, absolute-path targets
 * for the post-login `?next=` parameter.
 */
export function safeNextPath(
  next: string | null | undefined,
  fallback: string = DEFAULT_AUTHENTICATED_REDIRECT,
): string {
  if (!next) return fallback;
  // Must be a root-relative path and not a protocol-relative "//host" URL.
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  if (next.includes("\\") || next.includes("://") || /[\0\r\n]/.test(next)) {
    return fallback;
  }
  try {
    const decoded = decodeURIComponent(next);
    if (decoded.startsWith("//") || decoded.includes("://") || decoded.includes("\\")) {
      return fallback;
    }
  } catch {
    return fallback;
  }
  return next;
}
