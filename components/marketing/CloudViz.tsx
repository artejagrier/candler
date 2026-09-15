import { CloudUpload } from "lucide-react";

/**
 * Cloud backup visualization: project → encrypted transfer → Candler Cloud.
 * Shows the project backup flow with the animated green transfer rail.
 */
export function CloudViz() {
  return (
    <div
      className="mk-card"
      role="img"
      aria-label="Candler Cloud backup example"
    >
      <div className="mk-card-titlebar">
        <span className="mk-card-title">Candler Cloud</span>
        <span className="mk-card-badge mk-card-badge--green">
          <span className="mk-card-dot" />
          Verified
        </span>
      </div>

      <div className="mk-cloud-body">
        {/* Source project */}
        <div className="mk-cloud-project">
          <p className="mk-cloud-project-name">candler-dev/</p>
          <p className="mk-cloud-project-meta">
            2.1 MB&nbsp;&middot;&nbsp;last backup 8h ago
          </p>
        </div>

        {/* Animated transfer rail */}
        <div className="mk-cloud-transfer">
          <div className="mk-cloud-transfer-line">
            <div className="mk-cloud-transfer-pulse" aria-hidden />
          </div>
          <span className="mk-cloud-transfer-icon">
            <CloudUpload aria-hidden="true" />
          </span>
        </div>

        {/* Verified backup */}
        <div className="mk-cloud-backup">
          <p className="mk-cloud-backup-name">candler-dev.cndl</p>
          <p className="mk-cloud-backup-meta">
            ✓ Verified&nbsp;&middot;&nbsp;128 MB total&nbsp;&middot;&nbsp;restore anytime
          </p>
        </div>

        {/* Second project */}
        <div style={{ marginTop: ".85rem" }}>
          <div className="mk-cloud-project">
            <p className="mk-cloud-project-name">api-service/</p>
            <p className="mk-cloud-project-meta">
              0.8 MB&nbsp;&middot;&nbsp;last backup 2h ago
            </p>
          </div>
          <div className="mk-cloud-transfer">
            <div className="mk-cloud-transfer-line">
              <div
                className="mk-cloud-transfer-pulse"
                style={{ animationDelay: ".9s" }}
                aria-hidden
              />
            </div>
            <span className="mk-cloud-transfer-icon">
              <CloudUpload aria-hidden="true" />
            </span>
          </div>
          <div className="mk-cloud-backup">
            <p className="mk-cloud-backup-name">api-service.cndl</p>
            <p className="mk-cloud-backup-meta">
              ✓ Verified&nbsp;&middot;&nbsp;44 MB total
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
