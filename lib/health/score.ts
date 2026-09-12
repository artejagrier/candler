export interface HealthFinding { severity: "low" | "medium" | "high"; title: string; }

export function calculateHealth(findings: HealthFinding[]): number {
  const penalty = findings.reduce((sum, finding) => sum + ({ low: 3, medium: 7, high: 15 }[finding.severity]), 0);
  return Math.max(0, 100 - penalty);
}
