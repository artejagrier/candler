/**
 * Browser CORS contract for private R2 signed PUTs.
 * Does not change bucket privacy, object ACLs, or who may set backed_up.
 */
export const R2_LOCAL_UPLOAD_ORIGIN = "http://localhost:3002";

export const R2_SIGNED_PUT_REQUEST_HEADERS = [
  "content-type",
  "x-amz-checksum-sha256",
] as const;

export const R2_BROWSER_PUT_CORS = [
  {
    AllowedOrigins: [R2_LOCAL_UPLOAD_ORIGIN],
    AllowedMethods: ["PUT"],
    AllowedHeaders: [...R2_SIGNED_PUT_REQUEST_HEADERS],
    MaxAgeSeconds: 3600,
  },
] as const;
