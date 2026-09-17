const SENSITIVE_KEYS = /secret|password|token|authorization|cookie|totp|seed|recovery|phrase_hash|phrase_salt|recovery.?phrase|api[-_]?key|ciphertext|auth[-_]?tag/i;

export function redactSensitive(input: unknown): unknown {
  if (Array.isArray(input)) return input.map(redactSensitive);
  if (!input || typeof input !== "object") return input;
  return Object.fromEntries(Object.entries(input).map(([key, value]) => [
    key,
    SENSITIVE_KEYS.test(key) ? "[REDACTED]" : redactSensitive(value),
  ]));
}

export function safeErrorResponse(message = "The request could not be completed.", status = 400) {
  return Response.json({ error: message }, { status });
}
