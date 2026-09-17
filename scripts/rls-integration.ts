import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const emailA = process.env.RLS_TEST_USER_A_EMAIL;
const passwordA = process.env.RLS_TEST_USER_A_PASSWORD;
const emailB = process.env.RLS_TEST_USER_B_EMAIL;
const passwordB = process.env.RLS_TEST_USER_B_PASSWORD;

if (!url || !key || !emailA || !passwordA || !emailB || !passwordB) {
  console.error("RLS integration requires Supabase URL/key and two dedicated test-user credentials.");
  process.exit(2);
}

const a = createClient(url, key);
const b = createClient(url, key);
const admin = secret ? createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } }) : null;

function assertMutationDenied(
  result: { data: unknown; error: { code?: string; message?: string } | null },
  message: string,
) {
  const rows = Array.isArray(result.data) ? result.data.length : 0;
  const privilegeDenied =
    result.error?.code === "42501" || /permission denied/i.test(result.error?.message ?? "");
  assert.equal(rows, 0, message);
  assert.ok(privilegeDenied || result.data !== null, message);
}

async function main() {
await a.auth.signInWithPassword({ email: emailA, password: passwordA });
await b.auth.signInWithPassword({ email: emailB, password: passwordB });
const userA = (await a.auth.getUser()).data.user;
const userB = (await b.auth.getUser()).data.user;
assert(userA && userB && userA.id !== userB.id);

const suffix = crypto.randomUUID().slice(0, 8);
const { data: workspace, error: workspaceError } = await a.from("workspaces").insert({
  name: `RLS ${suffix}`,
  owner_id: userA.id,
}).select("id").single();
assert.ifError(workspaceError);
assert(workspace);

try {
  await a.from("workspace_members").insert({ workspace_id: workspace.id, user_id: userA.id, role: "owner" });
  const { data: project } = await a.from("projects").insert({
    workspace_id: workspace.id,
    owner_id: userA.id,
    name: `Project ${suffix}`,
    slug: `project-${suffix}`,
  }).select("id").single();
  assert(project);
  const { data: env } = await a.from("environments").insert({
    workspace_id: workspace.id,
    project_id: project.id,
    name: "Production",
    kind: "production",
  }).select("id").single();
  const { data: service } = await a.from("services").insert({
    workspace_id: workspace.id,
    project_id: project.id,
    name: "Custom",
    provider: "custom",
  }).select("id").single();
  assert(env && service);

  await a.from("secrets").insert({
    workspace_id: workspace.id,
    owner_id: userA.id,
    project_id: project.id,
    environment_id: env.id,
    service_id: service.id,
    name: "RLS_TEST",
    ciphertext: "not-real",
    iv: "not-real",
    auth_tag: "not-real",
  });
  await a.from("authenticator_entries").insert({
    workspace_id: workspace.id,
    owner_id: userA.id,
    issuer: "RLS",
    account_name: "test",
    seed_ciphertext: "x",
    seed_iv: "x",
    seed_auth_tag: "x",
  });
  await a.from("recovery_code_sets").insert({
    workspace_id: workspace.id,
    owner_id: userA.id,
    service: "RLS",
    account_name: "test",
    codes_ciphertext: "x",
    codes_iv: "x",
    codes_auth_tag: "x",
    total_count: 1,
    remaining_count: 1,
  });
  await a.from("agent_conversations").insert({
    workspace_id: workspace.id,
    owner_id: userA.id,
    title: "RLS test",
  });

  const { data: clientCloudInsert, error: clientCloudError } = await a.from("cloud_files").insert({
    workspace_id: workspace.id,
    owner_id: userA.id,
    project_id: project.id,
    original_filename: "should-fail.txt",
    object_key: `${userA.id}/${workspace.id}/${crypto.randomUUID()}`,
    mime_type: "text/plain",
    size_bytes: 1,
    status: "backed_up",
  }).select("id");
  assert.equal(clientCloudInsert?.length ?? 0, 0, "Authenticated clients must not insert cloud_files directly");
  assert.ok(clientCloudError);

  if (admin) {
    await admin.from("cloud_files").insert({
      workspace_id: workspace.id,
      owner_id: userA.id,
      project_id: project.id,
      original_filename: "rls.txt",
      object_key: `${userA.id}/${workspace.id}/${crypto.randomUUID()}`,
      mime_type: "text/plain",
      size_bytes: 1,
      status: "backed_up",
    });
    await admin.from("subscriptions").insert({
      workspace_id: workspace.id,
      owner_id: userA.id,
      paddle_customer_id: `ctm_${suffix}`,
      product_key: "candler_pro",
      status: "active",
      storage_quota_bytes: 10737418240,
    });
    await admin.from("vault_recovery_phrases").insert({
      user_id: userA.id,
      phrase_hash: "a".repeat(64),
      salt: "b".repeat(32),
    });
  }

  for (const table of ["projects", "secrets", "authenticator_entries", "recovery_code_sets", "cloud_files", "agent_conversations", "audit_events", "subscriptions"]) {
    const result = await b.from(table).select("*").eq("workspace_id", workspace.id);
    assert.ifError(result.error);
    assert.equal(result.data?.length, 0, `User B read User A ${table}`);
  }

  const { data: secretReveal } = await b.from("secrets").select("ciphertext,iv,auth_tag").eq("workspace_id", workspace.id);
  assert.equal(secretReveal?.length, 0, "User B revealed User A ciphertext");

  const { data: authenticatorReveal } = await b.from("authenticator_entries").select("seed_ciphertext,seed_iv,seed_auth_tag").eq("workspace_id", workspace.id);
  assert.equal(authenticatorReveal?.length, 0, "User B revealed User A authenticator seed");

  const { data: authenticatorMutation } = await b.from("authenticator_entries").update({ issuer: "stolen" }).eq("workspace_id", workspace.id).select("id");
  assert.equal(authenticatorMutation?.length, 0, "User B mutated User A authenticator");

  const { data: mutation } = await b.from("projects").update({ name: "unauthorized" }).eq("id", project.id).select("id");
  assert.equal(mutation?.length, 0, "User B mutated User A project");

  const { data: billingMutation } = await b.from("subscriptions").update({ status: "active" }).eq("workspace_id", workspace.id).select("id");
  assert.equal(billingMutation?.length, 0, "User B mutated User A subscription");

  const { data: clientConsentInsert, error: clientConsentError } = await a.from("legal_consents").insert({
    user_id: userA.id,
    terms_version: `rls-${suffix}`,
    privacy_version: `rls-${suffix}`,
    consent_source: "signup",
  }).select("id");
  assert.equal(clientConsentInsert?.length ?? 0, 0, "Authenticated clients must not insert legal consents");
  assert.ok(clientConsentError);

  if (admin) {
    const { data: consentRow, error: consentInsertError } = await admin.from("legal_consents").insert({
      user_id: userA.id,
      terms_version: `rls-${suffix}`,
      privacy_version: `rls-${suffix}`,
      aup_version: `rls-${suffix}`,
      consent_source: "signup",
    }).select("id").single();
    assert.ifError(consentInsertError);
    assert(consentRow);

    const { data: ownConsent } = await a.from("legal_consents").select("id,terms_version").eq("id", consentRow.id);
    assert.equal(ownConsent?.length, 1, "User A reads own consent");

    const { data: crossConsent } = await b.from("legal_consents").select("id").eq("user_id", userA.id);
    assert.equal(crossConsent?.length, 0, "User B read User A legal consent");

    assertMutationDenied(
      await a.from("legal_consents").update({ terms_version: "tampered" }).eq("id", consentRow.id).select("id"),
      "User A updated historical consent",
    );

    assertMutationDenied(
      await b.from("legal_consents").update({ terms_version: "tampered" }).eq("id", consentRow.id).select("id"),
      "User B updated User A consent",
    );

    assertMutationDenied(
      await a.from("legal_consents").delete().eq("id", consentRow.id).select("id"),
      "User A deleted historical consent",
    );

    await admin.from("legal_consents").delete().eq("id", consentRow.id);
  }

  const { data: phraseRead } = await a.from("vault_recovery_phrases").select("phrase_hash,salt").eq("user_id", userA.id);
  assert.equal(phraseRead?.length ?? 0, 0, "Authenticated clients must not read Vault Phrase hashes");
  const { data: phraseCross } = await b.from("vault_recovery_phrases").select("user_id").eq("user_id", userA.id);
  assert.equal(phraseCross?.length ?? 0, 0, "User B read User A Vault Phrase row");

  console.log("RLS isolation PASS for projects, secrets, authenticator, recovery, cloud, Agent, audit, subscriptions, legal consents, and vault recovery phrases.");
} finally {
  if (admin) await admin.from("workspaces").delete().eq("id", workspace.id);
  else await a.from("workspaces").delete().eq("id", workspace.id);
  await a.auth.signOut();
  await b.auth.signOut();
}
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "RLS integration failed.");
  process.exit(1);
});
