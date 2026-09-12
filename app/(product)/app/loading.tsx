/**
 * Route-level loading skeleton for the product surface. Shown during navigation
 * to any /app segment that doesn't ship its own loading.tsx. Mirrors the common
 * page-header + list rhythm so there's no layout shift when content arrives.
 */
export default function ProductLoading() {
  return (
    <div className="skeleton-page" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="skeleton skeleton-line" style={{ width: "8rem" }} />
      <div className="skeleton skeleton-line" style={{ width: "18rem", height: "2.4rem" }} />
      <div className="skeleton skeleton-line" style={{ width: "min(38rem, 90%)" }} />
      <div className="skeleton-rows" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i}>
            <div className="skeleton" style={{ width: "2rem", height: "2rem", borderRadius: ".55rem" }} />
            <div className="skeleton" style={{ flex: 1, maxWidth: "22rem" }} />
            <div className="skeleton" style={{ width: "5rem" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
