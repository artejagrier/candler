"use client";

import { useId } from "react";

import { AppearanceToggle } from "@/components/theme/AppearanceToggle";
import { AccentSwatches } from "@/components/theme/AccentSwatches";
import { useTheme } from "@/components/theme/ThemeProvider";
import { accentById } from "@/lib/theme/catalog";

export function AppearanceSettings() {
  const { appearance, accent } = useTheme();
  const headingId = useId();
  const appearanceLabel = useId();
  const accentLabel = useId();
  const current = accentById(accent);

  return (
    <section className="appearance-panel" aria-labelledby={headingId}>
      <div className="appearance-copy">
        <h2 id={headingId}>Appearance</h2>
        <p>Light and Dark control workspace surfaces. Accent color is used only for interactive emphasis.</p>
      </div>
      <div className="appearance-stack">
        <div className="appearance-field">
          <span id={appearanceLabel}>Appearance</span>
          <AppearanceToggle labelledBy={appearanceLabel} />
        </div>
        <div className="appearance-field">
          <span id={accentLabel}>Accent color</span>
          <AccentSwatches labelledBy={accentLabel} />
        </div>
        <p className="appearance-current">
          {appearance === "dark" ? "Dark" : "Light"} · {current.label}
        </p>
      </div>
    </section>
  );
}
