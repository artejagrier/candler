"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { CandlerProgress } from "@/components/ui/CandlerProgress";
import { PLAN_COPY, formatUsedGb, quotaLabel } from "@/lib/billing/plan-display";
import type { CloudPlan } from "@/lib/cloud/quota";

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
  planTitle,
  planQuota,
  statusFacts,
}: {
  proActive: boolean;
  cloudPlan: string;
  usedBytes: number;
  quotaBytes: number;
  hasCustomer: boolean;
  configured: boolean;
  autoPlan?: Product;
  planTitle: string;
  planQuota: string;
  statusFacts: string[];
}) {
  const router = useRouter();
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

  const currentCopy = PLAN_COPY[(current as CloudPlan)] ?? PLAN_COPY.free;
  const usedGb = formatUsedGb(usedBytes);
  const quotaText = quotaLabel(quotaBytes);
  const availableGb = Math.max(0, (quotaBytes - usedBytes) / 1024 ** 3);
  const availableText = availableGb >= 1000 ? "1 TB available" : `${formatUsedGb(Math.max(0, quotaBytes - usedBytes))} GB available`;
  const pct = quotaBytes ? Math.min(100, (usedBytes / quotaBytes) * 100) : 0;

  function scheduleEntitlementRefresh() {
    [2500, 6000, 12000].forEach((ms) => {
      window.setTimeout(() => router.refresh(), ms);
    });
  }

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
        scheduleEntitlementRefresh();
        setTimeout(() => window.location.reload(), 1500);
        return;
      }
      if (body.transactionId && window.Paddle) {
        window.Paddle.Checkout.open({ transactionId: body.transactionId });
        scheduleEntitlementRefresh();
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

  const UPGRADE_LABEL: Record<string, string> = {
    pro: "Upgrade to Pro",
    cloud500: "Choose Cloud 500",
    cloud1tb: "Choose Cloud 1 TB",
  };

  function ctaLabel(tileKey: string): string {
    if (current === "free") return UPGRADE_LABEL[tileKey] ?? "Upgrade";
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

      <section className="billing-current" aria-label="Current plan">
        <div>
          <p className="eyebrow">Current plan</p>
          <h2>{planTitle || currentCopy.title}</h2>
          <p>{planQuota || currentCopy.quota}</p>
        </div>
        {statusFacts.length ? (
          <ul className="billing-facts">
            {statusFacts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="storage-meter" aria-label="Cloud storage">
        <div className="storage-meter-copy">
          <p className="eyebrow">Storage</p>
          <p className="storage-meter-usage">
            <b>{usedGb} GB</b>
            <span> / {quotaText}</span>
          </p>
        </div>
        <div className="storage-meter-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label="Cloud storage used">
          <i style={{ width: `${pct}%` }} />
        </div>
        <div className="storage-meter-meta">
          <small>{availableText}</small>
          {hasCustomer ? (
            <button className="bare-button storage-meter-manage" onClick={() => void portal()}>
              Manage
            </button>
          ) : null}
        </div>
      </section>

      <div className="plan-grid">
        {tiles.map((tile) => {
          const isCurrent = current === tile.key;
          return (
            <div className="plan-tile" data-current={isCurrent ? "true" : undefined} key={tile.key}>
              <span className="name">{tile.name}</span>
              <span className="price">
                {tile.price}
                {tile.key !== "free" ? <small> /mo</small> : null}
              </span>
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
                <span className="current-badge current-badge--muted">
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
