"use client";

import { ArrowUp, Sparkles, Eye, ShieldCheck, Lock, Check } from "lucide-react";
import { useState } from "react";

const prompts = [
  "Which projects use Stripe?",
  "What's missing in production?",
  "Which secrets should I rotate?",
  "How much storage am I using?",
];

// The metadata surfaces Candler is allowed to read — shown so the user can see
// exactly what the Agent sees. Mirrors the server-side access boundary.
const scope = [
  "Projects",
  "Environments",
  "Services",
  "Secret metadata",
  "Health findings",
  "Cloud metadata",
  "Storage usage",
  "Redacted activity",
];

export function AgentPanel({ configured }: { configured: boolean }) {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string>();

  async function ask() {
    if (!query.trim() || !configured) return;
    setLoading(true);
    setError("");
    const r = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: query, conversationId }),
    });
    const body = await r.json();
    if (r.ok) {
      setAnswer(body.answer);
      setConversationId(body.conversationId);
    } else {
      setError(body.error);
    }
    setLoading(false);
  }

  return (
    <div className="agent-layout">
      <section className="agent-thread">
        {loading ? (
          // CHECKS — Candler is reading and correlating your metadata. This is
          // the real request lifecycle, not a simulated execution.
          <div className="agent-analyzing" aria-live="polite">
            <span className="agent-symbol">
              <Sparkles />
            </span>
            <p className="eyebrow">Candler is working</p>
            <h2>Analyzing your metadata…</h2>
            <ul className="agent-steps">
              <li>Reading project &amp; service configuration</li>
              <li>Correlating health and activity signals</li>
              <li>Composing a metadata-only answer</li>
            </ul>
          </div>
        ) : answer ? (
          // Result + honest verification: this is read-only analysis, so the
          // "verified" state confirms no changes were made and no secret left.
          <div className="agent-result">
            <span className="agent-symbol">
              <Sparkles />
            </span>
            <p className="eyebrow">Metadata analysis</p>
            <div className="agent-answer">{answer}</div>
            <div className="agent-trust">
              <span className="trust-chip trust-chip--green">
                <Check aria-hidden="true" /> Read-only · no changes made
              </span>
              <span className="trust-chip trust-chip--green">
                <ShieldCheck aria-hidden="true" /> Secrets never shared
              </span>
            </div>
          </div>
        ) : (
          // SEES — the scope of what Candler can observe across your stack.
          <div className="agent-empty">
            <span className="agent-symbol">
              <Sparkles />
            </span>
            <p className="eyebrow">Candler Agent</p>
            <h2>Candler can see your whole stack.</h2>
            <p>
              {configured
                ? "Candler reads project, environment, service, health, Cloud, and audit metadata to reason about your infrastructure. Raw credentials are never sent to the model."
                : "Configure OPENAI_API_KEY and OPENAI_AGENT_MODEL to enable live analysis."}
            </p>
            <div className="agent-scope" aria-label="What Candler can see">
              {scope.map((s) => (
                <span key={s}>{s}</span>
              ))}
            </div>
            <div className="prompt-grid">
              {prompts.map((p) => (
                <button key={p} onClick={() => setQuery(p)}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
        <form
          className="agent-composer"
          onSubmit={(e) => {
            e.preventDefault();
            void ask();
          }}
        >
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask Candler about your stack…"
          />
          <div>
            <span>{error || "Metadata-only context"}</span>
            <button disabled={!configured || loading} aria-label="Ask Candler">
              <ArrowUp />
            </button>
          </div>
        </form>
      </section>
      <aside className="agent-aside">
        <p className="eyebrow">Boundaries</p>
        <div className="boundary-note boundary-note--reads">
          <b>
            <Eye aria-hidden="true" /> What Candler sees
          </b>
          <p>
            Projects, services, secret metadata, deterministic health, cloud metadata, storage
            usage, and redacted activity.
          </p>
        </div>
        <div className="boundary-note boundary-note--sealed">
          <b>
            <Lock aria-hidden="true" /> What stays sealed
          </b>
          <p>
            Secret values, TOTP seeds or codes, recovery codes, passwords, tokens, and encryption
            keys.
          </p>
        </div>
      </aside>
    </div>
  );
}
