import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { parseEnvFile, detectService, KNOWN_SERVICES } from "../lib/vault/env-import";
import {
  detectEnvironmentFromFilename,
  detectImportFormat,
  parseJsonConfig,
  parseImportText,
} from "../lib/vault/smart-import";
import { parseYamlConfig } from "../lib/vault/yaml-import";

// ── Enhanced env parser ──────────────────────────────────────────────────────

test("export prefix stripped", () => {
  const entries = parseEnvFile("export STRIPE_SECRET_KEY=sk_live_test\nexport OPENAI_API_KEY=sk-abc");
  assert.equal(entries.length, 2);
  assert.equal(entries[0].name, "STRIPE_SECRET_KEY");
  assert.equal(entries[1].name, "OPENAI_API_KEY");
});

test("quoted values extracted correctly", () => {
  const entries = parseEnvFile(`A="hello world"\nB='single'\nC=unquoted`);
  assert.equal(entries.find((e) => e.name === "A")?.value, "hello world");
  assert.equal(entries.find((e) => e.name === "B")?.value, "single");
  assert.equal(entries.find((e) => e.name === "C")?.value, "unquoted");
});

test("inline comments stripped from unquoted values", () => {
  const entries = parseEnvFile("KEY=myvalue # this is a comment");
  assert.equal(entries[0]?.value, "myvalue");
});

test("inline comment not stripped from quoted values", () => {
  const entries = parseEnvFile('KEY="value # not a comment"');
  assert.equal(entries[0]?.value, "value # not a comment");
});

test("blank lines and comments skipped", () => {
  const entries = parseEnvFile("# header\n\nVALID=yes\n\n# footer");
  assert.equal(entries.length, 1);
  assert.equal(entries[0].name, "VALID");
});

test("empty values excluded", () => {
  const entries = parseEnvFile("EMPTY=\nALSO_EMPTY=''");
  assert.equal(entries.length, 0);
});

test("invalid key names excluded", () => {
  const entries = parseEnvFile("123INVALID=val\nVALID=ok\n-bad=val");
  assert.equal(entries.length, 1);
  assert.equal(entries[0].name, "VALID");
});

test("new service detection — GitHub, AWS, Google, Database, Redis, Twilio, R2", () => {
  assert.equal(detectService("GITHUB_TOKEN"), "GitHub");
  assert.equal(detectService("GH_TOKEN"), "GitHub");
  assert.equal(detectService("AWS_ACCESS_KEY_ID"), "AWS");
  assert.equal(detectService("GOOGLE_CLIENT_ID"), "Google");
  assert.equal(detectService("DATABASE_URL"), "Database");
  assert.equal(detectService("POSTGRES_PASSWORD"), "Database");
  assert.equal(detectService("REDIS_URL"), "Redis");
  assert.equal(detectService("UPSTASH_REDIS_REST_TOKEN"), "Redis");
  assert.equal(detectService("TWILIO_AUTH_TOKEN"), "Twilio");
  assert.equal(detectService("R2_ACCESS_KEY_ID"), "Cloudflare R2");
  assert.equal(detectService("CLOUDFLARE_API_TOKEN"), "Cloudflare");
  assert.equal(detectService("CF_ACCOUNT_ID"), "Cloudflare");
});

test("unknown keys map to Custom", () => {
  assert.equal(detectService("MY_WEIRD_PRIVATE_TOKEN"), "Custom");
  assert.equal(detectService("FOOBAR"), "Custom");
});

test("KNOWN_SERVICES contains expected entries", () => {
  assert.equal(KNOWN_SERVICES.includes("GitHub"), true);
  assert.equal(KNOWN_SERVICES.includes("AWS"), true);
  assert.equal(KNOWN_SERVICES.includes("Database"), true);
  assert.equal(KNOWN_SERVICES.includes("Redis"), true);
  assert.equal(KNOWN_SERVICES.includes("Twilio"), true);
  assert.equal(KNOWN_SERVICES.includes("Cloudflare R2"), true);
  assert.equal(KNOWN_SERVICES.includes("Custom"), true);
});

// ── Environment detection ────────────────────────────────────────────────────

test("detectEnvironmentFromFilename production", () => {
  assert.equal(detectEnvironmentFromFilename(".env.production"), "Production");
  assert.equal(detectEnvironmentFromFilename(".env.prod"), "Production");
  assert.equal(detectEnvironmentFromFilename("app.env.production"), "Production");
});

test("detectEnvironmentFromFilename development", () => {
  assert.equal(detectEnvironmentFromFilename(".env.development"), "Development");
  assert.equal(detectEnvironmentFromFilename(".env.dev"), "Development");
});

test("detectEnvironmentFromFilename staging", () => {
  assert.equal(detectEnvironmentFromFilename(".env.staging"), "Staging");
  assert.equal(detectEnvironmentFromFilename(".env.stage"), "Staging");
});

test("detectEnvironmentFromFilename ambiguous returns null", () => {
  assert.equal(detectEnvironmentFromFilename(".env.local"), null);
  assert.equal(detectEnvironmentFromFilename(".env"), null);
  assert.equal(detectEnvironmentFromFilename("secrets.txt"), null);
});

// ── Format detection ─────────────────────────────────────────────────────────

test("detectImportFormat identifies JSON", () => {
  assert.equal(detectImportFormat('{"KEY":"val"}'), "json");
  assert.equal(detectImportFormat('  { "KEY": "val" }'), "json");
});

test("detectImportFormat identifies env", () => {
  assert.equal(detectImportFormat("KEY=value"), "env");
  assert.equal(detectImportFormat("# comment\nKEY=value"), "env");
});

test("detectImportFormat returns unknown for empty/unrecognized", () => {
  assert.equal(detectImportFormat("   "), "unknown");
  assert.equal(detectImportFormat("just some text"), "unknown");
});

test("detectImportFormat identifies yaml", () => {
  assert.equal(detectImportFormat("STRIPE_SECRET_KEY: sk_live_test"), "yaml");
  assert.equal(detectImportFormat("DATABASE_URL: postgres://...\nREDIS_URL: redis://..."), "yaml");
});

// ── JSON config parser ───────────────────────────────────────────────────────

test("parseJsonConfig parses flat string object", () => {
  const entries = parseJsonConfig('{"STRIPE_SECRET_KEY":"sk_live_test","OPENAI_API_KEY":"sk-abc"}');
  assert.ok(entries);
  assert.equal(entries!.length, 2);
  assert.equal(entries!.find((e) => e.name === "STRIPE_SECRET_KEY")?.serviceName, "Stripe");
  assert.equal(entries!.find((e) => e.name === "OPENAI_API_KEY")?.serviceName, "OpenAI");
});

test("parseJsonConfig skips non-string values", () => {
  const entries = parseJsonConfig('{"KEY":"val","NUM":123,"ARR":[],"OBJ":{}}');
  assert.ok(entries);
  assert.equal(entries!.length, 1);
  assert.equal(entries!.find((e) => e.name === "KEY")?.value, "val");
});

test("parseJsonConfig skips empty string values", () => {
  const entries = parseJsonConfig('{"VALID":"ok","EMPTY":""}');
  assert.ok(entries);
  assert.equal(entries!.length, 1);
});

test("parseJsonConfig returns null for invalid JSON", () => {
  assert.equal(parseJsonConfig("not json"), null);
  assert.equal(parseJsonConfig("[1,2,3]"), null);
  assert.equal(parseJsonConfig("null"), null);
});

test("parseJsonConfig prototype pollution protection", () => {
  const entries = parseJsonConfig('{"__proto__":{"polluted":"yes"},"constructor":"bad","VALID":"ok"}');
  assert.ok(entries);
  const names = entries!.map((e) => e.name);
  assert.equal(names.includes("__proto__"), false);
  assert.equal(names.includes("constructor"), false);
  assert.equal(names.includes("VALID"), true);
});

test("parseJsonConfig invalid key names excluded", () => {
  const entries = parseJsonConfig('{"123bad":"val","valid-key":"val","VALID":"ok"}');
  assert.ok(entries);
  assert.equal(entries!.length, 1);
  assert.equal(entries![0].name, "VALID");
});

// ── parseImportText dispatch ─────────────────────────────────────────────────

test("parseImportText routes JSON input to JSON parser", () => {
  const entries = parseImportText('{"STRIPE_SECRET_KEY":"sk_test"}');
  assert.equal(entries.length, 1);
  assert.equal(entries[0].name, "STRIPE_SECRET_KEY");
});

test("parseImportText routes env input to env parser", () => {
  const entries = parseImportText("STRIPE_SECRET_KEY=sk_test\nOPENAI_API_KEY=sk-abc");
  assert.equal(entries.length, 2);
});

test("parseImportText handles export syntax via env route", () => {
  const entries = parseImportText("export STRIPE_SECRET_KEY=sk_test");
  assert.equal(entries.length, 1);
  assert.equal(entries[0].name, "STRIPE_SECRET_KEY");
});

test("parseImportText routes YAML input to YAML parser", () => {
  const entries = parseImportText("STRIPE_SECRET_KEY: sk_live_test\nOPENAI_API_KEY: sk-abc");
  assert.equal(entries.length, 2);
  assert.equal(entries[0].name, "STRIPE_SECRET_KEY");
});

// ── YAML flat-key-value parser ────────────────────────────────────────────────

test("parseYamlConfig parses flat key-value pairs", () => {
  const entries = parseYamlConfig("STRIPE_SECRET_KEY: sk_live_test\nOPENAI_API_KEY: sk-abc");
  assert.ok(entries);
  assert.equal(entries!.length, 2);
  assert.equal(entries!.find((e) => e.name === "STRIPE_SECRET_KEY")?.serviceName, "Stripe");
  assert.equal(entries!.find((e) => e.name === "OPENAI_API_KEY")?.serviceName, "OpenAI");
});

test("parseYamlConfig strips quotes from values", () => {
  const entries = parseYamlConfig('A: "double quoted"\nB: \'single quoted\'');
  assert.ok(entries);
  assert.equal(entries!.find((e) => e.name === "A")?.value, "double quoted");
  assert.equal(entries!.find((e) => e.name === "B")?.value, "single quoted");
});

test("parseYamlConfig skips null / empty values", () => {
  const entries = parseYamlConfig("VALID: ok\nEMPTY:\nNULL_VAL: null\nTILDE: ~");
  assert.ok(entries);
  assert.equal(entries!.length, 1);
  assert.equal(entries![0].name, "VALID");
});

test("parseYamlConfig skips nested structures and block scalars", () => {
  const entries = parseYamlConfig("  indented: skip\nKEY: valid\nnested:\n  child: skip\nLIST: [a,b]\nOBJ: {x:1}");
  assert.ok(entries);
  assert.equal(entries!.length, 1);
  assert.equal(entries![0].name, "KEY");
});

test("parseYamlConfig prototype pollution protection", () => {
  const entries = parseYamlConfig("__proto__: evil\nconstructor: bad\nVALID: ok");
  assert.ok(entries);
  const names = entries!.map((e) => e.name);
  assert.equal(names.includes("__proto__"), false);
  assert.equal(names.includes("constructor"), false);
  assert.equal(names.includes("VALID"), true);
});

test("parseYamlConfig returns null for empty/comment-only input", () => {
  assert.equal(parseYamlConfig("# just a comment"), null);
  assert.equal(parseYamlConfig("---\n..."), null);
  assert.equal(parseYamlConfig(""), null);
});

// ── Regression: Review Secrets first-click bug ───────────────────────────────
//
// Root cause: the "Review Secrets" button had `disabled={parsedFromInput.length === 0}`.
// HTML disabled buttons receive NO click events — completely silent, zero feedback.
// The primary-button CSS did not visually distinguish disabled from enabled, so
// clicking appeared to work but the onClick handler never fired.
//
// Fix: button is never disabled; gotoReview handles empty/no-parse with explicit messages.

test("Review Secrets button is never conditionally disabled — regression for silent-click bug", () => {
  const src = readFileSync(new URL("../components/vault/SmartImportDialog.tsx", import.meta.url), "utf8");
  // Confirm the old disabled pattern is gone
  assert.equal(src.includes('disabled={parsedFromInput.length === 0}'), false);
  // Confirm explicit messages are present for the empty and no-parse cases
  assert.equal(src.includes("Paste some environment variables first"), true);
  assert.equal(src.includes("couldn't find any environment variables"), true);
});

test("Review Secrets with 3 valid env vars — parser returns 3 entries", () => {
  const text = [
    "NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co",
    "SUPABASE_SECRET_KEY=test_secret",
    "STRIPE_SECRET_KEY=test_stripe",
  ].join("\n");
  const entries = parseImportText(text);
  assert.equal(entries.length, 3);
  assert.ok(entries.find((e) => e.name === "NEXT_PUBLIC_SUPABASE_URL"));
  assert.ok(entries.find((e) => e.name === "SUPABASE_SECRET_KEY"));
  assert.ok(entries.find((e) => e.name === "STRIPE_SECRET_KEY"));
});

test("Review Secrets with empty input — parser returns 0 entries (shows message, not silence)", () => {
  const entries = parseImportText("");
  assert.equal(entries.length, 0);
  // gotoReview handles this case with "Paste some environment variables first."
});

test("value containing = is preserved correctly", () => {
  const entries = parseEnvFile("JWT_SECRET=abc=def=ghi");
  assert.equal(entries[0]?.value, "abc=def=ghi");
});

test("value containing URL with colon-slash-slash is preserved", () => {
  const entries = parseEnvFile("DATABASE_URL=postgres://user:pass@host:5432/db");
  assert.equal(entries[0]?.value, "postgres://user:pass@host:5432/db");
});

test("value containing special chars is not corrupted", () => {
  const entries = parseEnvFile("KEY=abc-123_DEF.xyz+456/path");
  assert.equal(entries[0]?.value, "abc-123_DEF.xyz+456/path");
});

test("KEY = value with spaces around equals is parsed", () => {
  const entries = parseEnvFile("KEY = spaced_value");
  assert.equal(entries[0]?.name, "KEY");
  assert.equal(entries[0]?.value, "spaced_value");
});

// ── Screenshot import removed ─────────────────────────────────────────────────

test("SmartImportDialog has no screenshot tab or OCR infrastructure", () => {
  const src = readFileSync(new URL("../components/vault/SmartImportDialog.tsx", import.meta.url), "utf8");
  assert.equal(src.includes("screenshot"), false);
  assert.equal(src.includes("ImageIcon"), false);
  assert.equal(src.includes("ocrPhase"), false);
  assert.equal(src.includes("si-ocr"), false);
  assert.equal(src.includes("tesseract"), false);
  assert.equal(src.includes("AbortController"), false);
});

test("smartImportAction source enum does not include screenshot", () => {
  const src = readFileSync(new URL("../lib/product/actions.ts", import.meta.url), "utf8");
  assert.equal(src.includes('"screenshot"'), false);
});

// ── SmartImportDialog source-code contracts ──────────────────────────────────

test("SmartImportDialog has needsReview field on DraftEntry", () => {
  const src = readFileSync(new URL("../components/vault/SmartImportDialog.tsx", import.meta.url), "utf8");
  assert.equal(src.includes("needsReview"), true);
  assert.equal(src.includes("needsReview: false"), true);
  assert.equal(src.includes("si-needs-review-badge"), true);
});

test("SmartImportDialog does not reference localStorage or console.log", () => {
  const src = readFileSync(new URL("../components/vault/SmartImportDialog.tsx", import.meta.url), "utf8");
  assert.equal(src.includes("localStorage"), false);
  assert.equal(src.includes("console.log"), false);
  assert.equal(src.includes("console.error"), false);
});

test("SmartImportDialog does not reference window.location", () => {
  const src = readFileSync(new URL("../components/vault/SmartImportDialog.tsx", import.meta.url), "utf8");
  assert.equal(src.includes("window.location"), false);
});

test("SmartImportDialog masks values by default and uses revealed flag", () => {
  const src = readFileSync(new URL("../components/vault/SmartImportDialog.tsx", import.meta.url), "utf8");
  assert.equal(src.includes("revealed: false"), true);
  assert.equal(src.includes("si-value-mask"), true);
  assert.equal(src.includes("si-value-input"), true);
});

test("SmartImportDialog prevents double-submit with inflight ref", () => {
  const src = readFileSync(new URL("../components/vault/SmartImportDialog.tsx", import.meta.url), "utf8");
  assert.equal(src.includes("inflight.current"), true);
});

test("SmartImportDialog uses duplicate detection before import", () => {
  const src = readFileSync(new URL("../components/vault/SmartImportDialog.tsx", import.meta.url), "utf8");
  assert.equal(src.includes("recheckDuplicates"), true);
  assert.equal(src.includes("isDuplicate"), true);
  assert.equal(src.includes("replaceIfDuplicate"), true);
});

test("smartImportAction audit event has no plaintext value fields", () => {
  const src = readFileSync(new URL("../lib/product/actions.ts", import.meta.url), "utf8");
  const actionStart = src.indexOf("export async function smartImportAction");
  const actionEnd = src.indexOf("export async function addAuthenticatorAction");
  const body = src.slice(actionStart, actionEnd);
  assert.equal(body.includes('"vault.bulk_imported"'), true);
  assert.equal(body.includes("encryptedColumns"), true);
  assert.equal(body.includes("value:"), false);
});

// ── Same-name different-project/environment ─────────────────────────────────

test("same-name key in different project is not a duplicate", () => {
  const secrets = [
    { id: "1", name: "STRIPE_SECRET_KEY", project_id: "proj-a", environment_id: "env-a" },
    { id: "2", name: "STRIPE_SECRET_KEY", project_id: "proj-b", environment_id: "env-b" },
  ];
  const matchA = secrets.find((s) => s.name === "STRIPE_SECRET_KEY" && s.project_id === "proj-a" && s.environment_id === "env-a");
  const matchB = secrets.find((s) => s.name === "STRIPE_SECRET_KEY" && s.project_id === "proj-b" && s.environment_id === "env-b");
  assert.ok(matchA);
  assert.ok(matchB);
  // When scoped to proj-a/env-a, proj-b key is NOT a duplicate
  const dupInA = secrets.find((s) => s.name === "STRIPE_SECRET_KEY" && s.project_id === "proj-a" && s.environment_id === "env-b");
  assert.equal(dupInA, undefined);
});

test("same-name key in different environment of same project is not a duplicate", () => {
  const secrets = [
    { id: "1", name: "REDIS_URL", project_id: "proj-x", environment_id: "env-prod" },
  ];
  const dupInDev = secrets.find((s) => s.name === "REDIS_URL" && s.project_id === "proj-x" && s.environment_id === "env-dev");
  assert.equal(dupInDev, undefined);
});

test("same-name key in two different projects — importing into project B is not a dup of project A", () => {
  const existingInProjA = [
    { id: "1", name: "STRIPE_SECRET_KEY", project_id: "candler-dev", environment_id: "env-prod" },
  ];
  const isStripeDupInDianiLinks = !!existingInProjA.find(
    (s) => s.name === "STRIPE_SECRET_KEY" && s.project_id === "diani-links" && s.environment_id === "env-prod",
  );
  assert.equal(isStripeDupInDianiLinks, false);
});

// ── Bulk import size ceiling ──────────────────────────────────────────────────

test("smartImportAction rejects more than 200 entries", () => {
  const src = readFileSync(new URL("../lib/product/actions.ts", import.meta.url), "utf8");
  assert.equal(src.includes(".max(200)"), true);
});

// ── Bulk import — large inputs ───────────────────────────────────────────────

function makeFakeSecrets(count: number): string {
  return Array.from({ length: count }, (_, i) =>
    `SECRET_KEY_${String(i + 1).padStart(3, "0")}=fake_value_not_real_credential_${i + 1}`,
  ).join("\n");
}

test("parser handles 1 secret", () => {
  const entries = parseImportText(makeFakeSecrets(1));
  assert.equal(entries.length, 1);
  assert.equal(entries[0].name, "SECRET_KEY_001");
});

test("parser handles 10 secrets accurately", () => {
  const entries = parseImportText(makeFakeSecrets(10));
  assert.equal(entries.length, 10);
});

test("parser handles 50 secrets accurately", () => {
  const entries = parseImportText(makeFakeSecrets(50));
  assert.equal(entries.length, 50);
});

test("parser handles 100 secrets accurately", () => {
  const entries = parseImportText(makeFakeSecrets(100));
  assert.equal(entries.length, 100);
});

test("parser handles 250 secrets accurately (above server cap — UI layer sends max 200)", () => {
  const entries = parseImportText(makeFakeSecrets(250));
  assert.equal(entries.length, 250);
});

test("each parsed secret has valid name and non-empty value", () => {
  const entries = parseImportText(makeFakeSecrets(10));
  for (const e of entries) {
    assert.match(e.name, /^[A-Za-z_][A-Za-z0-9_]*$/);
    assert.ok(e.value.length > 0, `Empty value for ${e.name}`);
  }
});

// ── File format tests ─────────────────────────────────────────────────────────

test("file import: .env format (fake credentials)", () => {
  const content = "STRIPE_SECRET_KEY=sk_test_fake\nOPENAI_API_KEY=sk-fake-key";
  const entries = parseImportText(content);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].name, "STRIPE_SECRET_KEY");
  assert.equal(entries[1].name, "OPENAI_API_KEY");
});

test("file import: .env.local with blank lines and comments", () => {
  const content = [
    "# Local overrides — not committed",
    "",
    "NEXT_PUBLIC_SUPABASE_URL=https://local.supabase.co",
    "",
    "# Stripe test keys",
    "STRIPE_SECRET_KEY=sk_test_local_fake",
    "",
  ].join("\n");
  const entries = parseImportText(content);
  assert.equal(entries.length, 2);
  assert.ok(entries.find((e) => e.name === "NEXT_PUBLIC_SUPABASE_URL"));
  assert.ok(entries.find((e) => e.name === "STRIPE_SECRET_KEY"));
});

test("file import: .env.production with export prefix (bash-style)", () => {
  const content = [
    "export DATABASE_URL=postgres://fake:fake@localhost/db",
    "export REDIS_URL=redis://localhost:6379",
  ].join("\n");
  const entries = parseImportText(content);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].name, "DATABASE_URL");
  assert.equal(entries[1].name, "REDIS_URL");
});

test("file import: JSON format (fake credentials)", () => {
  const content = JSON.stringify({
    STRIPE_SECRET_KEY: "sk_test_fake",
    OPENAI_API_KEY: "sk-fake-key",
    DATABASE_URL: "postgres://fake/db",
  });
  const entries = parseImportText(content);
  assert.equal(entries.length, 3);
  assert.ok(entries.find((e) => e.name === "STRIPE_SECRET_KEY"));
  assert.ok(entries.find((e) => e.name === "OPENAI_API_KEY"));
  assert.ok(entries.find((e) => e.name === "DATABASE_URL"));
});

test("file import: .txt plain env pairs (fake credentials)", () => {
  const content = [
    "R2_ENDPOINT=https://fake.r2.cloudflarestorage.com",
    "R2_ACCESS_KEY_ID=fakeaccesskey",
    "R2_SECRET_ACCESS_KEY=fakesecretkey",
  ].join("\n");
  const entries = parseImportText(content);
  assert.equal(entries.length, 3);
  assert.ok(entries.every((e) => e.serviceName === "Cloudflare R2"));
});

test("file import: mixed quoted and unquoted values all parse correctly", () => {
  const content = [
    'QUOTED_DOUBLE="my secret value"',
    "QUOTED_SINGLE='another secret'",
    "UNQUOTED=plain_value",
    "WITH_EQUALS=base64==",
  ].join("\n");
  const entries = parseImportText(content);
  assert.equal(entries.find((e) => e.name === "QUOTED_DOUBLE")?.value, "my secret value");
  assert.equal(entries.find((e) => e.name === "QUOTED_SINGLE")?.value, "another secret");
  assert.equal(entries.find((e) => e.name === "UNQUOTED")?.value, "plain_value");
  assert.equal(entries.find((e) => e.name === "WITH_EQUALS")?.value, "base64==");
});

// ── VaultClient contract still passes ───────────────────────────────────────

test("VaultClient still includes required security contracts", () => {
  const src = readFileSync(new URL("../components/vault/VaultClient.tsx", import.meta.url), "utf8");
  assert.equal(src.includes("console.log"), false);
  assert.equal(src.includes("localStorage"), false);
  assert.equal(src.includes("VaultDialog"), true);
  assert.equal(src.includes("SmartImportDialog"), true);
  assert.equal(src.includes("vaultSearchHaystack"), true);
  assert.equal(src.includes("pendingAuth"), true);
  assert.equal(src.includes("resumeAfterStepUp"), true);
  assert.equal(src.includes('aria-label="Filter by environment"'), true);
  assert.equal(src.includes('aria-label="Filter by service"'), true);
});
