"use client";

import { useRef } from "react";
import type { MouseEvent } from "react";

interface Props {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "ghost" | "inverse" | "ghostInverse";
}

/**
 * A link button with a subtle magnetic pull toward the cursor.
 * Uses inline transform via mouse events — no Spring library needed.
 * Strength is intentionally low (0.26×) so it feels elegant, not jarring.
 */
export function MagneticButton({ href, children, variant = "primary" }: Props) {
  const ref = useRef<HTMLAnchorElement>(null);

  function onMove(e: MouseEvent<HTMLAnchorElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) * 0.26;
    const dy = (e.clientY - (r.top + r.height / 2)) * 0.26;
    el.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  function onLeave() {
    if (ref.current) ref.current.style.transform = "translate(0, 0)";
  }

  const cls =
    variant === "inverse"
      ? "lq-btn-inverse"
      : variant === "ghostInverse"
        ? "lq-btn-ghost-inverse"
        : variant === "ghost"
          ? "lq-btn-ghost"
          : "lq-btn-primary";

  return (
    <a
      ref={ref}
      href={href}
      className={cls}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
    </a>
  );
}
