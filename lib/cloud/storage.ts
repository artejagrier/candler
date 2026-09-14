import "server-only";
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { R2_SIGNED_PUT_REQUEST_HEADERS } from "@/lib/cloud/r2-cors";

type StorageConfig = { bucket: string; client: S3Client };

let cachedStorage: StorageConfig | null = null;

function storageConfig(): StorageConfig {
  if (cachedStorage) return cachedStorage;
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error("Object storage is not configured.");
  }
  cachedStorage = {
    bucket,
    client: new S3Client({
      region: "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    }),
  };
  return cachedStorage;
}

export async function signedUploadUrl(key: string, contentType: string, checksumSha256: string) {
  const { client, bucket } = storageConfig();
  return getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      ChecksumSHA256: checksumSha256,
    }),
    {
      expiresIn: 900,
      unhoistableHeaders: new Set(R2_SIGNED_PUT_REQUEST_HEADERS),
      signableHeaders: new Set(["host", ...R2_SIGNED_PUT_REQUEST_HEADERS]),
    },
  );
}

export async function signedDownloadUrl(key: string, filename: string) {
  const { client, bucket } = storageConfig();
  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    }),
    { expiresIn: 300 },
  );
}

export async function inspectObject(key: string) {
  const { client, bucket } = storageConfig();
  const result = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  return {
    size: result.ContentLength ?? -1,
    checksumSha256: result.ChecksumSHA256 ?? null,
    contentType: result.ContentType ?? null,
  };
}

export async function deleteObject(key: string) {
  const { client, bucket } = storageConfig();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function getObjectBody(key: string, abortSignal?: AbortSignal) {
  const { client, bucket } = storageConfig();
  const result = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    abortSignal ? { abortSignal } : undefined,
  );
  if (!result.Body) throw new Error("Object is missing.");
  return result.Body;
}
