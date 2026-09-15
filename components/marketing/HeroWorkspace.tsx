import { AgentPreview } from "@/components/marketing/AgentPreview";
import { VaultPreview } from "@/components/marketing/VaultPreview";

/**
 * Compact hero product visual built from the real Vault and Agent surfaces,
 * framed as a Candler workspace — not a mock screenshot.
 */
export function HeroWorkspace() {
  return (
    <div
      className="mk-workspace"
      role="img"
      aria-label="Candler workspace showing Vault secrets and Agent diagnosis"
    >
      <div className="mk-workspace-bar">
        <span className="mk-workspace-mark">Candler</span>
        <span className="mk-workspace-live">
          <span className="mk-card-dot" />
          Watching
        </span>
      </div>
      <div className="mk-workspace-body">
        <div className="mk-workspace-main">
          <VaultPreview />
        </div>
        <div className="mk-workspace-side">
          <AgentPreview />
        </div>
      </div>
      <div className="mk-workspace-ai" aria-hidden>
        Agent
      </div>
    </div>
  );
}
