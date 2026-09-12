"use client";

import { useState } from "react";

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
    if (response.ok && body.url) location.href = body.url;
    else setError(body.error ?? "Checkout could not be started.");
  }

  async function portal() {
    const response = await fetch("/api/stripe/portal", { method: "POST" });
    const body = await response.json() as { url?: string; error?: string };
    if (response.ok && body.url) location.href = body.url;
    else setError(body.error ?? "Billing portal could not be opened.");
  }

  const planLabel =
    cloudPlan === "cloud1tb" ? "Pro + Cloud 1 TB" :
    cloudPlan === "cloud500" ? "Pro + Cloud 500" :
    cloudPlan === "pro" ? "Pro · 50 GB" :
    "Free · 10 GB";

  return (
    <>
      <div className="billing-list">
        <div>
          <p><b>Current plan</b><small>{(usedBytes / 1024 ** 3).toFixed(2)} GB of {(quotaBytes / 1024 ** 3).toFixed(0)} GB used · Pro features {proActive ? "active" : "inactive"}</small></p>
          <strong>{planLabel}</strong>
        </div>
        <div>
          <p><b>Candler Pro</b><small>Vault, Agent, Health, Authenticator, Recovery, and 50 GB Cloud</small></p>
          <strong>$18/mo</strong>
          <button className="primary-button" disabled={!configured} onClick={() => void checkout("candler_pro")}>
            {cloudPlan === "pro" ? "Current plan" : "Subscribe · $18/mo"}
          </button>
        </div>
        <div>
          <p><b>Candler Pro + Cloud 500</b><small>Everything in Pro, with 500 GB Cloud</small></p>
          <strong>$29/mo</strong>
          <button className="secondary-button" disabled={!configured} onClick={() => void checkout("cloud_500")}>
            {cloudPlan === "cloud500" ? "Current plan" : "Subscribe · $29/mo"}
          </button>
        </div>
        <div>
          <p><b>Candler Pro + Cloud 1 TB</b><small>Everything in Pro, with 1 TB Cloud</small></p>
          <strong>$39/mo</strong>
          <button className="secondary-button" disabled={!configured} onClick={() => void checkout("cloud_1tb")}>
            {cloudPlan === "cloud1tb" ? "Current plan" : "Subscribe · $39/mo"}
          </button>
        </div>
        {hasCustomer ? (
          <div>
            <p><b>Billing portal</b><small>Payment methods, invoices, cancellation, and plan administration</small></p>
            <button className="secondary-button" onClick={() => void portal()}>Manage billing</button>
          </div>
        ) : null}
      </div>
      {!configured ? <p className="security-note">Stripe is not configured. Billing actions are disabled.</p> : null}
      {error ? <p className="security-note">{error}</p> : null}
    </>
  );
}
