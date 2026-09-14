import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import type { CSSProperties } from "react";

import { SITE } from "@/config/site";
import { SkyProvider } from "@/components/providers/SkyProvider";
import { SkyBackground } from "@/components/sky/SkyBackground";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import {
  DEFAULT_MODE,
  DEFAULT_SHADE,
  MODE_COOKIE,
  SHADE_COOKIE,
  SKY_COOKIE,
  THEME_COOKIE,
} from "@/lib/theme/catalog";
import { THEME_BOOT_SCRIPT, migrateStoredMode } from "@/lib/theme/storage";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jar = await cookies();
  const appearance = migrateStoredMode({
    mode: jar.get(MODE_COOKIE)?.value ?? "",
    theme: jar.get(THEME_COOKIE)?.value ?? DEFAULT_MODE,
    shade: jar.get(SHADE_COOKIE)?.value ?? DEFAULT_SHADE,
    sky: jar.get(SKY_COOKIE)?.value ?? "",
  });

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      data-mode={appearance.mode}
      data-theme={appearance.mode}
      data-theme-shade={appearance.shade}
      data-scheme={appearance.scheme}
      data-sky-period={appearance.skyPeriod ?? undefined}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={appearance.tokens as CSSProperties}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <SkyProvider initialOverride={appearance.skyPeriod}>
          <ThemeProvider initialMode={appearance.mode} initialShade={appearance.shade}>
            <SkyBackground />
            {children}
          </ThemeProvider>
        </SkyProvider>
      </body>
    </html>
  );
}
