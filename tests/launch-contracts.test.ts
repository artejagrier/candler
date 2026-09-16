import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";

test("launch path no longer ships mock project data", () => {
  assert.equal(existsSync(new URL("../lib/mock/projects.ts", import.meta.url)), false);
  // The retired static command config is gone; the palette now searches live.
  assert.equal(existsSync(new URL("../config/commands.ts", import.meta.url)), false);
  const palette = readFileSync(new URL("../components/product/CommandPalette.tsx", import.meta.url), "utf8");
  assert.equal(palette.includes("MOCK_PROJECTS"), false);
  assert.equal(palette.includes("/api/search"), true);
});

test("cloud upload authorization does not accept client plan or usage", () => {
  const route = readFileSync(new URL("../app/api/cloud/upload/route.ts", import.meta.url), "utf8");
  const batch = readFileSync(new URL("../app/api/cloud/upload/batch-authorize/route.ts", import.meta.url), "utf8");
  const authorize = readFileSync(new URL("../lib/cloud/authorize.ts", import.meta.url), "utf8");
  assert.equal(/usedBytes|plan/.test(route.split("const input")[1]?.split("export async")[0] ?? "usedBytes"), false);
  assert.equal(authorize.includes("getCurrentStorageUsage"), true);
  assert.equal(authorize.includes("getStorageQuota"), true);
  assert.equal(authorize.includes("objectKey(context.userId, context.workspaceId, fileId)"), true);
  assert.equal(batch.includes("requireCloudActor"), true);
  assert.equal(batch.includes("uploadBatchInput"), true);
});

test("checkout derives workspace identity on the server", () => {
  const source = readFileSync(new URL("../app/api/paddle/checkout/route.ts", import.meta.url), "utf8");
  assert.equal(source.includes("workspaceId: z.uuid()"), false);
  assert.equal(source.includes("getWorkspaceContext"), true);
  assert.equal(source.includes("subscriptions.update"), true);
  assert.equal(source.includes("isLiveSubscription"), true);
  assert.equal(/priceId|price: z/.test(source.split("const input")[1]?.split("export async")[0] ?? ""), false);
});

test("billing portal does not accept a client-supplied customer id", () => {
  const source = readFileSync(new URL("../app/api/paddle/portal/route.ts", import.meta.url), "utf8");
  assert.equal(source.includes("request.json"), false);
  assert.equal(source.includes("getWorkspaceContext"), true);
  assert.equal(source.includes("paddle_customer_id"), true);
});

test("webhook verifies signatures and claims event ids", () => {
  const source = readFileSync(new URL("../app/api/paddle/webhook/route.ts", import.meta.url), "utf8");
  assert.equal(source.includes("Paddle-Signature"), true);
  assert.equal(source.includes("paddle_webhook_events"), true);
  assert.equal(source.includes("23505"), true);
  assert.equal(source.includes(".delete().eq(\"id\", event.eventId)"), true);
  assert.equal(source.includes("500"), true);
});

test("launch pricing no longer ships retired Cloud add-on prices", () => {
  const files = [
    "../lib/cloud/quota.ts",
    "../lib/billing/entitlements.ts",
    "../components/product/BillingClient.tsx",
    "../config/marketing.ts",
  ];
  for (const file of files) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.equal(source.includes("8.99"), false, file);
    assert.equal(source.includes("14.99"), false, file);
    assert.equal(source.includes("150 GB"), false, file);
  }
});

test("environment diagnostics never include secret values", () => {
  const source = readFileSync(new URL("../lib/env-validation.ts", import.meta.url), "utf8");
  const route = readFileSync(new URL("../app/api/health/route.ts", import.meta.url), "utf8");
  assert.equal(source.includes("process.env[key]"), true);
  assert.equal(/return \{[^}]*process\.env/.test(source), false);
  assert.equal(route.includes("missing:"), false);
});

test("agent secret queries request metadata columns only", () => {
  const source = readFileSync(new URL("../lib/agent/tools.ts", import.meta.url), "utf8");
  assert.equal(source.includes("ciphertext"), false);
  assert.equal(source.includes("seed_ciphertext"), false);
  assert.equal(source.includes("codes_ciphertext"), false);
});

test("cloud write lockdown migration keeps object status server-only", () => {
  const source = readFileSync(new URL("../supabase/migrations/0005_cloud_write_lockdown.sql", import.meta.url), "utf8");
  assert.equal(source.includes("for select to authenticated"), true);
  assert.equal(source.includes("drop policy if exists file_access"), true);
});
