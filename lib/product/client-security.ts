"use client";

export async function observeCopy(event: "secret.copied" | "authenticator.code_copied" | "recovery.code_copied", id: string) {
  await fetch("/api/audit/observable", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, id }),
  });
}

export async function confirmStepUp(password: string) {
  const response = await fetch("/api/auth/step-up", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const body = await response.json() as { error?: string };
  return { ok: response.ok, error: body.error };
}
