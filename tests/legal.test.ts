import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { signUpSchema } from "../lib/auth/schemas";
import { isProtectedPath } from "../lib/auth/routes";
import {
  CURRENT_AUP_VERSION,
  CURRENT_PRIVACY_VERSION,
  CURRENT_TERMS_VERSION,
  LEGAL_ACCEPTANCE_MESSAGE,
  authoritativeLegalVersions,
  consentSatisfiesCurrent,
} from "../lib/legal/versions";
import { AUP_DOCUMENT, PRIVACY_DOCUMENT, SECURITY_DOCUMENT, TERMS_DOCUMENT } from "../lib/legal/documents";

const validSignup = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  password: "Correct1Horse",
  confirmPassword: "Correct1Horse",
  legalAccepted: true,
};

const actions = readFileSync(new URL("../lib/auth/actions.ts", import.meta.url), "utf8");
const consent = readFileSync(new URL("../lib/legal/consent.ts", import.meta.url), "utf8");
const signupForm = readFileSync(new URL("../components/auth/SignUpForm.tsx", import.meta.url), "utf8");
const signupPage = readFileSync(new URL("../app/(auth)/sign-up/page.tsx", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/0010_legal_consents.sql", import.meta.url), "utf8");
const nextConfig = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
const footer = readFileSync(new URL("../components/marketing/MarketingFooter.tsx", import.meta.url), "utf8");
const settings = readFileSync(new URL("../app/(product)/app/settings/page.tsx", import.meta.url), "utf8");
const layout = readFileSync(new URL("../app/(product)/app/layout.tsx", import.meta.url), "utf8");
const rls = readFileSync(new URL("../scripts/rls-integration.ts", import.meta.url), "utf8");

test("signup without legal acceptance is denied", () => {
  const missing = signUpSchema.safeParse({ ...validSignup, legalAccepted: undefined });
  const unchecked = signUpSchema.safeParse({ ...validSignup, legalAccepted: false });
  assert.equal(missing.success, false);
  assert.equal(unchecked.success, false);
  assert.equal(unchecked.error?.issues[0]?.message, LEGAL_ACCEPTANCE_MESSAGE);
});

test("signup with legal acceptance is allowed by schema", () => {
  const parsed = signUpSchema.safeParse(validSignup);
  assert.equal(parsed.success, true);
});

test("authoritative versions come from the server catalog, not the client", () => {
  const versions = authoritativeLegalVersions({
    legalAccepted: true,
    termsVersion: "1999-01-01",
    privacyVersion: "1999-01-01",
    aupVersion: "1999-01-01",
  });
  assert.deepEqual(versions, {
    termsVersion: CURRENT_TERMS_VERSION,
    privacyVersion: CURRENT_PRIVACY_VERSION,
    aupVersion: CURRENT_AUP_VERSION,
  });
  assert.equal(actions.includes("recordLegalConsent"), true);
  assert.equal(actions.includes("parsed.data.termsVersion"), false);
  assert.equal(consent.includes("authoritativeLegalVersions"), true);
});

test("duplicate acceptance of the same versions is idempotent", () => {
  assert.equal(migration.includes("legal_consents_user_versions_uidx"), true);
  assert.equal(consent.includes("ignoreDuplicates: true"), true);
  assert.equal(consent.includes("onConflict: \"user_id,terms_version,privacy_version\""), true);
});

test("existing accounts without consent require re-consent; current versions unlock", () => {
  assert.equal(consentSatisfiesCurrent(null), false);
  assert.equal(
    consentSatisfiesCurrent({
      terms_version: "1999-01-01",
      privacy_version: CURRENT_PRIVACY_VERSION,
      aup_version: CURRENT_AUP_VERSION,
      accepted_at: "2020-01-01T00:00:00.000Z",
      consent_source: "signup",
    }),
    false,
  );
  assert.equal(
    consentSatisfiesCurrent({
      terms_version: CURRENT_TERMS_VERSION,
      privacy_version: CURRENT_PRIVACY_VERSION,
      aup_version: CURRENT_AUP_VERSION,
      accepted_at: "2026-09-14T00:00:00.000Z",
      consent_source: "signup",
    }),
    true,
  );
  assert.equal(layout.includes("userNeedsLegalReconsent"), true);
  assert.equal(layout.includes("LegalReconsentDialog"), true);
});

test("legal pages are public and /security is not redirected into settings", () => {
  assert.equal(isProtectedPath("/terms"), false);
  assert.equal(isProtectedPath("/privacy"), false);
  assert.equal(isProtectedPath("/acceptable-use"), false);
  assert.equal(isProtectedPath("/security"), false);
  assert.equal(nextConfig.includes('source: "/security"'), false);
  assert.equal(TERMS_DOCUMENT.sections.length > 8, true);
  assert.equal(PRIVACY_DOCUMENT.sections.some((section) => section.id === "processors"), true);
  assert.equal(AUP_DOCUMENT.title.includes("Acceptable Use"), true);
  assert.equal(SECURITY_DOCUMENT.informational, true);
  assert.equal(SECURITY_DOCUMENT.sections.some((section) => /SOC 2/.test(section.paragraphs.join(" "))), true);
});

test("signup checkbox is required, unchecked by default, and legal links open separately", () => {
  assert.equal(signupForm.includes('legalAccepted: false'), true);
  assert.equal(signupForm.includes("LegalConsentField"), true);
  assert.equal(signupForm.includes("disabled={isSubmitting || !field.value}"), true);
  assert.equal(signupForm.includes("SignUpOAuthButtons"), true);
  assert.equal(signupForm.includes("target=\"_blank\""), false);
  assert.equal(signupPage.includes("By creating an account you agree"), false);
  const field = readFileSync(new URL("../components/legal/LegalConsentField.tsx", import.meta.url), "utf8");
  assert.equal(field.includes('target="_blank"'), true);
  assert.equal(field.includes("LEGAL_ROUTES.terms"), true);
  assert.equal(field.includes("LEGAL_ROUTES.privacy"), true);
});

test("historical consent is append-only in SQL and audit events stay non-secret", () => {
  assert.equal(migration.includes("for select"), true);
  assert.equal(/create policy[\s\S]*for (insert|update|delete)/.test(migration), false);
  assert.equal(consent.includes("accepted_at"), true);
  assert.equal(consent.includes("legal.accepted"), true);
  assert.equal(consent.includes("legal.reaccepted"), true);
  assert.equal(consent.includes("user-agent"), false);
  assert.equal(consent.includes("password"), false);
  assert.equal(consent.includes("terms_version: versions.termsVersion"), true);
});

test("settings and footer expose legal documents", () => {
  assert.equal(settings.includes("LegalSettings"), true);
  assert.equal(footer.includes("/acceptable-use"), true);
  assert.equal(footer.includes("/security"), true);
  assert.equal(rls.includes("legal_consents"), true);
});
