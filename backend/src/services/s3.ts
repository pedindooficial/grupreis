import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "sa-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ""
  }
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || "";
const SOCIAL_BUCKET_NAME = "reisfundacoes";

export interface UploadResult {
  key: string;
  url: string;
  bucket: string;
}

/**
 * Upload a file to S3
 * @param bucketName - Optional bucket name. If not provided, uses default BUCKET_NAME
 */
export async function uploadFile(
  file: Buffer,
  key: string,
  contentType: string,
  metadata?: Record<string, string>,
  bucketName?: string
): Promise<UploadResult> {
  const targetBucket = bucketName || BUCKET_NAME;
  
  if (!targetBucket) {
    throw new Error("Bucket name não configurado");
  }

  const command = new PutObjectCommand({
    Bucket: targetBucket,
    Key: key,
    Body: file,
    ContentType: contentType,
    Metadata: metadata
  });

  await s3Client.send(command);

  return {
    key,
    url: `https://${targetBucket}.s3.${process.env.AWS_REGION || "sa-east-1"}.amazonaws.com/${key}`,
    bucket: targetBucket
  };
}

/**
 * Generate a presigned URL for downloading a file
 * @param key - S3 object key
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @param bucketName - Optional bucket name. If not provided, uses default BUCKET_NAME
 */
export async function getPresignedUrl(key: string, expiresIn: number = 3600, bucketName?: string): Promise<string> {
  const targetBucket = bucketName || BUCKET_NAME;
  
  if (!targetBucket) {
    throw new Error("Bucket name não configurado");
  }

  const command = new GetObjectCommand({
    Bucket: targetBucket,
    Key: key
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Generate a presigned URL for uploading a file
 * @param key - S3 object key
 * @param contentType - MIME type of the file
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @param bucketName - Optional bucket name. If not provided, uses default BUCKET_NAME
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600,
  bucketName?: string
): Promise<string> {
  const targetBucket = bucketName || BUCKET_NAME;
  
  if (!targetBucket) {
    throw new Error("Bucket name não configurado");
  }

  const command = new PutObjectCommand({
    Bucket: targetBucket,
    Key: key,
    ContentType: contentType
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Delete a file from S3
 * @param bucketName - Optional bucket name. If not provided, uses default BUCKET_NAME
 */
export async function deleteFile(key: string, bucketName?: string): Promise<void> {
  const targetBucket = bucketName || BUCKET_NAME;
  
  if (!targetBucket) {
    throw new Error("Bucket name não configurado");
  }

  const command = new DeleteObjectCommand({
    Bucket: targetBucket,
    Key: key
  });

  await s3Client.send(command);
}

/**
 * Get the social media bucket name
 */
export function getSocialBucketName(): string {
  return SOCIAL_BUCKET_NAME;
}

/**
 * Generate a unique file key based on category and filename
 */
export function generateFileKey(category: string, filename: string, id?: string): string {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  const prefix = id ? `${category}/${id}` : category;
  return `${prefix}/${timestamp}_${sanitizedFilename}`;
}

