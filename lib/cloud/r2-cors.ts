/**
 * Browser CORS contract for private R2 signed PUTs.
 * Does not change bucket privacy, object ACLs, or who may set backed_up.
 * Owners apply R2_BROWSER_PUT_CORS JSON on the R2 bucket CORS policy.
 *
 * Actual browser PUT (see browserSignedPutHeaders) sends only:
 *   Content-Type
 *   x-amz-checksum-sha256
 * CORS AllowedHeaders is a safe superset so AWS/R2 preflight cannot fail
 * if the runtime adds a related x-amz checksum header.
 */

export const R2_LOCAL_UPLOAD_ORIGIN = "http://localhost:3002";
export const R2_PRODUCTION_UPLOAD_ORIGINS = [
  "https://candler.dev",
  "https://www.candler.dev",
] as const;

/** Headers the signed URL requires the browser to send (not hoisted into the query). */
export const R2_SIGNED_PUT_REQUEST_HEADERS = [
  "content-type",
  "x-amz-checksum-sha256",
] as const;

/** Headers Cloudflare R2 CORS must allow for preflight. Superset of signed PUT headers. */
export const R2_CORS_ALLOWED_HEADERS = [
  "content-type",
  "content-md5",
  "x-amz-checksum-sha256",
  "x-amz-checksum-algorithm",
  "x-amz-content-sha256",
] as const;

export function browserSignedPutHeaders(contentType: string, checksumSha256: string) {
  return {
    "Content-Type": contentType.trim() || "application/octet-stream",
    "x-amz-checksum-sha256": checksumSha256,
  };
}

export function browserSignedPutHeaderNames() {
  return Object.keys(browserSignedPutHeaders("application/octet-stream", "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="))
    .map((name) => name.toLowerCase())
    .sort();
}

export function r2AllowedOrigins() {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const origins = new Set<string>([R2_LOCAL_UPLOAD_ORIGIN, ...R2_PRODUCTION_UPLOAD_ORIGINS]);
  if (site && /^https?:\/\//i.test(site)) origins.add(site);
  return [...origins];
}

export const R2_BROWSER_PUT_CORS = [
  {
    AllowedOrigins: r2AllowedOrigins(),
    AllowedMethods: ["PUT", "GET", "HEAD"],
    AllowedHeaders: [...R2_CORS_ALLOWED_HEADERS],
    ExposeHeaders: ["etag", "x-amz-checksum-sha256", "x-amz-request-id"],
    MaxAgeSeconds: 86400,
  },
] as const;
