"use client";

import { useEffect, useRef } from "react";

/**
 * Hero headline with word-by-word clip-path reveal on viewport entry.
 * "codebase" uses Candler neon green. "guardian." uses the pink → burgundy
 * gradient. Wording stays: "Your codebase has a guardian."
 */
export function KineticHeadline() {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const words = el.querySelectorAll<HTMLElement>(".lq-kword");

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          words.forEach((w) => w.classList.add("is-revealed"));
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <h1 ref={ref} className="lq-hero-headline">
      <span className="lq-kword" style={{ "--kw-delay": "0ms" } as React.CSSProperties}>
        Your
      </span>{" "}
      <span
        className="lq-kword lq-hero-codebase"
        style={{ "--kw-delay": "90ms" } as React.CSSProperties}
      >
        codebase
      </span>
      <br />
      <span className="lq-kword" style={{ "--kw-delay": "180ms" } as React.CSSProperties}>
        has a
      </span>{" "}
      <span className="lq-kword" style={{ "--kw-delay": "290ms" } as React.CSSProperties}>
        <span className="lq-gradient-word--anim">guardian.</span>
      </span>
    </h1>
  );
}
