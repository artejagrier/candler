import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { vaultSaveError, vaultSecretDisplayName, vaultUserError } from "../lib/vault/client-copy";
import { detectService } from "../lib/vault/env-import";
import {
  COMMON_PROVIDER_EXAMPLES,
  SECRET_TYPE_HELP,
  SECRET_TYPES,
  parseCreateSecretInput,
  serviceProviderForName,
} from "../lib/vault/secret-types";

const addDialog = readFileSync(new URL("../components/vault/AddSecretDialog.tsx", import.meta.url), "utf8");
const vaultClient = readFileSync(new URL("../components/vault/VaultClient.tsx", import.meta.url), "utf8");
const actions = readFileSync(new URL("../lib/product/actions.ts", import.meta.url), "utf8");
const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const tour = readFileSync(new URL("../components/workspace/CandlerTour.tsx", import.meta.url), "utf8");
const create = actions.slice(actions.indexOf("export async function createSecretAction"), actions.indexOf("export async function updateSecretAction"));

const SAMPLE_ID = "11111111-1111-4111-8111-111111111111";
const PROJECT = "22222222-2222-4222-8222-222222222222";
const ENVIRONMENT = "33333333-3333-4333-8333-333333333333";

test("empty environmentId does not fail create parsing", () => {
  const parsed = parseCreateSecretInput({
    projectId: PROJECT,
    environmentId: "",
    serviceName: "OpenAI",
    name: "OPENAI_API_KEY",
    label: "OpenAI Production API Key",
    value: "sk-proj-example-not-real",
    secretType: "api_key",
    notes: "",
  });
  assert.equal(parsed.environmentId, null);
  assert.equal(parsed.name, "OPENAI_API_KEY");
  assert.equal(parsed.label, "OpenAI Production API Key");
  assert.equal(parsed.secretType, "api_key");
});

test("create parsing accepts every recommended secret type", () => {
  for (const type of SECRET_TYPES) {
    const parsed = parseCreateSecretInput({
      projectId: PROJECT,
      environmentId: ENVIRONMENT,
      serviceName: SECRET_TYPE_HELP[type.id].provider,
      name: SECRET_TYPE_HELP[type.id].keyExample,
      value: "example-secret-value",
      secretType: type.id,
    });
    assert.equal(parsed.secretType, type.id);
    assert.equal(parsed.environmentId, ENVIRONMENT);
  }
});

test("Paddle maps to custom provider so services CHECK still holds", () => {
  assert.equal(serviceProviderForName("Paddle"), "custom");
  assert.equal(serviceProviderForName("OpenAI"), "openai");
  assert.equal(serviceProviderForName("Cloudflare R2"), "cloudflare");
  assert.equal(detectService("PADDLE_WEBHOOK_SECRET"), "Paddle");
});

test("create save errors stay sanitized and are not access-denial copy", () => {
  assert.equal(vaultSaveError("Environment not found."), "Choose a valid environment before saving.");
  assert.equal(vaultSaveError("Project not found."), "Choose a project before saving.");
  assert.equal(vaultSaveError("Workspace unavailable."), "Workspace unavailable.");
  assert.equal(vaultSaveError("ciphertext=abc sql supabase token"), "Couldn't save this secret. Please try again.");
  assert.equal(vaultSaveError(`{"code":"invalid_format"}`.repeat(8)), "Couldn't save this secret. Please try again.");
  assert.notEqual(vaultSaveError("Environment not found."), "You do not have access to this secret.");
  assert.equal(vaultUserError("Unable to reveal secret.", "Secret not found."), "You do not have access to this secret.");
});

test("Add Secret teaches key vs value, types, providers, and masked input", () => {
  assert.equal(SECRET_TYPES.length, 8);
  assert.equal(addDialog.includes("Secret Type"), true);
  assert.equal(addDialog.includes("Give this secret a name you’ll recognize."), true);
  assert.equal(addDialog.includes("Key / Variable Name"), true);
  assert.equal(addDialog.includes("Paste the actual key, token, password, or secret here."), true);
  assert.equal(addDialog.includes("From your .env"), true);
  assert.equal(addDialog.includes("The left side of"), true);
  assert.equal(addDialog.includes("Common examples"), true);
  assert.equal(SECRET_TYPE_HELP.api_key.keyExample, "OPENAI_API_KEY");
  assert.equal(SECRET_TYPE_HELP.env_var.keyExample, "NEXT_PUBLIC_SUPABASE_URL");
  assert.equal(SECRET_TYPE_HELP.webhook.keyExample, "PADDLE_WEBHOOK_SECRET");
  assert.equal(addDialog.includes("help.keyExample"), true);
  assert.equal(addDialog.includes('type={showValue ? "text" : "password"}'), true);
  assert.equal(addDialog.includes("Save Secret"), true);
  assert.equal(addDialog.includes("sk-live"), false);
  assert.equal(SECRET_TYPE_HELP.webhook.valuePlaceholder.includes("whsec_"), true);
  assert.equal(COMMON_PROVIDER_EXAMPLES.some((item) => item.provider === "Paddle"), true);
  assert.equal(vaultSecretDisplayName({ name: "OPENAI_API_KEY", tags: ["OpenAI Production API Key"] }), "OpenAI Production API Key");
});

test("create path encrypts, does not require Vault Phrase, and does not fail on audit", () => {
  assert.equal(create.includes("encryptedColumns(input.value)"), true);
  assert.equal(create.includes("authorizeVaultSecretAccess"), false);
  assert.equal(create.includes("vaultSaveError"), true);
  assert.equal(create.includes("Secret already persisted"), true);
  assert.equal(actions.includes("plaintext"), false);
  assert.match(create, /ciphertext|encryptedColumns/);
});

test("Import and Windows click contracts remain intact", () => {
  assert.equal(vaultClient.includes("SmartImportDialog"), true);
  assert.equal(vaultClient.includes("openSmartImport"), true);
  assert.equal(vaultClient.includes("importEnvAction"), true);
  assert.equal(css.includes(".tour-scrim{") || css.includes(".tour-scrim{position:fixed"), true);
  assert.equal(css.includes("pointer-events:none"), true);
  assert.equal(css.includes(".vault-toolbar .primary-button"), true);
  assert.equal(tour.includes("pointer-events:none") || css.includes(".tour-scrim{position:fixed;inset:0"), true);
  assert.equal(SAMPLE_ID.length, 36);
});
