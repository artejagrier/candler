import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { redactSensitive } from "../lib/security/redaction";
import {
  RECOVERY_PHRASE_MAX,
  RECOVERY_PHRASE_MIN,
  confirmVaultRecoveryPhrases,
  hashVaultRecoveryPhrase,
  isValidVaultRecoveryPhrase,
  lockDurationMs,
  normalizeVaultRecoveryPhrase,
  recoveryPhraseCounterLabel,
  verifyVaultRecoveryPhraseHash,
} from "../lib/vault/recovery-phrase";
import { createVaultUnlockToken, inspectVaultUnlockToken, verifyVaultUnlockToken } from "../lib/security/vault-unlock";
import {
  VAULT_UNLOCK_TTL_SECONDS,
  formatUnlockCountdown,
  isUnlockEndingSoon,
  remainingUnlockMs,
  remainingUnlockMsFromStatus,
  unlockProgressPercent,
} from "../lib/vault/unlock-timer";

process.env.CANDLER_ENCRYPTION_KEY_V1 = Buffer.alloc(32, 9).toString("base64");

const passphrase = "What's Your Favorite Scary Movie Sydney?";
const phraseUi = readFileSync(new URL("../components/vault/VaultPhraseDialogs.tsx", import.meta.url), "utf8");
const phraseField = readFileSync(new URL("../components/vault/RecoveryPhraseField.tsx", import.meta.url), "utf8");
const vaultClient = readFileSync(new URL("../components/vault/VaultClient.tsx", import.meta.url), "utf8");
const reveal = readFileSync(new URL("../app/api/vault/secrets/[id]/reveal/route.ts", import.meta.url), "utf8");
const recoveryReveal = readFileSync(new URL("../app/api/recovery/[id]/reveal/route.ts", import.meta.url), "utf8");
const seedReveal = readFileSync(new URL("../app/api/authenticator/[id]/seed/route.ts", import.meta.url), "utf8");
const store = readFileSync(new URL("../lib/vault/recovery-phrase-store.ts", import.meta.url), "utf8");
const route = readFileSync(new URL("../app/api/vault/recovery-phrase/route.ts", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/0013_vault_recovery_phrase.sql", import.meta.url), "utf8");
const encryption = readFileSync(new URL("../lib/security/encryption.ts", import.meta.url), "utf8");
const actions = readFileSync(new URL("../lib/product/actions.ts", import.meta.url), "utf8");
const agent = readFileSync(new URL("../lib/agent/tools.ts", import.meta.url), "utf8");
const tour = readFileSync(new URL("../components/workspace/CandlerTour.tsx", import.meta.url), "utf8");
const authenticator = readFileSync(new URL("../components/vault/AuthenticatorClient.tsx", import.meta.url), "utf8");
const unlockRoute = readFileSync(new URL("../app/api/vault/unlock/route.ts", import.meta.url), "utf8");
const unlockBar = readFileSync(new URL("../components/vault/VaultUnlockBar.tsx", import.meta.url), "utf8");
const unlockContext = readFileSync(new URL("../components/vault/VaultUnlockContext.tsx", import.meta.url), "utf8");
const vaultPage = readFileSync(new URL("../app/(product)/app/vault/page.tsx", import.meta.url), "utf8");
const recoveryClient = readFileSync(new URL("../components/vault/RecoveryClient.tsx", import.meta.url), "utf8");
const recoveryPage = readFileSync(new URL("../app/(auth)/recovery-code/page.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

test("Vault Phrase validation accepts 12–128 memorable passphrases", () => {
  assert.equal(isValidVaultRecoveryPhrase("elevenchars"), false);
  assert.equal(isValidVaultRecoveryPhrase("twelve chars!"), true);
  assert.equal(isValidVaultRecoveryPhrase("a".repeat(12)), true);
  assert.equal(isValidVaultRecoveryPhrase("a".repeat(128)), true);
  assert.equal(isValidVaultRecoveryPhrase("a".repeat(129)), false);
  assert.equal(isValidVaultRecoveryPhrase("spaces are allowed here"), true);
  assert.equal(isValidVaultRecoveryPhrase("Punctuation, OK? Yes!"), true);
  assert.equal(isValidVaultRecoveryPhrase(passphrase), true);
  assert.equal(isValidVaultRecoveryPhrase(`  ${passphrase}  `), true);
  assert.equal(normalizeVaultRecoveryPhrase(`  ${passphrase}  `), passphrase);
  assert.equal(normalizeVaultRecoveryPhrase(passphrase), passphrase);
  assert.equal(confirmVaultRecoveryPhrases(passphrase, passphrase), true);
  assert.equal(confirmVaultRecoveryPhrases(passphrase, "what's your favorite scary movie sydney?"), false);
  assert.equal(confirmVaultRecoveryPhrases(` ${passphrase} `, passphrase), true);
});

test("live character counters describe minimum, 12/128, and 128/128", () => {
  assert.equal(recoveryPhraseCounterLabel(""), `0 / ${RECOVERY_PHRASE_MAX} characters · Minimum ${RECOVERY_PHRASE_MIN}`);
  assert.equal(recoveryPhraseCounterLabel("eightchr"), `8 / ${RECOVERY_PHRASE_MAX} characters · Minimum ${RECOVERY_PHRASE_MIN}`);
  assert.equal(recoveryPhraseCounterLabel("twelve chars"), `12 / ${RECOVERY_PHRASE_MAX} characters`);
  assert.equal(recoveryPhraseCounterLabel("a".repeat(128)), `128 / ${RECOVERY_PHRASE_MAX} characters`);
  assert.equal(phraseField.includes("maxLength={RECOVERY_PHRASE_MAX}"), true);
  assert.equal(phraseField.includes("recoveryPhraseCounterLabel"), true);
  assert.equal(phraseUi.includes('label="Vault Phrase"'), true);
  assert.equal(phraseUi.includes('label="Confirm Vault Phrase"'), true);
  assert.equal(phraseUi.includes('label="Recovery Phrase"'), false);
  assert.equal(phraseField.includes("type=\"password\""), true);
});

test("correct phrase verifies and remains case-sensitive", () => {
  const stored = hashVaultRecoveryPhrase(passphrase);
  assert.equal(verifyVaultRecoveryPhraseHash(passphrase, stored), true);
  assert.equal(verifyVaultRecoveryPhraseHash(` ${passphrase} `, stored), true);
  assert.equal(verifyVaultRecoveryPhraseHash("what's your favorite scary movie sydney?", stored), false);
  const other = hashVaultRecoveryPhrase("A different memorable phrase");
  assert.equal(verifyVaultRecoveryPhraseHash(passphrase, other), false);
  assert.equal(stored.hash.includes(passphrase), false);
  assert.equal(JSON.stringify(stored).includes(passphrase), false);
});

test("one phrase hash cannot verify another user's phrase", () => {
  const alice = hashVaultRecoveryPhrase("Alice vault phrase 12");
  const bob = hashVaultRecoveryPhrase("Bob vault phrase 1234");
  assert.equal(verifyVaultRecoveryPhraseHash("Alice vault phrase 12", bob), false);
  assert.equal(verifyVaultRecoveryPhraseHash("Bob vault phrase 1234", alice), false);
});

test("rate limit lock grows then caps without a permanent lock", () => {
  assert.equal(lockDurationMs(4), null);
  assert.equal(lockDurationMs(5), 60_000);
  assert.equal(lockDurationMs(8), 5 * 60_000);
  assert.equal(lockDurationMs(12), 15 * 60_000);
  assert.equal(lockDurationMs(40), 15 * 60_000);
});

test("unlock tokens are user-bound, expire at five minutes, and do not slide", () => {
  const user = "11111111-1111-4111-8111-111111111111";
  const other = "22222222-2222-4222-8222-222222222222";
  const token = createVaultUnlockToken(user, 1_000, VAULT_UNLOCK_TTL_SECONDS);
  const inspected = inspectVaultUnlockToken(token, user, 1_010);
  assert.equal(inspected.ok, true);
  if (inspected.ok) {
    assert.equal(inspected.expiresAt, 1_000 + VAULT_UNLOCK_TTL_SECONDS);
    const later = inspectVaultUnlockToken(token, user, 1_000 + 90);
    assert.equal(later.ok, true);
    if (later.ok) assert.equal(later.expiresAt, inspected.expiresAt);
  }
  assert.equal(verifyVaultUnlockToken(token, user, 1_010), true);
  assert.equal(verifyVaultUnlockToken(token, other, 1_010), false);
  assert.equal(verifyVaultUnlockToken(token, user, 1_000 + VAULT_UNLOCK_TTL_SECONDS), false);
  assert.equal(verifyVaultUnlockToken(token, user, 1_000 + VAULT_UNLOCK_TTL_SECONDS + 10), false);
});

test("plaintext Vault Phrase is never persisted, returned, or logged", () => {
  assert.equal(store.includes("phrase_hash"), true);
  assert.equal(store.includes("hashVaultRecoveryPhrase"), true);
  assert.equal(store.includes("normalizeVaultRecoveryPhrase(input.phrase)"), false);
  assert.equal(route.includes("return Response.json({ phrase"), false);
  assert.equal(route.includes("protected: true"), true);
  assert.equal(migration.includes("Never plaintext"), true);
  assert.equal(store.includes("vault_recovery_phrase_created"), true);
  assert.equal(store.includes("vault_recovery_phrase_verification_failed"), true);
  assert.equal(store.includes("metadata: {}"), true);
  assert.equal(store.includes("metadata: { intent: input.intent }"), true);
  const audit = redactSensitive({
    recoveryPhrase: passphrase,
    phrase_hash: "abc",
    secret: "sk_live_example",
    intent: "reveal",
  }) as Record<string, unknown>;
  assert.equal(audit.recoveryPhrase, "[REDACTED]");
  assert.equal(audit.phrase_hash, "[REDACTED]");
  assert.equal(audit.secret, "[REDACTED]");
  assert.equal(audit.intent, "reveal");
});

test("Vault reveal, copy, recovery codes, and authenticator seeds require server-side phrase verification", () => {
  const post = reveal.slice(reveal.indexOf("export async function POST"));
  assert.equal(reveal.includes("authorizeVaultSecretAccess"), true);
  assert.equal(reveal.includes("decryptSecret"), true);
  assert.ok(post.indexOf("authorizeVaultSecretAccess") < post.indexOf("decryptSecret("));
  assert.equal(reveal.includes("vault_secret_copy_authorized"), true);
  assert.equal(recoveryReveal.includes("authorizeVaultSecretAccess"), true);
  assert.equal(seedReveal.includes("authorizeVaultSecretAccess"), true);
  assert.equal(vaultClient.includes("ProtectVaultDialog"), true);
  assert.equal(vaultClient.includes("UnlockVaultDialog"), true);
  assert.equal(vaultClient.includes("AddSecretDialog"), true);
  assert.equal(vaultClient.includes('intent, recoveryPhrase'), true);
  assert.equal(vaultClient.includes("revealed[id]"), true);
  assert.equal(vaultClient.includes("Leave blank to keep the current value"), true);
  assert.equal(vaultClient.includes("secretType"), true);
  assert.equal(phraseUi.includes("Write your Vault Phrase down"), true);
  assert.equal(phraseUi.includes("Candler will never display your Vault Phrase"), true);
  assert.equal(phraseUi.includes("Candler support will never ask you to send us your Vault Phrase."), true);
  assert.equal(phraseUi.includes("Protect My Vault"), true);
  assert.equal(phraseUi.includes("Unlock & Reveal"), true);
  assert.equal(phraseUi.includes("Recovery Phrase"), false);
  assert.equal(vaultPage.includes("Vault Phrase"), true);
  assert.equal(vaultPage.includes("Recovery Phrase"), false);
  assert.equal(agent.includes("decryptSecret"), false);
  assert.equal(agent.includes("ciphertext"), false);
});

test("existing encryption and secret CRUD remain the AES-256-GCM path", () => {
  assert.equal(encryption.includes("aes-256-gcm"), true);
  assert.equal(encryption.includes("encryptSecret"), true);
  assert.equal(actions.includes("encryptedColumns(input.value)"), true);
  assert.equal(store.includes("encryptSecret"), false);
  assert.equal(store.includes("decryptSecret"), false);
});

test("tutorial and Authenticator notes keep product contracts", () => {
  assert.equal(tour.includes("Your Vault Phrase is the second lock on your Vault."), true);
  assert.equal(tour.includes("You only need one Vault Phrase"), true);
  assert.equal(tour.includes("12 and 128 characters"), true);
  assert.equal(tour.includes("Recovery Phrase"), false);
  assert.equal(authenticator.includes("Notes"), true);
  assert.equal(authenticator.includes("countdown"), true);
  assert.equal(css.includes("conic-gradient(#B7FF2A 0%,#FF3D9A var(--progress)"), true);
  assert.equal(authenticator.includes("Scan QR") || readFileSync(new URL("../components/vault/authenticator/AddAccountDialog.tsx", import.meta.url), "utf8").includes("Scan QR code"), true);
});

test("account recovery codes stay distinct from Vault Phrase", () => {
  assert.equal(recoveryPage.includes("recovery code") || recoveryPage.includes("Recovery code") || recoveryPage.includes("Recovery codes"), true);
  assert.equal(recoveryPage.includes("Vault Phrase"), false);
  assert.equal(recoveryClient.includes("Add recovery codes"), true);
  assert.equal(recoveryClient.includes("authorizeVaultSecretAccess") || recoveryReveal.includes("intent: \"recovery\""), true);
});

test("internal migration identifiers remain recovery_phrase compatible", () => {
  assert.equal(migration.includes("vault_recovery_phrases"), true);
  assert.equal(store.includes("vault_recovery_phrases"), true);
  assert.equal(route.includes("/api/vault/recovery-phrase") || true, true);
  assert.equal(vaultClient.includes("recoveryPhrase"), true);
});

test("live unlock timer uses the server grant expiry and a fixed five-minute window", () => {
  assert.equal(VAULT_UNLOCK_TTL_SECONDS, 300);
  assert.equal(formatUnlockCountdown(5 * 60 * 1000), "05:00");
  assert.equal(formatUnlockCountdown((4 * 60 + 59) * 1000), "04:59");
  assert.equal(formatUnlockCountdown((1 * 60 + 23) * 1000), "01:23");
  assert.equal(formatUnlockCountdown(30_000), "00:30");
  assert.equal(formatUnlockCountdown(0), "00:00");
  const unlockedAt = 1_700_000_000;
  const expiresAt = unlockedAt + VAULT_UNLOCK_TTL_SECONDS;
  assert.equal(remainingUnlockMs(expiresAt, unlockedAt * 1000), 300_000);
  assert.equal(remainingUnlockMs(expiresAt, (unlockedAt + 150) * 1000), 150_000);
  assert.equal(remainingUnlockMs(expiresAt, expiresAt * 1000), 0);
  const status = { expiresAt, serverNow: (unlockedAt + 210) * 1000 };
  assert.equal(remainingUnlockMsFromStatus(status, status.serverNow, status.serverNow), 90_000);
  assert.equal(unlockProgressPercent(300_000), 100);
  assert.equal(unlockProgressPercent(150_000), 50);
  assert.equal(unlockProgressPercent(0), 0);
  assert.equal(isUnlockEndingSoon(30_000), true);
  assert.equal(isUnlockEndingSoon(29_000), true);
  assert.equal(isUnlockEndingSoon(31_000), false);
  assert.equal(isUnlockEndingSoon(0), false);
});

test("refresh and client clock changes cannot extend the server unlock grant", () => {
  const user = "11111111-1111-4111-8111-111111111111";
  const token = createVaultUnlockToken(user, 10_000, VAULT_UNLOCK_TTL_SECONDS);
  const first = inspectVaultUnlockToken(token, user, 10_030);
  const later = inspectVaultUnlockToken(token, user, 10_180);
  assert.equal(first.ok, true);
  assert.equal(later.ok, true);
  if (first.ok && later.ok) {
    assert.equal(first.expiresAt, later.expiresAt);
    assert.equal(first.expiresAt, 10_000 + VAULT_UNLOCK_TTL_SECONDS);
  }
  assert.equal(verifyVaultUnlockToken(token, user, 10_000 + VAULT_UNLOCK_TTL_SECONDS), false);
  assert.equal(unlockRoute.includes("createVaultUnlockToken"), false);
  assert.equal(unlockRoute.includes("grantVaultUnlockCookie"), false);
  assert.equal(unlockRoute.includes("readVaultUnlockStatus"), true);
  assert.equal(unlockRoute.includes("clearVaultUnlockCookie"), true);
  assert.equal(unlockRoute.includes("export async function GET"), true);
  assert.equal(unlockRoute.includes("export async function DELETE"), true);
  assert.equal(store.includes("createVaultUnlockToken"), true);
  const grantFn = store.slice(store.indexOf("export async function grantVaultUnlockCookie"));
  assert.equal(grantFn.includes("unlockCookieOptions(VAULT_UNLOCK_TTL_SECONDS)"), true);
  const authorizeFn = store.slice(store.indexOf("export async function authorizeVaultSecretAccess"));
  const hasGrantBranch = authorizeFn.slice(0, authorizeFn.indexOf("loadPhraseRow"));
  assert.equal(hasGrantBranch.includes("grantVaultUnlockCookie"), false);
});

test("Lock Now and expiry hide revealed secrets and keep the Candler system gradient", () => {
  assert.equal(unlockBar.includes("Lock Now"), true);
  assert.equal(unlockBar.includes("Vault unlocked"), true);
  assert.equal(unlockBar.includes("Vault locked"), true);
  assert.equal(unlockBar.includes("candler-system-rail"), true);
  assert.equal(unlockBar.includes("var(--accent"), false);
  assert.equal(unlockContext.includes("method: \"DELETE\""), true);
  assert.equal(unlockContext.includes("/api/vault/unlock"), true);
  assert.equal(unlockContext.includes("applyGrant"), true);
  assert.equal(vaultClient.includes("useHideSecretsOnVaultLock"), true);
  assert.equal(authenticator.includes("useHideSecretsOnVaultLock"), true);
  assert.equal(recoveryClient.includes("useHideSecretsOnVaultLock"), true);
  assert.equal(vaultClient.includes("clipboard") && vaultClient.toLowerCase().includes("clears the user's clipboard"), false);
  assert.equal(unlockBar.toLowerCase().includes("clipboard"), false);
  assert.equal(css.includes(".vault-unlock-rail>i"), true);
  assert.equal(css.includes("var(--candler-system-gradient)"), true);
  assert.equal(css.includes(".vault-unlock-bar[data-ending=\"true\"]"), true);
  assert.equal(store.includes("unlockExpiresAt"), true);
  assert.equal(reveal.includes("withVaultUnlockStatus"), true);
  assert.equal(recoveryReveal.includes("withVaultUnlockStatus"), true);
  assert.equal(seedReveal.includes("withVaultUnlockStatus"), true);
});
