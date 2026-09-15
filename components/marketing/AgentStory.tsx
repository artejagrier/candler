"use client";

import { useEffect, useState } from "react";

import { AgentPreview } from "@/components/marketing/AgentPreview";

const STEPS = [
  {
    label: "Something changed",
    body: "A production environment variable drifted after the last deploy. The rest of the stack still looks healthy.",
  },
  {
    label: "Candler noticed",
    body: "Watchers pick up the drift from deployment metadata and environment state — without reading secret values.",
  },
  {
    label: "The stack is correlated",
    body: "GitHub, Vercel, and Supabase signals are placed beside the same project so the change has context.",
  },
  {
    label: "Likely cause, diagnosed",
    body: "Agent explains the mismatch in plain language: production is pointing at a staging credential.",
  },
  {
    label: "A fix is proposed",
    body: "Rotate the production connection and confirm the next deploy. Sensitive actions still require you.",
  },
  {
    label: "You stay in control",
    body: "Candler never applies the fix for you. Step-up authentication sits in front of every reveal and rotation.",
  },
] as const;

/**
 * Interactive Agent narrative. Steps can be selected; they also cycle
 * unless the visitor prefers reduced motion or has already chosen one.
 */
export function AgentStory() {
  const [active, setActive] = useState(0);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    if (pinned) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches) return;
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % STEPS.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [pinned]);

  const step = STEPS[active] ?? STEPS[0];

  return (
    <div className="mk-story">
      <ol className="mk-story-steps" aria-label="How Candler Agent works">
        {STEPS.map((item, index) => (
          <li key={item.label}>
            <button
              type="button"
              className={`mk-story-step${index === active ? " is-active" : ""}`}
              aria-current={index === active ? "step" : undefined}
              onClick={() => {
                setPinned(true);
                setActive(index);
              }}
            >
              <span className="mk-story-index">{String(index + 1).padStart(2, "0")}</span>
              {item.label}
            </button>
          </li>
        ))}
      </ol>

      <div className="mk-story-stage">
        <p className="mk-story-body">{step.body}</p>
        <AgentPreview />
      </div>
    </div>
  );
}
