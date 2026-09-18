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
import {
  isValidVaultRecoveryPhrase,
  normalizeVaultRecoveryPhrase,
} from "./recovery-phrase-copy";

export {
  RECOVERY_PHRASE_MIN,
  RECOVERY_PHRASE_MAX,
  normalizeVaultRecoveryPhrase,
  isValidVaultRecoveryPhrase,
  confirmVaultRecoveryPhrases,
  recoveryPhraseCounterLabel,
  VAULT_PHRASE_MISMATCH,
  VAULT_PHRASE_THROTTLED,
  VAULT_PHRASE_SETUP_REQUIRED,
  VAULT_PHRASE_UNLOCK_REQUIRED,
  VAULT_PHRASE_LENGTH,
  VAULT_PHRASE_CONFIRM,
  VAULT_PHRASE_EXISTS,
  VAULT_PHRASE_SAVE_FAILED,
} from "./recovery-phrase-copy";

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
