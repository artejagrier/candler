import assert from "node:assert/strict";
import test from "node:test";
import { detectService, parseEnvFile } from "../lib/vault/env-import";

test("env parser extracts keys, services, and public markers without logging values", () => {
  const entries = parseEnvFile(`
# comment
NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co
SUPABASE_SERVICE_ROLE_KEY=super-secret
STRIPE_SECRET_KEY=sk_live_example
EMPTY=
`);
  assert.deepEqual(entries.map((entry) => ({ name: entry.name, serviceName: entry.serviceName, isPublic: entry.isPublic })), [
    { name: "NEXT_PUBLIC_SUPABASE_URL", serviceName: "Supabase", isPublic: true },
    { name: "SUPABASE_SERVICE_ROLE_KEY", serviceName: "Supabase", isPublic: false },
    { name: "STRIPE_SECRET_KEY", serviceName: "Stripe", isPublic: false },
  ]);
  assert.equal(detectService("OPENAI_API_KEY"), "OpenAI");
});
