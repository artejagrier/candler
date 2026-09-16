import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Info,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utilities/cn";

export type BadgeTone =
  | "neutral"
  | "purple"
  | "info"
  | "success"
  | "warning"
  | "danger";

interface BadgeProps {
  tone?: BadgeTone;
  children: React.ReactNode;
  /** Override the default tone icon. Pass null to hide it. */
  icon?: LucideIcon | null;
  className?: string;
}

const TONES: Record<BadgeTone, { classes: string; icon: LucideIcon }> = {
  neutral: { classes: "bg-[color-mix(in_srgb,var(--color-foreground)_6%,transparent)] text-fog border-line", icon: Circle },
  purple: {
    classes: "bg-purple/15 text-lavender border-line-strong",
    icon: Circle,
  },
  info: { classes: "bg-info/12 text-info border-info/25", icon: Info },
  success: {
    classes: "bg-success/12 text-success border-success/25",
    icon: CheckCircle2,
  },
  warning: {
    classes: "bg-warning/12 text-warning border-warning/25",
    icon: AlertTriangle,
  },
  danger: { classes: "bg-danger/12 text-danger border-danger/25", icon: XCircle },
};

/**
 * Status pill. Meaning is always carried by the text label and a reinforcing
 * icon — never by color alone — to satisfy the accessibility requirement.
 */
export function Badge({ tone = "neutral", children, icon, className }: BadgeProps) {
  const { classes, icon: DefaultIcon } = TONES[tone];
  const Icon = icon === undefined ? DefaultIcon : icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5",
        "text-xs font-medium",
        classes,
        className,
      )}
    >
      {Icon ? <Icon className="size-3" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
