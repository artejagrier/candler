/**
 * Browser CORS contract for private R2 signed PUTs.
 * Does not change bucket privacy, object ACLs, or who may set backed_up.
 * Owners apply this JSON on the R2 bucket CORS policy.
 */
export const R2_LOCAL_UPLOAD_ORIGIN = "http://localhost:3002";
export const R2_PRODUCTION_UPLOAD_ORIGINS = [
  "https://candler.dev",
  "https://www.candler.dev",
] as const;

export const R2_SIGNED_PUT_REQUEST_HEADERS = [
  "content-type",
  "x-amz-checksum-sha256",
] as const;

export function r2AllowedOrigins() {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const origins = new Set<string>([R2_LOCAL_UPLOAD_ORIGIN, ...R2_PRODUCTION_UPLOAD_ORIGINS]);
  if (site && /^https?:\/\//i.test(site)) origins.add(site);
  return [...origins];
}

export const R2_BROWSER_PUT_CORS = [
  {
    AllowedOrigins: r2AllowedOrigins(),
    AllowedMethods: ["PUT"],
    AllowedHeaders: [...R2_SIGNED_PUT_REQUEST_HEADERS],
    MaxAgeSeconds: 3600,
  },
] as const;
