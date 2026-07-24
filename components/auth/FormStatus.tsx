import { AlertCircle, CheckCircle2, Info } from "lucide-react";

import { cn } from "@/lib/utilities/cn";

type StatusType = "error" | "success" | "info";

const STYLES: Record<StatusType, { classes: string; Icon: typeof AlertCircle }> =
  {
    error: {
      classes: "border-danger/30 bg-danger/10 text-danger",
      Icon: AlertCircle,
    },
    success: {
      classes: "border-success/30 bg-success/10 text-success",
      Icon: CheckCircle2,
    },
    info: { classes: "border-info/25 bg-info/10 text-info", Icon: Info },
  };

/**
 * Inline form banner for action results. Uses role="alert" so screen readers
 * announce errors; success/info use a polite live region.
 */
export function FormStatus({
  type,
  message,
}: {
  type: StatusType;
  message?: string | null;
}) {
  if (!message) return null;
  const { classes, Icon } = STYLES[type];

  return (
    <div
      role={type === "error" ? "alert" : "status"}
      aria-live={type === "error" ? "assertive" : "polite"}
      className={cn(
        "flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm",
        classes,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span className="text-mist">{message}</span>
    </div>
  );
}
