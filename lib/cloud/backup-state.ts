/**
 * Authoritative Cloud backup outcome. UI must not invent COMPLETE.
 * Verified means backed_up (HeadObject matched) or skipped-as-unchanged.
 * Uploaded means PUT finished (verifying / backed_up / skipped).
 */

export type BackupItemStatus =
  | "queued"
  | "authorizing"
  | "uploading"
  | "verifying"
  | "backed_up"
  | "failed"
  | "skipped";

export type BackupOutcome = "scanning" | "preparing" | "uploading" | "verifying" | "complete" | "incomplete" | "failed" | "cancelled" | "empty" | "stalled";

export function isVerifiedStatus(status: string) {
  return status === "backed_up" || status === "skipped";
}

export function isUploadedStatus(status: string) {
  return status === "verifying" || status === "backed_up" || status === "skipped";
}

export function summarizeBackup(
  items: Array<{ status: string; size?: number }>,
  cancelled = false,
  stalled = false,
) {
  const eligible = items.length;
  const verified = items.filter((item) => isVerifiedStatus(item.status)).length;
  const uploaded = items.filter((item) => isUploadedStatus(item.status)).length;
  const failed = items.filter((item) => item.status === "failed").length;
  const pending = eligible - verified - failed;
  const complete = !cancelled && !stalled && eligible > 0 && verified === eligible && failed === 0 && pending === 0;
  const bytesTotal = items.reduce((sum, item) => sum + Math.max(0, item.size ?? 0), 0);
  const bytesUploaded = items
    .filter((item) => isUploadedStatus(item.status) || item.status === "failed")
    .reduce((sum, item) => sum + (isUploadedStatus(item.status) ? Math.max(0, item.size ?? 0) : 0), 0);
  const bytesVerified = items
    .filter((item) => isVerifiedStatus(item.status))
    .reduce((sum, item) => sum + Math.max(0, item.size ?? 0), 0);

  let outcome: BackupOutcome = "uploading";
  if (cancelled) outcome = "cancelled";
  else if (stalled) outcome = "stalled";
  else if (eligible === 0) outcome = "empty";
  else if (complete) outcome = "complete";
  else if (pending === 0 && failed > 0) outcome = verified === 0 ? "failed" : "incomplete";
  else if (uploaded >= eligible && verified < eligible) outcome = "verifying";
  else if (items.some((item) => item.status === "verifying")) outcome = "verifying";
  else if (items.some((item) => item.status === "uploading" || item.status === "authorizing" || item.status === "queued")) outcome = "uploading";

  const uploadRatio = bytesTotal > 0 ? bytesUploaded / bytesTotal : (eligible ? uploaded / eligible : 0);
  const verifyRatio = eligible ? verified / eligible : 0;
  const percent = complete
    ? 100
    : Math.min(99, Math.round(uploadRatio * 70 + verifyRatio * 29));

  return {
    eligible,
    verified,
    uploaded,
    failed,
    pending,
    complete,
    outcome,
    bytesTotal,
    bytesUploaded,
    bytesVerified,
    localDeleteSafety: complete ? "allowed" as const : "blocked" as const,
    percent,
  };
}
