"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFile = uploadFile;
exports.getPresignedUrl = getPresignedUrl;
exports.getPresignedUploadUrl = getPresignedUploadUrl;
exports.deleteFile = deleteFile;
exports.getSocialBucketName = getSocialBucketName;
exports.generateFileKey = generateFileKey;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const s3Client = new client_s3_1.S3Client({
    region: process.env.AWS_REGION || "sa-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ""
    }
});
const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || "";
const SOCIAL_BUCKET_NAME = "reisfundacoes";
/**
 * Upload a file to S3
 * @param bucketName - Optional bucket name. If not provided, uses default BUCKET_NAME
 */
async function uploadFile(file, key, contentType, metadata, bucketName) {
    const targetBucket = bucketName || BUCKET_NAME;
    if (!targetBucket) {
        throw new Error("Bucket name não configurado");
    }
    const command = new client_s3_1.PutObjectCommand({
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
async function getPresignedUrl(key, expiresIn = 3600, bucketName) {
    const targetBucket = bucketName || BUCKET_NAME;
    if (!targetBucket) {
        throw new Error("Bucket name não configurado");
    }
    const command = new client_s3_1.GetObjectCommand({
        Bucket: targetBucket,
        Key: key
    });
    return await (0, s3_request_presigner_1.getSignedUrl)(s3Client, command, { expiresIn });
}
/**
 * Generate a presigned URL for uploading a file
 * @param key - S3 object key
 * @param contentType - MIME type of the file
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @param bucketName - Optional bucket name. If not provided, uses default BUCKET_NAME
 */
async function getPresignedUploadUrl(key, contentType, expiresIn = 3600, bucketName) {
    const targetBucket = bucketName || BUCKET_NAME;
    if (!targetBucket) {
        throw new Error("Bucket name não configurado");
    }
    const command = new client_s3_1.PutObjectCommand({
        Bucket: targetBucket,
        Key: key,
        ContentType: contentType
    });
    return await (0, s3_request_presigner_1.getSignedUrl)(s3Client, command, { expiresIn });
}
/**
 * Delete a file from S3
 * @param bucketName - Optional bucket name. If not provided, uses default BUCKET_NAME
 */
async function deleteFile(key, bucketName) {
    const targetBucket = bucketName || BUCKET_NAME;
    if (!targetBucket) {
        throw new Error("Bucket name não configurado");
    }
    const command = new client_s3_1.DeleteObjectCommand({
        Bucket: targetBucket,
        Key: key
    });
    await s3Client.send(command);
}
/**
 * Get the social media bucket name
 */
function getSocialBucketName() {
    return SOCIAL_BUCKET_NAME;
}
/**
 * Generate a unique file key based on category and filename
 */
function generateFileKey(category, filename, id) {
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const prefix = id ? `${category}/${id}` : category;
    return `${prefix}/${timestamp}_${sanitizedFilename}`;
}
