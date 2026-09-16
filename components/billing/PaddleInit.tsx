"use client";

import Script from "next/script";

declare global {
  interface Window {
    Paddle?: {
      Environment: { set: (env: "sandbox" | "production") => void };
      Initialize: (opts: { token: string; eventCallback?: (data: { name?: string }) => void }) => void;
      Checkout: { open: (opts: { transactionId: string }) => void };
    };
  }
}

export function PaddleInit({ token }: { token: string }) {
  if (!token) return null;
  const isSandbox = token.startsWith("test_");

  return (
    <Script
      src="https://cdn.paddle.com/paddle/v2/paddle.js"
      onReady={() => {
        if (!window.Paddle) return;
        if (isSandbox) window.Paddle.Environment.set("sandbox");
        window.Paddle.Initialize({
          token,
          eventCallback(data) {
            if (data.name === "checkout.completed") {
              setTimeout(() => window.location.reload(), 1000);
            }
          },
        });
      }}
    />
  );
}
