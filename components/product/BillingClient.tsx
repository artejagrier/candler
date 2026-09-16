"use client";

import { useState, useRef, useEffect } from "react";
import { Check } from "lucide-react";
import { CandlerProgress } from "@/components/ui/CandlerProgress";

type Product = "candler_pro" | "cloud_500" | "cloud_1tb";

const RANK = { free: 0, pro: 1, cloud500: 2, cloud1tb: 3 } as const;

export function BillingClient({
  proActive,
  cloudPlan,
  usedBytes,
  quotaBytes,
  hasCustomer,
  configured,
  autoPlan,
}: {
  proActive: boolean;
  cloudPlan: string;
  usedBytes: number;
  quotaBytes: number;
  hasCustomer: boolean;
  configured: boolean;
  autoPlan?: Product;
}) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const inflight = useRef(false);
  const autoPlanFired = useRef(false);

  const current =
    cloudPlan === "cloud1tb" ? "cloud1tb"
    : cloudPlan === "cloud500" ? "cloud500"
    : proActive ? "pro"
    : "free";

  const pct = quotaBytes ? Math.min(100, (usedBytes / quotaBytes) * 100) : 0;

  async function checkout(product: Product) {
    if (inflight.current) return;
    inflight.current = true;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/paddle/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product }),
      });
      const body = await response.json() as { transactionId?: string; upgraded?: boolean; error?: string };
      if (!response.ok) {
        setError(body.error ?? "Checkout could not be started.");
        return;
      }
      if (body.upgraded) {
        setSuccess(true);
        setTimeout(() => window.location.reload(), 1500);
        return;
      }
      if (body.transactionId && window.Paddle) {
        window.Paddle.Checkout.open({ transactionId: body.transactionId });
      } else {
        setError("Billing overlay could not be opened. Refresh and try again.");
      }
    } finally {
      inflight.current = false;
      setLoading(false);
    }
  }

  async function portal() {
    const response = await fetch("/api/paddle/portal", { method: "POST" });
    const body = await response.json() as { url?: string; error?: string };
    if (response.ok && body.url) window.location.assign(body.url);
    else setError(body.error ?? "Billing portal could not be opened.");
  }

  // Auto-trigger checkout when landing from pricing page with ?plan=X
  useEffect(() => {
    if (!autoPlan || !configured || autoPlanFired.current) return;
    const productToKey: Record<string, string> = {
      candler_pro: "pro",
      cloud_500: "cloud500",
      cloud_1tb: "cloud1tb",
    };
    const tileKey = productToKey[autoPlan];
    if (!tileKey || current === tileKey) return;
    autoPlanFired.current = true;
    void checkout(autoPlan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function ctaLabel(tileKey: string): string {
    if (current === "free") return "Start 7-Day Free Trial";
    const tileRank = RANK[tileKey as keyof typeof RANK] ?? 0;
    const currRank = RANK[current as keyof typeof RANK] ?? 0;
    return tileRank > currRank ? "Upgrade" : "Downgrade";
  }

  const tiles: {
    key: string;
    name: string;
    price: string;
    store: string;
    blurb: string;
    product?: Product;
    variant?: "primary" | "secondary";
  }[] = [
    { key: "free", name: "Free", price: "$0", store: "10 GB Cloud", blurb: "Unlimited projects. Vault, Agent, and Health for a single workspace." },
    { key: "pro", name: "Pro", price: "$18", store: "50 GB Cloud", blurb: "Unlimited projects. Authenticator, Recovery, and 50 GB backup.", product: "candler_pro", variant: "primary" },
    { key: "cloud500", name: "Pro + Cloud 500", price: "$29", store: "500 GB Cloud", blurb: "Unlimited projects with 500 GB of verified backup.", product: "cloud_500", variant: "secondary" },
    { key: "cloud1tb", name: "Pro + Cloud 1 TB", price: "$39", store: "1 TB Cloud", blurb: "Unlimited projects with a full terabyte of backup.", product: "cloud_1tb", variant: "secondary" },
  ];

  return (
    <>
      {loading && (
        <div className="billing-loading">
          <CandlerProgress label="Preparing secure checkout…" />
        </div>
      )}

      {success && (
        <p className="billing-success">Plan updated. Refreshing your workspace…</p>
      )}

      <div className="storage-meter">
        <span>
          <b>Storage</b>
          <small>
            {(usedBytes / 1024 ** 3).toFixed(2)} GB of {(quotaBytes / 1024 ** 3).toFixed(0)} GB used · Pro features{" "}
            {proActive ? "active" : "inactive"}
          </small>
        </span>
        <div>
          <i style={{ width: `${pct}%` }} />
        </div>
        {hasCustomer ? (
          <button className="bare-button" style={{ color: "var(--color-lavender)", fontSize: ".72rem" }} onClick={() => void portal()}>
            Manage
          </button>
        ) : null}
      </div>

      <div className="plan-grid">
        {tiles.map((tile) => {
          const isCurrent = current === tile.key;
          const showTrial = !isCurrent && tile.product && current === "free";
          return (
            <div className="plan-tile" data-current={isCurrent ? "true" : undefined} key={tile.key}>
              <span className="name">{tile.name}</span>
              <span className="price">
                {tile.price}
                {tile.key !== "free" ? <small> /mo</small> : null}
              </span>
              {showTrial ? <span className="trial-badge">7-day free trial</span> : null}
              <span className="store">{tile.store}</span>
              <p>{tile.blurb}</p>
              {isCurrent ? (
                <span className="current-badge">
                  <Check aria-hidden="true" /> Current plan
                </span>
              ) : tile.product ? (
                <button
                  className={tile.variant === "primary" ? "primary-button" : "secondary-button"}
                  disabled={!configured || loading}
                  onClick={() => void checkout(tile.product!)}
                >
                  {ctaLabel(tile.key)}
                </button>
              ) : (
                <span className="current-badge" style={{ color: "var(--color-slate-muted)" }}>
                  Included
                </span>
              )}
            </div>
          );
        })}
      </div>

      {hasCustomer ? (
        <div className="settings-list">
          <div>
            <p>
              <b>Billing portal</b>
              <small>Payment methods, invoices, cancellation, and plan administration</small>
            </p>
            <button className="secondary-button" onClick={() => void portal()}>
              Manage billing
            </button>
          </div>
        </div>
      ) : null}

      {!configured ? <p className="security-note">Billing is not configured. Contact support.</p> : null}
      {error ? <p className="security-note">{error}</p> : null}
    </>
  );
}
