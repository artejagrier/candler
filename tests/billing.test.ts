import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { hasEntitlement, hasProEntitlement, highestCloudPlan, productFromPriceId, storageQuotaBytes } from "../lib/billing/entitlements";
import { PLAN_COPY, formatUsedGb, planChipLabel, quotaLabel, subscriptionFacts } from "../lib/billing/plan-display";
import { CLOUD_PLANS } from "../lib/cloud/quota";

test("launch quotas are 10 GB, 50 GB, 500 GB, and 1 TB", () => {
  assert.equal(CLOUD_PLANS.free.bytes, 10 * 1024 ** 3);
  assert.equal(CLOUD_PLANS.pro.bytes, 50 * 1024 ** 3);
  assert.equal(CLOUD_PLANS.cloud500.bytes, 500 * 1024 ** 3);
  assert.equal(CLOUD_PLANS.cloud1tb.bytes, 1024 * 1024 ** 3);
  assert.equal(CLOUD_PLANS.free.price, 0);
  assert.equal(CLOUD_PLANS.pro.price, 18);
  assert.equal(CLOUD_PLANS.cloud500.price, 29);
  assert.equal(CLOUD_PLANS.cloud1tb.price, 39);
});

test("entitlements require active status and unexpired period", () => {
  assert.equal(hasEntitlement("active", new Date("2030-01-01"), new Date("2026-01-01")), true);
  assert.equal(hasEntitlement("past_due", new Date("2030-01-01"), new Date("2026-01-01")), false);
});

test("price mapping never trusts an unknown Paddle price", () => {
  const prices = { pro: "price_pro", cloud500: "price_500", cloud1tb: "price_1tb" };
  assert.equal(productFromPriceId("price_other", prices), null);
  assert.deepEqual(productFromPriceId("price_pro", prices), {
    product_key: "candler_pro",
    entitlement_pro: true,
    cloud_plan: "pro",
    storage_quota_bytes: CLOUD_PLANS.pro.bytes,
  });
  assert.deepEqual(productFromPriceId("price_500", prices), {
    product_key: "cloud_500",
    entitlement_pro: true,
    cloud_plan: "cloud500",
    storage_quota_bytes: CLOUD_PLANS.cloud500.bytes,
  });
  assert.deepEqual(productFromPriceId("price_1tb", prices), {
    product_key: "cloud_1tb",
    entitlement_pro: true,
    cloud_plan: "cloud1tb",
    storage_quota_bytes: CLOUD_PLANS.cloud1tb.bytes,
  });
});

test("cloud quota uses the highest live plan across subscriptions", () => {
  const now = new Date("2026-09-01");
  const plan = highestCloudPlan([
    { status: "active", current_period_end: "2030-01-01", cloud_plan: "pro", entitlement_pro: true },
    { status: "active", current_period_end: "2030-01-01", cloud_plan: "cloud500", entitlement_pro: true },
    { status: "canceled", current_period_end: "2030-01-01", cloud_plan: "cloud1tb", entitlement_pro: true },
  ], now);
  assert.equal(plan, "cloud500");
  assert.equal(storageQuotaBytes(plan), CLOUD_PLANS.cloud500.bytes);
});

test("a newer Pro subscription does not collapse Cloud quota to free", () => {
  const plan = highestCloudPlan([
    { status: "active", current_period_end: "2030-01-01", cloud_plan: "cloud1tb", entitlement_pro: true },
    { status: "active", current_period_end: "2030-01-01", cloud_plan: "pro", entitlement_pro: true },
  ], new Date("2026-09-01"));
  assert.equal(plan, "cloud1tb");
  assert.equal(hasProEntitlement([
    { status: "active", current_period_end: "2030-01-01", entitlement_pro: true },
  ], new Date("2026-09-01")), true);
});

test("Pro maps to 50 GB and includes Pro entitlement", () => {
  const plan = highestCloudPlan([
    { status: "active", current_period_end: "2030-01-01", cloud_plan: "pro", entitlement_pro: true },
  ], new Date("2026-09-01"));
  assert.equal(plan, "pro");
  assert.equal(storageQuotaBytes(plan), 50 * 1024 ** 3);
});

test("plan display copy matches launch tiers and does not invent status", () => {
  assert.equal(PLAN_COPY.free.title, "Free");
  assert.equal(PLAN_COPY.pro.title, "Candler Pro");
  assert.equal(PLAN_COPY.cloud500.quota, "500 GB Cloud");
  assert.equal(PLAN_COPY.cloud1tb.quota, "1 TB Cloud");
  assert.equal(planChipLabel("pro", true), "Pro · Trial");
  assert.equal(planChipLabel("free", true), "Free");
  assert.equal(quotaLabel(50 * 1024 ** 3), "50 GB");
  assert.equal(quotaLabel(1024 * 1024 ** 3), "1 TB");
  assert.equal(formatUsedGb(2.4 * 1024 ** 3), "2.4");
  assert.deepEqual(
    subscriptionFacts({ status: "active", current_period_end: new Date(2030, 0, 15), entitlement_pro: true }),
    ["Active", "Renews Jan 15, 2030"],
  );
  assert.deepEqual(
    subscriptionFacts({
      status: "trialing",
      current_period_end: new Date(2030, 0, 15),
      scheduled_change_action: "cancel",
      scheduled_change_effective_at: new Date(2030, 1, 1),
    }),
    ["Trialing", "Cancels Feb 1, 2030"],
  );
  assert.deepEqual(subscriptionFacts(null), []);
});

test("billing UI consumes server entitlement props and refreshes after checkout", () => {
  const source = readFileSync(new URL("../components/product/BillingClient.tsx", import.meta.url), "utf8");
  const page = readFileSync(new URL("../app/(product)/app/settings/billing/page.tsx", import.meta.url), "utf8");
  assert.equal(source.includes("/api/paddle/checkout"), true);
  assert.equal(source.includes("router.refresh()"), true);
  assert.equal(source.includes("quotaBytes"), true);
  assert.equal(source.includes("statusFacts"), true);
  assert.equal(page.includes("getStorageQuota"), true);
  assert.equal(page.includes("hasProEntitlement"), true);
  assert.equal(page.includes('dynamic = "force-dynamic"'), true);
  assert.equal(source.includes("#b7ff2a"), false);
});
