import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utilities/cn";

interface SectionHeadingProps {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
}

/** Consistent section header: optional eyebrow badge, title, and description. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      {eyebrow ? <Badge tone="purple">{eyebrow}</Badge> : null}
      <h2 className="max-w-2xl text-balance text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="max-w-2xl text-pretty text-lg leading-relaxed text-fog">
          {description}
        </p>
      ) : null}
    </div>
  );
}
