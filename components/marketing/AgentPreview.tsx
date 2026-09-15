import { Check } from "lucide-react";

/**
 * Agent diagnosis UI — clean dark card showing one finding + resolution.
 * Represents the real Candler Agent surface, not a chatbot.
 */
export function AgentPreview() {
  return (
    <div className="mk-card" role="img" aria-label="Candler Agent diagnosis example">
      <div className="mk-card-titlebar">
        <span className="mk-card-title">Candler Agent</span>
        <span className="mk-card-badge mk-card-badge--green">
          <span className="mk-card-dot" />
          Watching
        </span>
      </div>

      <div className="mk-agent-body">
        <p className="mk-agent-meta">
          Scanned 6 projects&nbsp;&middot;&nbsp;2 minutes ago
        </p>

        <div className="mk-agent-finding">
          <p className="mk-agent-finding-label">Finding &mdash; candler-dev</p>
          <p className="mk-agent-finding-text">
            Production environment is using a staging database credential.
            This connection string will hit rate limits under production load.
          </p>
          <p className="mk-agent-finding-rec">
            Rotate SUPABASE_DB_URL to the production connection pool
            before next deploy.
          </p>
        </div>

        <div className="mk-agent-ok">
          <Check aria-hidden="true" />
          No issues found in the remaining 5 projects.
        </div>
      </div>
    </div>
  );
}
