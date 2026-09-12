export const CLOUD_PLANS = {
  free: { bytes: 10 * 1024 ** 3, label: "Free", price: 0 },
  pro: { bytes: 50 * 1024 ** 3, label: "Pro", price: 18 },
  cloud500: { bytes: 500 * 1024 ** 3, label: "Pro + Cloud 500", price: 29 },
  cloud1tb: { bytes: 1024 * 1024 ** 3, label: "Pro + Cloud 1 TB", price: 39 },
} as const;

export type CloudPlan = keyof typeof CLOUD_PLANS;

export function canUpload(usedBytes: number, incomingBytes: number, plan: CloudPlan): boolean {
  return usedBytes >= 0 && incomingBytes >= 0 && usedBytes + incomingBytes <= CLOUD_PLANS[plan].bytes;
}

export function objectKey(userId: string, workspaceId: string, fileId: string): string {
  const safe = /^[0-9a-f-]{36}$/i;
  if (![userId, workspaceId, fileId].every((part) => safe.test(part))) throw new Error("Invalid storage identifier.");
  return `${userId}/${workspaceId}/${fileId}`;
}
