import assert from "node:assert/strict";
import test from "node:test";
import { encryptSecret, decryptSecret } from "../lib/security/encryption";
import { getProjectSecretsMetadata } from "../lib/agent/context";
import { redactSensitive } from "../lib/security/redaction";

process.env.CANDLER_ENCRYPTION_KEY_V1 = Buffer.alloc(32, 7).toString("base64");

test("AES-256-GCM round trips and uses unique nonces", () => {
  const a = encryptSecret("sk_live_never_log");
  const b = encryptSecret("sk_live_never_log");
  assert.notEqual(a.ciphertext, "sk_live_never_log");
  assert.notEqual(a.iv, b.iv);
  assert.equal(decryptSecret(a), "sk_live_never_log");
});

test("tampered ciphertext fails authentication", () => {
  const value = encryptSecret("sensitive");
  value.ciphertext = Buffer.from("tampered").toString("base64");
  assert.throws(() => decryptSecret(value));
});

test("Agent metadata excludes every secret-bearing field", () => {
  const raw = {
    id: "1",
    name: "STRIPE_SECRET_KEY",
    service: "Stripe",
    environment: "Production",
    createdAt: "2026-01-01",
    expiresAt: null,
    rotationDueAt: null,
    ciphertext: "cipher",
    iv: "nonce",
    authTag: "tag",
    value: "sk_test_CANDLER_DO_NOT_LEAK_123",
  };
  const metadata = getProjectSecretsMetadata([raw])[0];
  const serialized = JSON.stringify(metadata);
  assert.equal(serialized.includes("sk_test_CANDLER_DO_NOT_LEAK_123"), false);
  assert.equal(serialized.includes("cipher"), false);
  assert.deepEqual(Object.keys(metadata).sort(), ["createdAt", "environment", "exists", "expirationStatus", "id", "name", "rotationStatus", "service"].sort());
});

test("logging payloads redact nested credentials", () => {
  assert.deepEqual(redactSensitive({ user: "u", nested: { password: "p", apiKey: "k" } }), {
    user: "u",
    nested: { password: "[REDACTED]", apiKey: "[REDACTED]" },
  });
});
