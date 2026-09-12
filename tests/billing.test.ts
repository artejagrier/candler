import assert from "node:assert/strict";
import test from "node:test";
import { hasEntitlement, hasProEntitlement, highestCloudPlan, productFromPriceId, storageQuotaBytes } from "../lib/billing/entitlements";
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

test("price mapping never trusts an unknown Stripe price", () => {
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
