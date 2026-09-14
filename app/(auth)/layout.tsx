import Link from "next/link";

import { Wordmark } from "@/components/brand/Wordmark";

/**
 * Auth route-group shell. Centers a single column over the shared workspace
 * background (root layout) and deliberately omits the workspace dock and
 * command palette. Each screen supplies its own <AuthCard>.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="animate-rise mb-8 flex justify-center">
          <Wordmark size="lg" />
        </div>

        {children}

        <p className="mt-8 text-center text-xs text-slate-muted">
          <Link href="/" className="transition-colors hover:text-fog">
            ← Back to candler.dev
          </Link>
        </p>
        <nav className="legal-auth-links" aria-label="Legal">
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/acceptable-use">Acceptable Use</Link>
          <Link href="/security">Security</Link>
        </nav>
      </div>
    </main>
  );
}
