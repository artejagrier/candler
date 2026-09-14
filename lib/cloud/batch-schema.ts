import { z } from "zod";
import { MAX_FILES_PER_AUTHORIZE_BATCH, MAX_FILES_PER_FINALIZE_BATCH } from "@/lib/cloud/limits";

export const checksumSha256Schema = z.string().regex(/^[A-Za-z0-9+/]{43}=$/);

export const uploadFileDescriptor = z.object({
  filename: z.string().trim().min(1).max(512),
  relativePath: z.string().trim().min(1).max(2048),
  contentType: z.string().min(1).max(255),
  size: z.number().int().positive(),
  checksumSha256: checksumSha256Schema,
}).strict();

export const uploadBatchInput = z.object({
  projectId: z.uuid().nullable().optional(),
  folderId: z.uuid().nullable().optional(),
  files: z.array(uploadFileDescriptor).min(1).max(MAX_FILES_PER_AUTHORIZE_BATCH),
}).strict();

export const finalizeBatchInput = z.object({
  ids: z.array(z.uuid()).min(1).max(MAX_FILES_PER_FINALIZE_BATCH),
}).strict();

export type UploadFileDescriptor = z.infer<typeof uploadFileDescriptor>;
export type UploadBatchInput = z.infer<typeof uploadBatchInput>;
