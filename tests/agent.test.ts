import assert from "node:assert/strict";
import test from "node:test";
import { getProjectSecretsMetadata } from "../lib/agent/context";
import { assertAgentPayloadSafe, sanitizeAgentText } from "../lib/agent/security";

const LEAK = "sk_test_CANDLER_DO_NOT_LEAK_123";

test("known fake secret is stripped from user text before it can reach the model", () => {
  const sanitized = sanitizeAgentText(`Rotate ${LEAK} immediately`);
  assert.equal(sanitized.includes(LEAK), false);
  assert.equal(sanitized.includes("[REDACTED_CREDENTIAL]"), true);
});

test("agent metadata omits the known fake secret from every LLM-facing field", () => {
  const metadata = getProjectSecretsMetadata([{
    id: "secret-1",
    name: "STRIPE_SECRET_KEY",
    service: "Stripe",
    environment: "Production",
    createdAt: "2026-01-01T00:00:00Z",
    expiresAt: null,
    rotationDueAt: null,
    ciphertext: "cipher-should-not-leak",
    iv: "nonce-should-not-leak",
    authTag: "tag-should-not-leak",
    value: LEAK,
  }]);
  const serialized = JSON.stringify({
    system: "You are Candler Agent.",
    enrichment: metadata,
    tool: metadata,
    conversation: metadata,
    logs: metadata,
  });
  assert.equal(serialized.includes(LEAK), false);
  assert.equal(serialized.includes("cipher-should-not-leak"), false);
  assert.equal(serialized.includes("nonce-should-not-leak"), false);
  assertAgentPayloadSafe({ enrichment: metadata, tool: metadata });
});

test("agent payload guard rejects leaked secret values", () => {
  assert.throws(() => assertAgentPayloadSafe({ answer: LEAK }));
});
