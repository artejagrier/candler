"use client";

import { useState } from "react";
import { Check } from "lucide-react";

type Product = "candler_pro" | "cloud_500" | "cloud_1tb";

export function BillingClient({
  proActive,
  cloudPlan,
  usedBytes,
  quotaBytes,
  hasCustomer,
  configured,
}: {
  proActive: boolean;
  cloudPlan: string;
  usedBytes: number;
  quotaBytes: number;
  hasCustomer: boolean;
  configured: boolean;
}) {
  const [error, setError] = useState("");

  async function checkout(product: Product) {
    const response = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product }),
    });
    const body = await response.json() as { url?: string; error?: string };
    if (response.ok && body.url) window.location.assign(body.url);
    else setError(body.error ?? "Checkout could not be started.");
  }

  async function portal() {
    const response = await fetch("/api/stripe/portal", { method: "POST" });
    const body = await response.json() as { url?: string; error?: string };
    if (response.ok && body.url) window.location.assign(body.url);
    else setError(body.error ?? "Billing portal could not be opened.");
  }

  // Current tier derived from verified subscription state (cloud plan + Pro
  // entitlement) — presentation only, no billing logic changed.
  const current =
    cloudPlan === "cloud1tb" ? "cloud1tb" : cloudPlan === "cloud500" ? "cloud500" : proActive ? "pro" : "free";
  const pct = quotaBytes ? Math.min(100, (usedBytes / quotaBytes) * 100) : 0;

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
    { key: "pro", name: "Pro", price: "$18/mo", store: "50 GB Cloud", blurb: "Unlimited projects. Authenticator, Recovery, and 50 GB backup.", product: "candler_pro", variant: "primary" },
    { key: "cloud500", name: "Pro + Cloud 500", price: "$29/mo", store: "500 GB Cloud", blurb: "Unlimited projects with 500 GB of verified backup.", product: "cloud_500", variant: "secondary" },
    { key: "cloud1tb", name: "Pro + Cloud 1 TB", price: "$39/mo", store: "1 TB Cloud", blurb: "Unlimited projects with a full terabyte of backup.", product: "cloud_1tb", variant: "secondary" },
  ];

  return (
    <>
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
                  disabled={!configured}
                  onClick={() => void checkout(tile.product!)}
                >
                  Subscribe · {tile.price}/mo
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

      {!configured ? <p className="security-note">Stripe is not configured. Billing actions are disabled.</p> : null}
      {error ? <p className="security-note">{error}</p> : null}
    </>
  );
}
