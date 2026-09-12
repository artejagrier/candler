import assert from "node:assert/strict";
import test from "node:test";
import { getProjectSecretsMetadata } from "../lib/agent/context";
import { deriveHealthFindings, healthScore } from "../lib/health/findings";

const now = new Date("2026-09-01T12:00:00Z");

type Fixture = {
  id: string;
  name: string;
  service?: string | null;
  environment?: string | null;
  createdAt?: string;
  expiresAt?: string | null;
  rotationDueAt?: string | null;
  projectId?: string | null;
  serviceId?: string | null;
  environmentId?: string | null;
  lastAccessedAt?: string | null;
};

function record(partial: Fixture) {
  const createdAt = partial.createdAt ?? "2026-08-01T00:00:00Z";
  const expiresAt = partial.expiresAt ?? null;
  const rotationDueAt = partial.rotationDueAt ?? null;
  const metadata = getProjectSecretsMetadata([{
    id: partial.id,
    name: partial.name,
    service: partial.service ?? "Stripe",
    environment: partial.environment ?? "production",
    createdAt,
    expiresAt,
    rotationDueAt,
  }], now)[0];
  return {
    ...metadata,
    projectId: partial.projectId === undefined ? "p1" : partial.projectId,
    serviceId: partial.serviceId === undefined ? "s1" : partial.serviceId,
    environmentId: partial.environmentId ?? "e1",
    lastAccessedAt: partial.lastAccessedAt ?? null,
    expiresAt,
  };
}

test("duplicate names in the same service and environment are flagged", () => {
  const findings = deriveHealthFindings([
    record({ id: "1", name: "STRIPE_SECRET_KEY", environmentId: "prod" }),
    record({ id: "2", name: "STRIPE_SECRET_KEY", environmentId: "prod" }),
  ], now);
  assert.equal(findings.some((finding) => finding.code === "duplicate"), true);
});

test("expiration approaching and passed are distinct findings", () => {
  const findings = deriveHealthFindings([
    record({ id: "1", name: "SOON", expiresAt: "2026-09-08T00:00:00Z" }),
    record({ id: "2", name: "GONE", expiresAt: "2026-08-01T00:00:00Z" }),
  ], now);
  assert.equal(findings.some((finding) => finding.code === "expiring" && finding.secretId === "1"), true);
  assert.equal(findings.some((finding) => finding.code === "expired" && finding.secretId === "2"), true);
});

test("rotation interval exceeded is flagged from metadata", () => {
  const findings = deriveHealthFindings([
    record({ id: "1", name: "ROTATE_ME", rotationDueAt: "2026-08-01T00:00:00Z" }),
  ], now);
  assert.equal(findings.some((finding) => finding.code === "rotation_due"), true);
});

test("orphaned secrets without project or service assignment are flagged", () => {
  const findings = deriveHealthFindings([
    record({ id: "1", name: "ORPHAN", projectId: null, serviceId: null }),
  ], now);
  assert.equal(findings.some((finding) => finding.code === "orphaned"), true);
});

test("unused credentials use last access or age", () => {
  const findings = deriveHealthFindings([
    record({ id: "1", name: "OLD", createdAt: "2025-01-01T00:00:00Z", lastAccessedAt: null }),
  ], now);
  assert.equal(findings.some((finding) => finding.code === "unused"), true);
});

test("missing environment counterparts are flagged when comparison is possible", () => {
  const findings = deriveHealthFindings([
    record({ id: "1", name: "API_KEY", environment: "preview", environmentId: "preview" }),
    record({ id: "2", name: "OTHER_KEY", environment: "production", environmentId: "production" }),
  ], now);
  assert.equal(findings.some((finding) => finding.code === "missing_counterpart"), true);
});

test("health score is deterministic and never invents breaches", () => {
  const findings = deriveHealthFindings([
    record({ id: "1", name: "A", expiresAt: "2026-08-01T00:00:00Z" }),
    record({ id: "2", name: "B" }),
  ], now);
  assert.equal(healthScore(findings), healthScore(findings));
  assert.equal(findings.some((finding) => /breach|leak|compromise/i.test(finding.title)), false);
});
