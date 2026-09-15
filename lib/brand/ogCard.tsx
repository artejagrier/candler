import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { BRAND } from "@/lib/brand/mark";

/** Shared Open Graph / Twitter card, reused by both metadata routes. */
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_ALT = "Candler — The home for every software project";
export const OG_CONTENT_TYPE = "image/png";

function brandMarkDataUri(): string {
  const buf = readFileSync(join(process.cwd(), "public/brand/candler-mark.png"));
  return `data:image/png;base64,${buf.toString("base64")}`;
}

export function renderBrandCard(): ImageResponse {
  const mark = brandMarkDataUri();
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
            "linear-gradient(135deg, #3B0A1E 0%, #54102A 45%, #070709 100%)",
          fontFamily: "sans-serif",
          color: BRAND.white,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* next/og renders with Satori — a plain <img> is required here. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mark} width={96} height={96} alt="" />
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
            color: "#a2a2ae",
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
