/**
 * Central legal versioning for Candler.
 *
 * Production language in the corresponding documents should be reviewed by
 * qualified counsel before a broad public launch. Do not scatter version
 * strings across UI components.
 */

export const CURRENT_TERMS_VERSION = "2026-09-14";
export const CURRENT_PRIVACY_VERSION = "2026-09-14";
export const CURRENT_AUP_VERSION = "2026-09-14";

export const LEGAL_EFFECTIVE_DATE_ISO = "2026-09-14";
export const LEGAL_EFFECTIVE_DATE_LABEL = "September 14, 2026";

export const LEGAL_ROUTES = {
  terms: "/terms",
  privacy: "/privacy",
  refund: "/refund",
  acceptableUse: "/acceptable-use",
  security: "/security",
} as const;

/**
 * Mandatory re-consent is keyed to Terms by default. Privacy copy can change
 * informatively without blocking the workspace unless this flag is enabled.
 */
export const REQUIRE_TERMS_RECONSENT = true;
export const REQUIRE_PRIVACY_RECONSENT = false;

export type LegalConsentSource = "signup" | "reconsent";

export type LegalVersions = {
  termsVersion: string;
  privacyVersion: string;
  aupVersion: string;
};

export type StoredLegalConsent = {
  terms_version: string;
  privacy_version: string;
  aup_version: string | null;
  accepted_at: string;
  consent_source: string;
};

export function authoritativeLegalVersions(
  clientPayload?: Record<string, unknown>,
): LegalVersions {
  // Client-supplied version strings are discarded on purpose.
  if (clientPayload && "termsVersion" in clientPayload) {
    // no-op
  }
  return {
    termsVersion: CURRENT_TERMS_VERSION,
    privacyVersion: CURRENT_PRIVACY_VERSION,
    aupVersion: CURRENT_AUP_VERSION,
  };
}

export function consentSatisfiesCurrent(record: StoredLegalConsent | null | undefined): boolean {
  if (!record) return false;
  if (REQUIRE_TERMS_RECONSENT && record.terms_version !== CURRENT_TERMS_VERSION) return false;
  if (REQUIRE_PRIVACY_RECONSENT && record.privacy_version !== CURRENT_PRIVACY_VERSION) return false;
  return true;
}

export const LEGAL_ACCEPTANCE_MESSAGE =
  "You must agree to the Terms of Service and acknowledge the Privacy Policy to create an account.";
