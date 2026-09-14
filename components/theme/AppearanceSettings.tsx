"use client";

import { useId } from "react";

import { ModeSelect, ShadeSelect } from "@/components/theme/ThemeSelect";
import { familyById, shadeById, supportsShades } from "@/lib/theme/catalog";
import { useTheme } from "@/components/theme/ThemeProvider";

export function AppearanceSettings() {
  const { mode, shade } = useTheme();
  const headingId = useId();
  const modeLabel = useId();
  const shadeLabel = useId();
  const family = familyById(mode);
  const current = shadeById(family, shade);
  const showShade = supportsShades(mode);

  return (
    <section className="appearance-panel" aria-labelledby={headingId}>
      <div className="appearance-copy">
        <h2 id={headingId}>Appearance</h2>
        <p>Color modes stay stable. Sunrise, Day, Sunset, and Night are optional environments — they apply only when you choose them. Hover to preview; click to save.</p>
      </div>
      <div className={showShade ? "appearance-grid" : "appearance-grid appearance-grid--compact"}>
        <div className="appearance-field">
          <span id={modeLabel}>Mode</span>
          <ModeSelect labelledBy={modeLabel} />
        </div>
        {showShade ? (
          <div className="appearance-field">
            <span id={shadeLabel}>Shade</span>
            <ShadeSelect />
          </div>
        ) : null}
        <div className="appearance-preview" aria-label="Mode preview">
          <span>Preview</span>
          <div className="appearance-preview-card" data-scheme={current.scheme}>
            <i style={{ background: current.tokens["--sidebar-bg"] ?? current.tokens["--color-sidebar"] }} />
            <b style={{ color: current.tokens["--text-primary"] ?? current.tokens["--color-foreground"] }}>{family.label}</b>
            <small style={{ color: current.tokens["--text-secondary"] ?? current.tokens["--color-text-muted"] }}>
              {family.group === "environment" ? "Optional environment" : current.label}
            </small>
            <em style={{ background: current.tokens["--color-btn"], color: current.tokens["--color-btn-fg"] }}>Action</em>
          </div>
        </div>
      </div>
    </section>
  );
}
