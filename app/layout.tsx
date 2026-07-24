import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { SITE } from "@/config/site";
import { SkyProvider } from "@/components/providers/SkyProvider";
import { SkyBackground } from "@/components/sky/SkyBackground";
import { SkyPreviewControl } from "@/components/sky/SkyPreviewControl";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — The home for every software project`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    "developer workspace",
    "project management for developers",
    "secrets manager",
    "environment variables",
    "GitHub",
    "Vercel",
    "Supabase",
    "Stripe",
    "Cloudflare",
  ],
  authors: [{ name: SITE.name }],
  creator: SITE.name,
  openGraph: {
    type: "website",
    siteName: SITE.name,
    url: SITE.url,
    title: `${SITE.name} — The home for every software project`,
    description: SITE.description,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — The home for every software project`,
    description: SITE.description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // data-scroll-behavior lets Next.js keep navigation scroll snappy while we
    // use smooth scrolling for in-page anchors (Next 16 no longer overrides by
    // default). suppressHydrationWarning is unused — the sky derives its state
    // from a stable SSR default, so no attribute mismatch occurs.
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <SkyProvider>
          <SkyBackground />
          {children}
          {/* Dev-only: preview each time-of-day without waiting for the clock.
              Tree-shaken out of production builds. */}
          {process.env.NODE_ENV !== "production" ? <SkyPreviewControl /> : null}
        </SkyProvider>
      </body>
    </html>
  );
}
