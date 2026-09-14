/** Presentation labels for redacted audit events. Does not change stored event types. */

const LABELS: Record<string, string> = {
  "project.created": "Project created",
  "project.renamed": "Project renamed",
  "project.deleted": "Project deleted",
  "secret.created": "Secret added",
  "secret.updated": "Secret updated",
  "secret.rotated": "Secret rotated",
  "secret.deleted": "Secret deleted",
  "secret.revealed": "Secret revealed",
  "secret.copied": "Secret copied",
  "secret.env_imported": "Environment imported",
  "authenticator.created": "Authenticator added",
  "authenticator.updated": "Authenticator updated",
  "authenticator.deleted": "Authenticator removed",
  "authenticator.code_copied": "Authenticator code copied",
  "recovery.created": "Recovery codes stored",
  "recovery.deleted": "Recovery codes removed",
  "recovery.revealed": "Recovery codes revealed",
  "recovery.code_used": "Recovery code used",
  "recovery.code_copied": "Recovery code copied",
  "cloud.uploaded": "Cloud backup verified",
  "cloud.downloaded": "File downloaded",
  "cloud.renamed": "Cloud item renamed",
  "cloud.moved": "Cloud item moved",
  "cloud.trash": "Moved to trash",
  "cloud.restore": "Restored from trash",
  "cloud.permanently_deleted": "Permanently deleted",
  "cloud.folder_created": "Folder created",
};

export function activityLabel(eventType: string) {
  return LABELS[eventType] ?? eventType.replaceAll(".", " ");
}

export function activityKind(eventType: string) {
  const root = eventType.split(".")[0];
  switch (root) {
    case "secret":
    case "authenticator":
    case "recovery":
      return "Vault";
    case "cloud":
      return "Cloud";
    case "project":
      return "Project";
    case "agent":
      return "Agent";
    case "billing":
    case "subscription":
      return "Billing";
    default:
      return root;
  }
}
