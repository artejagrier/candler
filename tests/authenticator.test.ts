import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import {
  AUTHENTICATOR_BAD_KEY,
  AUTHENTICATOR_UNREADABLE,
  AUTHENTICATOR_UNSUPPORTED,
  formatTotpCode,
  parseOtpAuthUri,
  parseTotpSetup,
  recognizeIssuer,
} from "../lib/vault/otpauth";
import { totpSeedFingerprint } from "../lib/vault/authenticator-fingerprint";

process.env.CANDLER_ENCRYPTION_KEY_V1 = Buffer.alloc(32, 7).toString("base64");

const client = readFileSync(new URL("../components/vault/AuthenticatorClient.tsx", import.meta.url), "utf8");
const addDialog = readFileSync(new URL("../components/vault/authenticator/AddAccountDialog.tsx", import.meta.url), "utf8");
const actions = readFileSync(new URL("../lib/product/actions.ts", import.meta.url), "utf8");
const codeRoute = readFileSync(new URL("../app/api/authenticator/[id]/code/route.ts", import.meta.url), "utf8");
const seedRoute = readFileSync(new URL("../app/api/authenticator/[id]/seed/route.ts", import.meta.url), "utf8");
const queries = readFileSync(new URL("../lib/data/queries.ts", import.meta.url), "utf8");
const agentTools = readFileSync(new URL("../lib/agent/tools.ts", import.meta.url), "utf8");
const observable = readFileSync(new URL("../app/api/audit/observable/route.ts", import.meta.url), "utf8");
const search = readFileSync(new URL("../app/api/search/route.ts", import.meta.url), "utf8");
const observeCopy = readFileSync(new URL("../lib/product/client-security.ts", import.meta.url), "utf8");
const fingerprintSource = readFileSync(new URL("../lib/vault/authenticator-fingerprint.ts", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/0009_authenticator_sync.sql", import.meta.url), "utf8");
const rls = readFileSync(new URL("../scripts/rls-integration.ts", import.meta.url), "utf8");

test("setup key and URI parsing stay local and reject junk", () => {
  const parsed = parseOtpAuthUri("otpauth://totp/GitHub:arteja%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=GitHub");
  assert.equal(parsed.issuer, "GitHub");
  assert.equal(parsed.accountName, "arteja@example.com");
  assert.equal(parsed.secret.includes(" "), false);
  assert.throws(() => parseOtpAuthUri("https://evil.example/qr"), { message: AUTHENTICATOR_UNREADABLE });
  assert.throws(() => parseOtpAuthUri("otpauth://hotp/GitHub:dev?secret=JBSWY3DPEHPK3PXP"), { message: AUTHENTICATOR_UNREADABLE });
  assert.throws(() => parseOtpAuthUri("otpauth://totp/GitHub:dev?secret=JBSWY3DPEHPK3PXP&algorithm=SHA256"), { message: AUTHENTICATOR_UNSUPPORTED });
  assert.throws(() => parseTotpSetup({ accountName: "GitHub", secret: "not a key" }), { message: AUTHENTICATOR_BAD_KEY });
  const manual = parseTotpSetup({ accountName: "GitHub", secret: "jbsw y3dp ehpk 3pxp" });
  assert.equal(manual.issuer, "GitHub");
  assert.equal(manual.secret, "JBSWY3DPEHPK3PXP");
});

test("common issuers are recognized without affecting unknown services", () => {
  assert.equal(recognizeIssuer("github").displayName, "GitHub");
  assert.equal(recognizeIssuer("arteja@gmail.com").displayName, "Google");
  assert.equal(recognizeIssuer("Northwind CRM").displayName, "Northwind CRM");
  assert.equal(formatTotpCode("482193"), "482 193");
});

test("Authenticator UI is a product flow, not a developer form", () => {
  assert.equal(client.includes("confirm("), false);
  assert.equal(client.includes("prompt("), false);
  assert.equal(addDialog.includes("otpauth URI"), false);
  assert.equal(addDialog.includes("Encrypt & save"), false);
  assert.equal(addDialog.includes("Add to Candler"), true);
  assert.equal(addDialog.includes("Enter setup key"), true);
  assert.equal(addDialog.includes("Scan QR code"), true);
  assert.equal(client.includes("Reveal setup key"), true);
  assert.equal(client.includes("jsQR") || addDialog.includes("jsqr"), true);
});

test("seeds stay server-side except the step-up reveal route", () => {
  assert.equal(codeRoute.includes("generateTotp"), true);
  assert.equal(codeRoute.includes("seed_ciphertext"), true);
  assert.equal(/return Response\.json\(\s*\{ code/.test(codeRoute.replaceAll("\n", "")), true);
  assert.equal(seedRoute.includes("hasRecentAuthentication"), true);
  assert.equal(seedRoute.includes("REAUTH_REQUIRED"), true);
  assert.equal(seedRoute.includes('.eq("owner_id", context.userId)'), true);
  assert.equal(seedRoute.includes('.eq("workspace_id", context.workspaceId)'), true);
  assert.match(queries, /from\("authenticator_entries"\)\.select\("id,issuer,account_name,notes,pinned,last_used_at,created_at,updated_at"\)/);
  assert.equal(queries.includes("seed_ciphertext"), false);
  assert.equal(queries.includes("seed_fingerprint"), false);
  assert.equal(queries.includes('.eq("owner_id", context.userId)'), true);
  assert.equal(agentTools.includes("seed_ciphertext"), false);
  assert.equal(agentTools.includes("seed_fingerprint"), false);
  assert.equal(actions.includes('encryptedColumns(parsed.secret, "seed")'), true);
  assert.equal(actions.includes("authenticator.created"), true);
  assert.equal(client.includes("localStorage"), false);
  assert.equal(addDialog.includes("localStorage"), false);
});

test("seed fingerprints are deterministic, non-invertible, and not compared as plaintext", () => {
  const a = totpSeedFingerprint("JBSWY3DPEHPK3PXP");
  const b = totpSeedFingerprint("jbsw y3dp ehpk 3pxp");
  const c = totpSeedFingerprint("HXDMVJECJJWSRB3HWIZR4IFZRWPDNLPA");
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.notEqual(a, "JBSWY3DPEHPK3PXP");
  assert.equal(a.includes("JBSWY3DPEHPK3PXP"), false);
  assert.equal(fingerprintSource.includes("createHmac"), true);
  assert.equal(actions.includes("totpSeedFingerprint"), true);
  assert.equal(actions.includes("DUPLICATE"), true);
  assert.equal(actions.includes('.eq("seed_fingerprint", fingerprint)'), true);
  assert.equal(addDialog.includes("This account is already in Candler."), true);
  assert.equal(addDialog.includes("View account"), true);
});

test("copy and audit paths never persist TOTP values or seeds", () => {
  assert.equal(observeCopy.includes("JSON.stringify({ event, id })"), true);
  assert.equal(observable.includes("last_used_at"), true);
  assert.equal(observable.includes("ciphertext"), false);
  assert.equal(observable.includes("generateTotp"), false);
  assert.equal(/metadata:\s*\{[^}]*code/.test(observable), false);
  assert.equal(client.includes("observeCopy(\"authenticator.code_copied\", id)"), true);
  assert.equal(actions.includes("metadata: { issuer, account }"), true);
  assert.equal(seedRoute.includes("metadata: { issuer: data.issuer }"), true);
  assert.equal(search.includes("seed_ciphertext"), false);
  assert.equal(search.includes("seed_fingerprint"), false);
});

test("multi-device organization stays on the server without a second database", () => {
  assert.equal(migration.includes("seed_fingerprint"), true);
  assert.equal(migration.includes("pinned boolean"), true);
  assert.equal(migration.includes("last_used_at"), true);
  assert.equal(client.includes("Protected by Candler"), true);
  assert.equal(client.includes("Available on your signed-in devices"), true);
  assert.equal(client.includes("backed up"), false);
  assert.equal(addDialog.includes("Notes"), true);
  assert.equal(client.includes("authenticator-notes"), true);
  assert.equal(client.includes("ProtectVaultDialog"), true);
  assert.equal(seedRoute.includes("authorizeVaultSecretAccess"), true);
  assert.equal(client.includes("Lose your device"), false);
  assert.equal(client.includes("setAuthenticatorPinnedAction"), true);
  assert.equal(client.includes("Recently used"), true);
  assert.equal(client.includes("/app/vault/recovery?service="), true);
  assert.equal(existsSync(new URL("../app/api/authenticator/export/route.ts", import.meta.url)), false);
  assert.equal(client.includes("Bulk export is not available yet"), true);
  assert.equal(codeRoute.includes("Authentication required."), true);
  assert.equal(seedRoute.includes("Authentication required."), true);
  assert.equal(rls.includes("User B revealed User A authenticator seed"), true);
  assert.equal(rls.includes("User B mutated User A authenticator"), true);
});
