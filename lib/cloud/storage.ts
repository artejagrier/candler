import "server-only";
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function storageConfig() {
  const endpoint=process.env.R2_ENDPOINT, accessKeyId=process.env.R2_ACCESS_KEY_ID, secretAccessKey=process.env.R2_SECRET_ACCESS_KEY, bucket=process.env.R2_BUCKET;
  if(!endpoint||!accessKeyId||!secretAccessKey||!bucket) throw new Error("Object storage is not configured.");
  return { bucket, client:new S3Client({region:"auto",endpoint,credentials:{accessKeyId,secretAccessKey}}) };
}
export async function signedUploadUrl(key:string,contentType:string,checksumSha256:string){const {client,bucket}=storageConfig();return getSignedUrl(client,new PutObjectCommand({Bucket:bucket,Key:key,ContentType:contentType,ChecksumSHA256:checksumSha256}),{expiresIn:900});}
export async function signedDownloadUrl(key:string,filename:string){const {client,bucket}=storageConfig();return getSignedUrl(client,new GetObjectCommand({Bucket:bucket,Key:key,ResponseContentDisposition:`attachment; filename*=UTF-8''${encodeURIComponent(filename)}`}),{expiresIn:300});}
export async function inspectObject(key:string){const{client,bucket}=storageConfig();const result=await client.send(new HeadObjectCommand({Bucket:bucket,Key:key}));return{size:result.ContentLength??-1,checksumSha256:result.ChecksumSHA256??null,contentType:result.ContentType??null};}
export async function deleteObject(key:string){const{client,bucket}=storageConfig();await client.send(new DeleteObjectCommand({Bucket:bucket,Key:key}));}
