import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { resolveAuthSiteUrl, supabaseAuthCallbackUrl } from "../lib/env";
import {
  AUTH_ERROR_MESSAGES,
  VERIFICATION_REQUESTED_MESSAGE,
  emailConfirmRedirectTo,
  isOAuthProvider,
  mapAuthProviderError,
  mapOAuthCallbackParams,
  oauthFailurePath,
  oauthRedirectTo,
  oauthStartPath,
  publicAuthError,
  publicOriginFromRequest,
} from "../lib/auth/oauth";
import { isProtectedPath, safeNextPath } from "../lib/auth/routes";
import { LEGAL_ACCEPTANCE_MESSAGE } from "../lib/legal/versions";

const oauthRoute = readFileSync(new URL("../app/auth/oauth/route.ts", import.meta.url), "utf8");
const callbackRoute = readFileSync(new URL("../app/auth/callback/route.ts", import.meta.url), "utf8");
const confirmRoute = readFileSync(new URL("../app/auth/confirm/route.ts", import.meta.url), "utf8");
const actions = readFileSync(new URL("../lib/auth/actions.ts", import.meta.url), "utf8");
const signupForm = readFileSync(new URL("../components/auth/SignUpForm.tsx", import.meta.url), "utf8");
const signinForm = readFileSync(new URL("../components/auth/SignInForm.tsx", import.meta.url), "utf8");
const oauthButtons = readFileSync(new URL("../components/auth/OAuthButtons.tsx", import.meta.url), "utf8");
const verifyPanel = readFileSync(new URL("../components/auth/VerifyEmailPanel.tsx", import.meta.url), "utf8");
const verifyPage = readFileSync(new URL("../app/(auth)/verify-email/page.tsx", import.meta.url), "utf8");
const signinPage = readFileSync(new URL("../app/(auth)/sign-in/page.tsx", import.meta.url), "utf8");
const proxy = readFileSync(new URL("../proxy.ts", import.meta.url), "utf8");

test("OAuth provider names are google and github", () => {
  assert.equal(isOAuthProvider("google"), true);
  assert.equal(isOAuthProvider("github"), true);
  assert.equal(isOAuthProvider("facebook"), false);
  assert.equal(oauthRoute.includes('provider,'), true);
  assert.equal(oauthRoute.includes("signInWithOAuth"), true);
  assert.equal(oauthRoute.includes('provider,'), true);
  assert.equal(oauthRoute.includes("isExternalProviderEnabled"), true);
  assert.equal(oauthStartPath("google"), "/auth/oauth?provider=google");
  assert.equal(oauthStartPath("github"), "/auth/oauth?provider=github");
});

test("production redirect targets stay on candler.dev auth routes", () => {
  assert.equal(
    resolveAuthSiteUrl({ siteUrl: "http://localhost:3000", vercelEnv: "production" }),
    "https://candler.dev",
  );
  assert.equal(
    resolveAuthSiteUrl({ siteUrl: "https://candler.dev", vercelEnv: "production" }),
    "https://candler.dev",
  );
  assert.equal(
    resolveAuthSiteUrl({ siteUrl: "https://www.candler.dev", vercelEnv: "production" }),
    "https://candler.dev",
  );
  assert.equal(
    resolveAuthSiteUrl({ siteUrl: "http://localhost:3002" }),
    "http://localhost:3002",
  );
  assert.equal(
    oauthRedirectTo("/app", "https://candler.dev"),
    "https://candler.dev/auth/callback",
  );
  assert.equal(
    oauthRedirectTo("/app/vault", "https://candler.dev"),
    "https://candler.dev/auth/callback?next=%2Fapp%2Fvault",
  );
  assert.equal(
    emailConfirmRedirectTo("/app", "https://candler.dev"),
    "https://candler.dev/auth/confirm?next=%2Fapp",
  );
  assert.equal(
    emailConfirmRedirectTo("/reset-password", "https://candler.dev"),
    "https://candler.dev/auth/confirm?next=%2Freset-password",
  );
  assert.equal(
    supabaseAuthCallbackUrl("https://wtwisdufmjjqlnbdtseq.supabase.co"),
    "https://wtwisdufmjjqlnbdtseq.supabase.co/auth/v1/callback",
  );
});

test("social signup cannot bypass legal consent", () => {
  assert.equal(signupForm.includes("SignUpOAuthButtons"), true);
  assert.equal(oauthButtons.includes("legalAccepted"), true);
  assert.equal(oauthButtons.includes("startSocialSignupAction"), true);
  assert.equal(actions.includes("startSocialSignupAction"), true);
  assert.equal(actions.includes("LEGAL_ACCEPTANCE_MESSAGE"), true);
  assert.equal(actions.includes("OAUTH_LEGAL_COOKIE"), true);
  assert.equal(callbackRoute.includes("recordLegalConsent"), true);
  assert.equal(signinForm.includes("startSocialSignupAction"), false);
  assert.equal(LEGAL_ACCEPTANCE_MESSAGE.includes("Terms of Service"), true);
});

test("OAuth callback maps canceled and conflict errors without leaking details", () => {
  assert.equal(
    mapOAuthCallbackParams(new URLSearchParams("error=access_denied")),
    "oauth_canceled",
  );
  assert.equal(
    mapOAuthCallbackParams(new URLSearchParams("error=server_error")),
    "oauth",
  );
  assert.equal(callbackRoute.includes("error_description"), false);
  assert.equal(oauthButtons.includes("pendingProvider"), true);
  assert.equal(oauthButtons.includes("window.location.assign"), true);
});

test("callback rejects unsafe redirects", () => {
  assert.equal(safeNextPath("//evil.example"), "/app");
  assert.equal(safeNextPath("/\\evil.example"), "/app");
  assert.equal(safeNextPath("https://evil.example"), "/app");
  assert.equal(safeNextPath("/app/vault"), "/app/vault");
  assert.equal(callbackRoute.includes("safeNextPath"), true);
  assert.equal(confirmRoute.includes("safeNextPath"), true);
  assert.equal(oauthRoute.includes("/login?error=oauth"), false);
});

test("email confirmation callback verifies OTP then forwards", () => {
  assert.equal(confirmRoute.includes("verifyOtp"), true);
  assert.equal(confirmRoute.includes("token_hash"), true);
  assert.equal(actions.includes("emailConfirmRedirectTo"), true);
  assert.equal(actions.includes("emailRedirectTo: `${SITE_URL}"), false);
});

test("verification resend is honest and first-click locked", () => {
  assert.equal(actions.includes("resendVerificationAction"), true);
  assert.equal(actions.includes('"Verification email sent."'), false);
  assert.equal(actions.includes("VERIFICATION_REQUESTED_MESSAGE"), true);
  assert.equal(verifyPanel.includes("if (pending) return"), true);
  assert.equal(verifyPanel.includes("disabled={pending}"), true);
  assert.equal(verifyPage.includes(VERIFICATION_REQUESTED_MESSAGE), true);
});

test("errors do not falsely claim successful email send", () => {
  assert.equal(VERIFICATION_REQUESTED_MESSAGE.includes("requested"), true);
  assert.equal(actions.includes("identities.length === 0"), true);
  assert.equal(actions.includes("publicAuthError"), true);
  assert.equal(
    publicAuthError({ message: "over_email_send_rate_limit" }, "fallback").includes("Wait a minute"),
    true,
  );
  assert.equal(
    mapAuthProviderError("Unsupported provider: provider is not enabled")?.includes("couldn't connect"),
    true,
  );
  assert.equal(oauthFailurePath({ message: "Unsupported provider: provider is not enabled" }, "google").includes("oauth_google"), true);
  assert.equal(oauthFailurePath({ message: "access_denied" }).includes("oauth_canceled"), true);
  assert.equal(signinPage.includes("AUTH_ERROR_MESSAGES"), true);
  assert.equal(AUTH_ERROR_MESSAGES.oauth_canceled.includes("canceled"), true);
  assert.equal(callbackRoute.includes("mapOAuthCallbackParams"), true);
});

test("auth tokens are not logged", () => {
  for (const source of [oauthRoute, callbackRoute, confirmRoute, actions, proxy]) {
    assert.equal(/console\.(log|info|debug)\(/.test(source), false);
    assert.equal(source.includes("access_token"), false);
    assert.equal(source.includes("refresh_token"), false);
  }
});

test("unauthenticated /app is denied", () => {
  assert.equal(isProtectedPath("/app"), true);
  assert.equal(isProtectedPath("/app/vault"), true);
  assert.equal(proxy.includes("isProtectedPath"), true);
  assert.equal(proxy.includes("SIGN_IN_PATH"), true);
});

test("production origin never falls back to localhost", () => {
  const forbidden = ["localhost:3000", "localhost:3001", "localhost:3002"];
  const request = new Request("http://localhost:3000/auth/callback", {
    headers: { "x-forwarded-host": "localhost:3000", "x-forwarded-proto": "http" },
  });
  assert.equal(
    publicOriginFromRequest(request, "http://localhost:3000", "production"),
    "https://candler.dev",
  );
  const live = new Request("https://candler.dev/auth/callback", {
    headers: { "x-forwarded-host": "candler.dev", "x-forwarded-proto": "https" },
  });
  assert.equal(
    publicOriginFromRequest(live, "https://candler.dev", "production"),
    "https://candler.dev",
  );
  const www = new Request("https://www.candler.dev/auth/oauth", {
    headers: { "x-forwarded-host": "www.candler.dev", "x-forwarded-proto": "https" },
  });
  assert.equal(
    publicOriginFromRequest(www, "https://candler.dev", "production"),
    "https://candler.dev",
  );
  const vercelHost = new Request("https://candler-xyz.vercel.app/auth/callback", {
    headers: { "x-forwarded-host": "candler-xyz.vercel.app", "x-forwarded-proto": "https" },
  });
  assert.equal(
    publicOriginFromRequest(vercelHost, "https://candler.dev", "production"),
    "https://candler.dev",
  );
  for (const port of forbidden) {
    const origin = publicOriginFromRequest(request, `http://${port}`, "production");
    const redirect = oauthRedirectTo("/app", `http://${port}`, "production");
    assert.equal(origin.includes("localhost"), false, origin);
    assert.equal(redirect.includes("localhost"), false, redirect);
    assert.equal(redirect.startsWith("https://candler.dev/auth/callback"), true);
  }
  const localDev = new Request("http://localhost:3002/auth/oauth", {
    headers: { "x-forwarded-host": "localhost:3002", "x-forwarded-proto": "http" },
  });
  assert.equal(
    publicOriginFromRequest(localDev, "http://localhost:3002"),
    "http://localhost:3002",
  );
  assert.equal(
    oauthRedirectTo("/app", "http://localhost:3002"),
    "http://localhost:3002/auth/callback",
  );
});
