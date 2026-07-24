import type { LucideIcon } from "lucide-react";

import { Surface } from "@/components/ui/Surface";

interface AuthCardProps {
  title: string;
  subtitle?: React.ReactNode;
  icon?: LucideIcon;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * The glass panel every auth screen sits in — consistent heading, optional
 * icon, body, and footer. Server-safe; the interactive form is passed as
 * children.
 */
export function AuthCard({
  title,
  subtitle,
  icon: Icon,
  children,
  footer,
}: AuthCardProps) {
  return (
    <Surface glow className="animate-rise p-6 sm:p-8">
      <header className="mb-6">
        {Icon ? (
          <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-purple/15 text-lavender ring-1 ring-line-strong">
            <Icon className="size-5" aria-hidden="true" />
          </span>
        ) : null}
        <h1 className="text-xl font-semibold tracking-tight text-white">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1.5 text-sm leading-relaxed text-fog">{subtitle}</p>
        ) : null}
      </header>

      {children}

      {footer ? (
        <footer className="mt-6 border-t border-line pt-5 text-center text-sm text-fog">
          {footer}
        </footer>
      ) : null}
    </Surface>
  );
}
