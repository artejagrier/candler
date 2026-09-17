/**
 * Vault Phrase validation and password hashing.
 *
 * User-facing name: Vault Phrase.
 * Internal identifiers may still say recovery_phrase (applied migration 0013).
 *
 * Normalization is identical for create, confirm, and verify:
 * Unicode NFC + trim of leading/trailing whitespace only.
 * Internal spaces, punctuation, and capitalization are preserved.
 * The phrase is never lowercased or stripped of punctuation.
 */

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const RECOVERY_PHRASE_MIN = 12;
export const RECOVERY_PHRASE_MAX = 128;

export const RECOVERY_PHRASE_KDF = {
  kdf: "scrypt" as const,
  N: 16_384,
  r: 8,
  p: 1,
  dkLen: 32,
};

export type RecoveryPhraseHash = {
  hash: string;
  salt: string;
  kdf: "scrypt";
  N: number;
  r: number;
  p: number;
};

export function normalizeVaultRecoveryPhrase(phrase: string) {
  return phrase.normalize("NFC").trim();
}

export function isValidVaultRecoveryPhrase(phrase: string) {
  const normalized = normalizeVaultRecoveryPhrase(phrase);
  return normalized.length >= RECOVERY_PHRASE_MIN && normalized.length <= RECOVERY_PHRASE_MAX;
}

export function confirmVaultRecoveryPhrases(phrase: string, confirmation: string) {
  return normalizeVaultRecoveryPhrase(phrase) === normalizeVaultRecoveryPhrase(confirmation)
    && isValidVaultRecoveryPhrase(phrase);
}

export function recoveryPhraseCounterLabel(raw: string) {
  const length = Math.min(raw.length, RECOVERY_PHRASE_MAX);
  if (normalizeVaultRecoveryPhrase(raw).length < RECOVERY_PHRASE_MIN) {
    return `${length} / ${RECOVERY_PHRASE_MAX} characters · Minimum ${RECOVERY_PHRASE_MIN}`;
  }
  return `${length} / ${RECOVERY_PHRASE_MAX} characters`;
}

export function hashVaultRecoveryPhrase(phrase: string, saltHex = randomBytes(16).toString("hex")): RecoveryPhraseHash {
  const normalized = normalizeVaultRecoveryPhrase(phrase);
  if (!isValidVaultRecoveryPhrase(normalized)) {
    throw new Error("Vault Phrase must be 12–128 characters.");
  }
  const hash = scryptSync(normalized, saltHex, RECOVERY_PHRASE_KDF.dkLen, {
    N: RECOVERY_PHRASE_KDF.N,
    r: RECOVERY_PHRASE_KDF.r,
    p: RECOVERY_PHRASE_KDF.p,
  }).toString("hex");
  return {
    hash,
    salt: saltHex,
    kdf: RECOVERY_PHRASE_KDF.kdf,
    N: RECOVERY_PHRASE_KDF.N,
    r: RECOVERY_PHRASE_KDF.r,
    p: RECOVERY_PHRASE_KDF.p,
  };
}

export function verifyVaultRecoveryPhraseHash(phrase: string, stored: RecoveryPhraseHash) {
  const normalized = normalizeVaultRecoveryPhrase(phrase);
  const candidate = scryptSync(normalized, stored.salt, RECOVERY_PHRASE_KDF.dkLen, {
    N: stored.N || RECOVERY_PHRASE_KDF.N,
    r: stored.r || RECOVERY_PHRASE_KDF.r,
    p: stored.p || RECOVERY_PHRASE_KDF.p,
  }).toString("hex");
  if (candidate.length !== stored.hash.length) return false;
  return timingSafeEqual(Buffer.from(candidate, "hex"), Buffer.from(stored.hash, "hex"));
}

export function lockDurationMs(failedAttempts: number) {
  if (failedAttempts < 5) return null;
  if (failedAttempts < 8) return 60_000;
  if (failedAttempts < 12) return 5 * 60_000;
  return 15 * 60_000;
}

export const VAULT_PHRASE_MISMATCH = "That Vault Phrase didn't match.";
export const VAULT_PHRASE_THROTTLED = "Too many attempts. Try again in a moment.";
export const VAULT_PHRASE_SETUP_REQUIRED = "Create a Vault Phrase to protect your Vault.";
export const VAULT_PHRASE_UNLOCK_REQUIRED = "Enter your Vault Phrase to view this secret.";
export const VAULT_PHRASE_LENGTH = "Vault Phrase must be 12–128 characters.";
export const VAULT_PHRASE_CONFIRM = "Vault Phrase and confirmation must match.";
export const VAULT_PHRASE_EXISTS = "A Vault Phrase is already set for this Vault.";
export const VAULT_PHRASE_SAVE_FAILED = "Vault Phrase could not be saved.";
