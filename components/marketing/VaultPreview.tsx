import { ArrowRight, ShieldCheck } from "lucide-react";

/**
 * Vault secrets list — clean dark card showing encrypted secret rows.
 * No real values are displayed; everything is masked.
 */
const VAULT_ROWS = [
  { key: "SUPABASE_URL", env: "prod" },
  { key: "STRIPE_SECRET_KEY", env: "prod" },
  { key: "VERCEL_TOKEN", env: "prod" },
  { key: "DATABASE_URL", env: "staging" },
  { key: "OPENAI_API_KEY", env: "prod" },
];

export function VaultPreview() {
  return (
    <div className="mk-card" role="img" aria-label="Candler Vault example">
      <div className="mk-card-titlebar">
        <span className="mk-card-title">Vault &middot; candler-dev</span>
        <span className="mk-card-badge mk-card-badge--green">
          <span className="mk-card-dot" />
          All encrypted
        </span>
      </div>

      {VAULT_ROWS.map((row) => (
        <div className="mk-vault-row" key={row.key}>
          <span className="mk-vault-key">{row.key}</span>
          <span className="mk-vault-env">{row.env}</span>
          <span className="mk-vault-val">••••••••</span>
          <ArrowRight className="mk-vault-arrow" aria-hidden="true" />
        </div>
      ))}

      <div className="mk-vault-footer">
        <ShieldCheck aria-hidden="true" />
        42 secrets&nbsp;&middot;&nbsp;all values encrypted at rest
      </div>
    </div>
  );
}
