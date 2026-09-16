"use client";

interface CandlerProgressProps {
  label?: string;
  value?: number;
  max?: number;
}

export function CandlerProgress({ label, value, max }: CandlerProgressProps) {
  const isDeterminate = value !== undefined && max !== undefined && max > 0;
  const pct = isDeterminate ? Math.min(100, Math.round((value! / max!) * 100)) : undefined;

  return (
    <div className="candler-progress">
      {label && <p className="candler-progress-label">{label}</p>}
      {isDeterminate && (
        <p className="candler-progress-count" aria-hidden="true">
          {value} / {max}
        </p>
      )}
      <div
        className="candler-progress-track"
        role="progressbar"
        aria-busy="true"
        aria-label={label ?? "Loading"}
        aria-valuemin={isDeterminate ? 0 : undefined}
        aria-valuemax={isDeterminate ? max : undefined}
        aria-valuenow={isDeterminate ? value : undefined}
      >
        <div
          className={`candler-progress-fill${isDeterminate ? "" : " candler-progress-fill--indeterminate"}`}
          style={isDeterminate && pct !== undefined ? { width: `${pct}%` } : undefined}
        />
      </div>
    </div>
  );
}
