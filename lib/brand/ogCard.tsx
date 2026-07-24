import { ImageResponse } from "next/og";

import { BRAND, shieldDataUri } from "@/lib/brand/mark";

/** Shared Open Graph / Twitter card, reused by both metadata routes. */
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_ALT = "Candler — The home for every software project";
export const OG_CONTENT_TYPE = "image/png";

export function renderBrandCard(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background:
            "linear-gradient(135deg, #0c0722 0%, #1b0f3a 45%, #07070a 100%)",
          fontFamily: "sans-serif",
          color: BRAND.white,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 96,
              height: 96,
              borderRadius: 24,
              background: BRAND.purple,
            }}
          >
            {/* next/og renders with Satori — a plain <img> is required here. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shieldDataUri()} width={60} height={60} alt="" />
          </div>
          <div style={{ display: "flex", fontSize: 52, fontWeight: 700 }}>
            Candler
            <span style={{ color: BRAND.lavender }}>.dev</span>
          </div>
        </div>

        <div
          style={{
            marginTop: 48,
            fontSize: 70,
            fontWeight: 700,
            lineHeight: 1.1,
            maxWidth: 940,
          }}
        >
          The home for every software project.
        </div>

        <div
          style={{
            marginTop: 28,
            fontSize: 30,
            color: "#a3a1b5",
            maxWidth: 880,
          }}
        >
          Connect, organize, and secure your entire development stack.
        </div>
      </div>
    ),
    { ...OG_SIZE },
  );
}
