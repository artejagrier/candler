export function PlanChip({ label }: { label: string }) {
  if (!label) return null;
  return <span className="plan-chip">{label}</span>;
}
