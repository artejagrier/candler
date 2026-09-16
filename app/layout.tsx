import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import type { CSSProperties } from "react";

import { SITE } from "@/config/site";
import { PaddleInit } from "@/components/billing/PaddleInit";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import {
  ACCENT_COOKIE,
  APPEARANCE_COOKIE,
  MODE_COOKIE,
  SKY_COOKIE,
  THEME_COOKIE,
  migrateStoredPreferences,
} from "@/lib/theme/catalog";
import { THEME_BOOT_SCRIPT } from "@/lib/theme/storage";
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
    "Paddle",
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jar = await cookies();
  const appearance = migrateStoredPreferences({
    appearance: jar.get(APPEARANCE_COOKIE)?.value ?? "",
    accent: jar.get(ACCENT_COOKIE)?.value ?? "",
    mode: jar.get(MODE_COOKIE)?.value ?? "",
    theme: jar.get(THEME_COOKIE)?.value ?? "",
    sky: jar.get(SKY_COOKIE)?.value ?? "",
  });

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      data-appearance={appearance.appearance}
      data-accent={appearance.accent}
      data-scheme={appearance.scheme}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={appearance.tokens as CSSProperties}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <PaddleInit token={process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? ""} />
        <ThemeProvider initialAppearance={appearance.appearance} initialAccent={appearance.accent}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
