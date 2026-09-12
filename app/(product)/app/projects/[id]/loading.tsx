/**
 * Loading skeleton for the project detail hub. Approximates the header + stat
 * row + two-column body so the layout is stable when the real data resolves.
 */
export default function ProjectDetailLoading() {
  return (
    <div className="skeleton-page" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading project…</span>
      <div className="skeleton skeleton-line" style={{ width: "6rem" }} />
      <div className="skeleton skeleton-line" style={{ width: "16rem", height: "2.4rem" }} />
      <div className="skeleton skeleton-line" style={{ width: "min(34rem, 90%)" }} />
      <div className="stat-row" style={{ border: 0 }} aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="quiet-stat">
            <div className="skeleton" style={{ width: "4rem", height: ".7rem" }} />
            <div className="skeleton" style={{ width: "3rem", height: "1.8rem", margin: ".65rem 0 .3rem" }} />
            <div className="skeleton" style={{ width: "5rem", height: ".7rem" }} />
          </div>
        ))}
      </div>
      <div className="skeleton-rows" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i}>
            <div className="skeleton" style={{ flex: 1, maxWidth: "20rem" }} />
            <div className="skeleton" style={{ width: "4rem" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
