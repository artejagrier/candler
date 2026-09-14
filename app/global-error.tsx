"use client";

/**
 * Root error boundary. Catches failures in the root layout itself (where the
 * sky/provider live), so it must render its own <html>/<body>. Deeper, nicer
 * boundaries (e.g. app/(product)/app/error.tsx) handle in-shell errors and keep
 * the atmosphere. No stack traces or error internals are shown to the user.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#070709",
          color: "#f7f7f8",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          padding: "1.5rem",
        }}
      >
        <main style={{ maxWidth: "28rem", textAlign: "center" }}>
          <p style={{ color: "#c4b5fd", fontSize: ".72rem", letterSpacing: ".16em", textTransform: "uppercase", fontWeight: 600 }}>
            Something went wrong
          </p>
          <h1 style={{ color: "#fff", fontSize: "1.6rem", margin: "1rem 0" }}>
            Candler hit an unexpected error
          </h1>
          <p style={{ color: "#a2a2ae", fontSize: ".9rem", lineHeight: 1.6 }}>
            The page failed to render. Your data is safe. Try again, and if it keeps happening, contact support.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.75rem",
              padding: ".7rem 1.25rem",
              borderRadius: ".7rem",
              border: "none",
              background: "#fff",
              color: "#070709",
              fontWeight: 600,
              fontSize: ".85rem",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
