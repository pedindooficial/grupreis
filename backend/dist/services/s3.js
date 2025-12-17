"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFile = uploadFile;
exports.getPresignedUrl = getPresignedUrl;
exports.getPresignedUploadUrl = getPresignedUploadUrl;
exports.deleteFile = deleteFile;
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
/**
 * Upload a file to S3
 */
async function uploadFile(file, key, contentType, metadata) {
    if (!BUCKET_NAME) {
        throw new Error("AWS_S3_BUCKET_NAME não configurado");
    }
    const command = new client_s3_1.PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: file,
        ContentType: contentType,
        Metadata: metadata
    });
    await s3Client.send(command);
    return {
        key,
        url: `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || "sa-east-1"}.amazonaws.com/${key}`,
        bucket: BUCKET_NAME
    };
}
/**
 * Generate a presigned URL for downloading a file
 * @param key - S3 object key
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 */
async function getPresignedUrl(key, expiresIn = 3600) {
    if (!BUCKET_NAME) {
        throw new Error("AWS_S3_BUCKET_NAME não configurado");
    }
    const command = new client_s3_1.GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key
    });
    return await (0, s3_request_presigner_1.getSignedUrl)(s3Client, command, { expiresIn });
}
/**
 * Generate a presigned URL for uploading a file
 * @param key - S3 object key
 * @param contentType - MIME type of the file
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 */
async function getPresignedUploadUrl(key, contentType, expiresIn = 3600) {
    if (!BUCKET_NAME) {
        throw new Error("AWS_S3_BUCKET_NAME não configurado");
    }
    const command = new client_s3_1.PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        ContentType: contentType
    });
    return await (0, s3_request_presigner_1.getSignedUrl)(s3Client, command, { expiresIn });
}
/**
 * Delete a file from S3
 */
async function deleteFile(key) {
    if (!BUCKET_NAME) {
        throw new Error("AWS_S3_BUCKET_NAME não configurado");
    }
    const command = new client_s3_1.DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key
    });
    await s3Client.send(command);
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
