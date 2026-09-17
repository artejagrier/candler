/**
 * Authoritative Cloud backup outcome. UI must not invent COMPLETE.
 * Verified means backed_up (HeadObject matched) or skipped-as-unchanged.
 */

export type BackupItemStatus =
  | "queued"
  | "authorizing"
  | "uploading"
  | "verifying"
  | "backed_up"
  | "failed"
  | "skipped";

export type BackupOutcome = "scanning" | "preparing" | "uploading" | "verifying" | "complete" | "incomplete" | "failed" | "cancelled" | "empty";

export function isVerifiedStatus(status: string) {
  return status === "backed_up" || status === "skipped";
}

export function summarizeBackup(items: Array<{ status: string }>, cancelled = false) {
  const eligible = items.length;
  const verified = items.filter((item) => isVerifiedStatus(item.status)).length;
  const failed = items.filter((item) => item.status === "failed").length;
  const pending = eligible - verified - failed;
  const complete = !cancelled && eligible > 0 && verified === eligible && failed === 0 && pending === 0;
  let outcome: BackupOutcome = "uploading";
  if (cancelled) outcome = "cancelled";
  else if (eligible === 0) outcome = "empty";
  else if (complete) outcome = "complete";
  else if (pending === 0 && failed > 0) outcome = verified === 0 ? "failed" : "incomplete";
  else if (items.some((item) => item.status === "verifying")) outcome = "verifying";
  else if (items.some((item) => item.status === "uploading" || item.status === "authorizing" || item.status === "queued")) outcome = "uploading";
  return {
    eligible,
    verified,
    failed,
    pending,
    complete,
    outcome,
    localDeleteSafety: complete ? "allowed" as const : "blocked" as const,
    percent: eligible ? Math.min(complete ? 100 : 99, Math.round((verified / eligible) * 100)) : 0,
  };
}
