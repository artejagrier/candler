import type { AgentSecretMetadata } from "@/lib/agent/context";

export interface DetailedHealthFinding {
  code: string;
  severity: "low" | "medium" | "high";
  title: string;
  secretId?: string;
  projectId?: string;
}

export type HealthRecord = AgentSecretMetadata & {
  projectId: string | null;
  serviceId: string | null;
  environmentId: string | null;
  lastAccessedAt: string | null;
  expiresAt: string | null;
};

const DAY = 86_400_000;
const COMPARABLE_ENVS = ["development", "preview", "production"] as const;

function daysAgo(value: string | null, now: Date): number | null {
  if (!value) return null;
  return now.getTime() - new Date(value).getTime();
}

export function deriveHealthFindings(records: HealthRecord[], now = new Date()): DetailedHealthFinding[] {
  const findings: DetailedHealthFinding[] = [];
  const duplicateGroups = new Map<string, HealthRecord[]>();
  const projectEnvs = new Map<string, Set<string>>();
  const namePresence = new Map<string, Set<string>>();
  const serviceByName = new Map<string, Set<string>>();

  for (const record of records) {
    if (!record.projectId || !record.serviceId) {
      findings.push({
        code: "orphaned",
        severity: "medium",
        title: `${record.name} is not fully assigned`,
        secretId: record.id,
        projectId: record.projectId ?? undefined,
      });
    }

    const duplicateKey = `${record.projectId}:${record.environmentId}:${record.serviceId}:${record.name.toLowerCase()}`;
    const group = duplicateGroups.get(duplicateKey) ?? [];
    group.push(record);
    duplicateGroups.set(duplicateKey, group);

    if (record.expirationStatus === "expired") {
      findings.push({ code: "expired", severity: "high", title: `${record.name} has expired`, secretId: record.id, projectId: record.projectId ?? undefined });
    } else if (record.expiresAt && new Date(record.expiresAt).getTime() - now.getTime() < 14 * DAY) {
      findings.push({ code: "expiring", severity: "medium", title: `${record.name} expires soon`, secretId: record.id, projectId: record.projectId ?? undefined });
    }

    if (record.rotationStatus === "due") {
      findings.push({ code: "rotation_due", severity: "medium", title: `${record.name} is due for rotation`, secretId: record.id, projectId: record.projectId ?? undefined });
    }

    const lastAccessAge = daysAgo(record.lastAccessedAt, now);
    const createdAge = daysAgo(record.createdAt, now);
    if ((lastAccessAge !== null && lastAccessAge > 180 * DAY) || (lastAccessAge === null && createdAge !== null && createdAge > 180 * DAY)) {
      findings.push({ code: "unused", severity: "low", title: `${record.name} has not been accessed in 180 days`, secretId: record.id, projectId: record.projectId ?? undefined });
    }

    const envName = record.environment?.toLowerCase();
    if (record.projectId && envName && COMPARABLE_ENVS.includes(envName as (typeof COMPARABLE_ENVS)[number])) {
      const envs = projectEnvs.get(record.projectId) ?? new Set();
      envs.add(envName);
      projectEnvs.set(record.projectId, envs);
      const presenceKey = `${record.projectId}:${record.serviceId}:${record.name.toLowerCase()}`;
      const present = namePresence.get(presenceKey) ?? new Set();
      present.add(envName);
      namePresence.set(presenceKey, present);
      const services = serviceByName.get(`${record.projectId}:${record.name.toLowerCase()}`) ?? new Set();
      services.add(record.serviceId ?? "none");
      serviceByName.set(`${record.projectId}:${record.name.toLowerCase()}`, services);
    }
  }

  for (const group of duplicateGroups.values()) {
    if (group.length > 1) {
      for (const record of group.slice(1)) {
        findings.push({ code: "duplicate", severity: "medium", title: `Duplicate secret name ${record.name}`, secretId: record.id, projectId: record.projectId ?? undefined });
      }
    }
  }

  for (const [key, present] of namePresence) {
    const [projectId] = key.split(":");
    const comparable = [...(projectEnvs.get(projectId) ?? [])].filter((env) => COMPARABLE_ENVS.includes(env as (typeof COMPARABLE_ENVS)[number]));
    if (comparable.length < 2) continue;
    const missing = comparable.filter((env) => !present.has(env));
    if (missing.length) {
      findings.push({
        code: "missing_counterpart",
        severity: "medium",
        title: `Secret is missing from ${missing.join(", ")}`,
        projectId,
      });
    }
  }

  for (const [key, services] of serviceByName) {
    if (services.size > 1) {
      const projectId = key.split(":")[0];
      findings.push({
        code: "environment_mismatch",
        severity: "low",
        title: "Secret is assigned to different services across environments",
        projectId,
      });
    }
  }

  return findings;
}

export function healthScore(findings: DetailedHealthFinding[]) {
  return Math.max(0, 100 - findings.reduce((n, finding) => n + ({ low: 3, medium: 7, high: 15 }[finding.severity]), 0));
}
