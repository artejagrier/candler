import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { vaultSearchHaystack, vaultUserError } from "../lib/vault/client-copy";

const vaultClient = readFileSync(new URL("../components/vault/VaultClient.tsx", import.meta.url), "utf8");
const vaultDialog = readFileSync(new URL("../components/vault/VaultDialog.tsx", import.meta.url), "utf8");
const stepUp = readFileSync(new URL("../components/product/StepUpDialog.tsx", import.meta.url), "utf8");
const actions = readFileSync(new URL("../lib/product/actions.ts", import.meta.url), "utf8");
const reveal = readFileSync(new URL("../app/api/vault/secrets/[id]/reveal/route.ts", import.meta.url), "utf8");
const queries = readFileSync(new URL("../lib/data/queries.ts", import.meta.url), "utf8");
const dialogA11y = readFileSync(new URL("../hooks/useDialogA11y.ts", import.meta.url), "utf8");

test("Vault search haystack is metadata-only", () => {
  const hay = vaultSearchHaystack({
    name: "STRIPE_SECRET_KEY",
    notes: "sk_live_should_not_match",
    services: { name: "Stripe" },
    projects: { name: "Checkout" },
    environments: { name: "Production" },
  });
  assert.equal(hay.includes("stripe_secret_key"), true);
  assert.equal(hay.includes("stripe"), true);
  assert.equal(hay.includes("checkout"), true);
  assert.equal(hay.includes("production"), true);
  assert.equal(hay.includes("sk_live_should_not_match"), false);
});

test("Vault user errors never echo ciphertext or internals", () => {
  assert.equal(vaultUserError("Unable to reveal secret.", undefined, 401), "Authentication required.");
  assert.equal(vaultUserError("Unable to reveal secret.", undefined, 404), "You do not have access to this secret.");
  assert.equal(vaultUserError("Unable to reveal secret.", "Secret could not be decrypted."), "Secret could not be decrypted.");
  assert.equal(
    vaultUserError("Unable to save secret.", "ciphertext=abc sql supabase token"),
    "Unable to save secret.",
  );
});

test("Vault client first-click contracts", () => {
  assert.equal(vaultClient.includes("confirm("), false);
  assert.equal(vaultClient.includes("prompt("), false);
  assert.equal(vaultClient.includes("useTransition"), false);
  assert.equal(vaultClient.includes("pendingAuth"), true);
  assert.equal(vaultClient.includes('pending.intent === "copy"'), true);
  assert.equal(vaultClient.includes("resumeAfterStepUp"), true);
  assert.equal(vaultClient.includes("Saving…"), true);
  assert.equal(vaultClient.includes("Updating…"), true);
  assert.equal(vaultClient.includes("Deleting…"), true);
  assert.equal(vaultClient.includes("Revealing…"), true);
  assert.equal(vaultClient.includes("Copied"), true);
  assert.equal(vaultClient.includes('aria-label="Filter by environment"'), true);
  assert.equal(vaultClient.includes('aria-label="Filter by service"'), true);
  assert.equal(vaultClient.includes("localStorage"), false);
  assert.equal(vaultClient.includes("console.log"), false);
  assert.equal(vaultClient.includes("VaultDialog"), true);
  assert.equal(vaultClient.includes("vaultSearchHaystack"), true);
});

test("Vault dialogs portal with scrim, escape, and z-modal classes", () => {
  assert.equal(vaultDialog.includes("createPortal"), true);
  assert.equal(vaultDialog.includes("modal-scrim"), true);
  assert.equal(vaultDialog.includes("useDialogA11y"), true);
  assert.equal(vaultDialog.includes("preventClose"), true);
  assert.equal(stepUp.includes("Confirming…"), true);
  assert.equal(stepUp.includes("submitting.current"), true);
  assert.equal(dialogA11y.includes("onCloseRef"), true);
});

test("create/update persist ciphertext via encryptSecret and never a plaintext column", () => {
  const create = actions.slice(actions.indexOf("export async function createSecretAction"), actions.indexOf("export async function updateSecretAction"));
  const update = actions.slice(actions.indexOf("export async function updateSecretAction"), actions.indexOf("export async function deleteSecretAction"));
  assert.equal(create.includes("encryptedColumns(input.value)"), true);
  assert.equal(create.includes("plaintext"), false);
  assert.equal(create.includes("eventType:\"secret.created\""), true);
  assert.equal(update.includes('eventType:input.value?"secret.rotated":"secret.updated"'), true);
  assert.equal(update.includes("encryptedColumns(input.value)"), true);
  assert.equal(actions.includes("eventType:\"secret.deleted\""), true);
});

test("reveal is owner- and workspace-scoped, step-up gated, and not cached", () => {
  assert.equal(reveal.includes("hasRecentAuthentication"), true);
  assert.equal(reveal.includes("REAUTH_REQUIRED"), true);
  assert.equal(reveal.includes('.eq("workspace_id", context.workspaceId)'), true);
  assert.equal(reveal.includes('.eq("owner_id", context.userId)'), true);
  assert.equal(reveal.includes("decryptSecret"), true);
  assert.equal(reveal.includes('eventType: "secret.revealed"'), true);
  assert.equal(reveal.includes("no-store"), true);
  assert.equal(reveal.includes("Secret could not be decrypted."), true);
});

test("vault list query does not select ciphertext or plaintext value", () => {
  assert.match(queries, /from\("secrets"\)\.select\("id,name,project_id/);
  assert.equal(queries.includes("ciphertext"), false);
  assert.equal(queries.includes(",value,"), false);
});
