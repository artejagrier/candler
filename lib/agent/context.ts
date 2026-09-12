export interface SecretRecord {
  id: string;
  name: string;
  service: string | null;
  environment: string | null;
  createdAt: string;
  expiresAt: string | null;
  rotationDueAt: string | null;
  ciphertext?: string;
  iv?: string;
  authTag?: string;
  value?: string;
}

export interface AgentSecretMetadata {
  id: string;
  name: string;
  service: string | null;
  environment: string | null;
  createdAt: string;
  expirationStatus: "none" | "active" | "expired";
  rotationStatus: "none" | "current" | "due";
  exists: true;
}

/** Explicit LLM boundary. Raw values and encryption material are omitted. */
export function getProjectSecretsMetadata(records: SecretRecord[], now = new Date()): AgentSecretMetadata[] {
  return records.map((record) => ({
    id: record.id,
    name: record.name,
    service: record.service,
    environment: record.environment,
    createdAt: record.createdAt,
    expirationStatus: !record.expiresAt ? "none" : new Date(record.expiresAt) <= now ? "expired" : "active",
    rotationStatus: !record.rotationDueAt ? "none" : new Date(record.rotationDueAt) <= now ? "due" : "current",
    exists: true,
  }));
}
