/**
 * Client-safe Vault Phrase copy and validation. No Node crypto.
 */

export const RECOVERY_PHRASE_MIN = 12;
export const RECOVERY_PHRASE_MAX = 128;

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

export const VAULT_PHRASE_MISMATCH = "That Vault Phrase didn't match.";
export const VAULT_PHRASE_THROTTLED = "Too many attempts. Try again in a moment.";
export const VAULT_PHRASE_SETUP_REQUIRED = "Create a Vault Phrase to protect your Vault.";
export const VAULT_PHRASE_UNLOCK_REQUIRED = "Enter your Vault Phrase to view this secret.";
export const VAULT_PHRASE_LENGTH = "Vault Phrase must be 12–128 characters.";
export const VAULT_PHRASE_CONFIRM = "Vault Phrase and confirmation must match.";
export const VAULT_PHRASE_EXISTS = "A Vault Phrase is already set for this Vault.";
export const VAULT_PHRASE_SAVE_FAILED = "Vault Phrase could not be saved.";
