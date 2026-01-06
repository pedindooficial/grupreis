"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const multer_1 = __importDefault(require("multer"));
const s3_1 = require("../services/s3");
const router = (0, express_1.Router)();
// Configure multer for memory storage
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});
const presignedUrlSchema = zod_1.z.object({
    key: zod_1.z.string().min(1, "Chave do arquivo é obrigatória"),
    expiresIn: zod_1.z.number().min(1).max(604800).optional() // Max 7 days
});
const presignedUploadUrlSchema = zod_1.z.object({
    filename: zod_1.z.string().min(1, "Nome do arquivo é obrigatório"),
    contentType: zod_1.z.string().min(1, "Tipo de conteúdo é obrigatório"),
    category: zod_1.z.string().min(1, "Categoria é obrigatória"),
    id: zod_1.z.string().optional(), // Optional ID for organizing files (e.g., clientId, jobId)
    expiresIn: zod_1.z.number().min(1).max(604800).optional() // Max 7 days
});
const deleteFileSchema = zod_1.z.object({
    key: zod_1.z.string().min(1, "Chave do arquivo é obrigatória")
});
/**
 * POST /api/files/upload
 * Upload a file directly to S3 (default bucket)
 */
router.post("/upload", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Nenhum arquivo enviado" });
        }
        const { category, id } = req.body;
        if (!category) {
            return res.status(400).json({ error: "Categoria é obrigatória" });
        }
        const key = (0, s3_1.generateFileKey)(category, req.file.originalname, id);
        const result = await (0, s3_1.uploadFile)(req.file.buffer, key, req.file.mimetype, {
            originalName: req.file.originalname,
            uploadedAt: new Date().toISOString()
        });
        res.json({
            data: {
                key: result.key,
                url: result.url,
                bucket: result.bucket,
                filename: req.file.originalname,
                size: req.file.size,
                contentType: req.file.mimetype
            }
        });
    }
    catch (error) {
        console.error("POST /api/files/upload error", error);
        res.status(500).json({
            error: "Falha ao fazer upload do arquivo",
            detail: error?.message || "Erro interno"
        });
    }
});
/**
 * POST /api/files/upload-social
 * Upload a file directly to S3 social media bucket (reisfundacoes)
 */
router.post("/upload-social", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Nenhum arquivo enviado" });
        }
        const { category, id } = req.body;
        if (!category) {
            return res.status(400).json({ error: "Categoria é obrigatória" });
        }
        const socialBucket = (0, s3_1.getSocialBucketName)();
        // For social media, use simpler key format: category/filename
        const timestamp = Date.now();
        const sanitizedFilename = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
        const key = id ? `${category}/${id}/${timestamp}_${sanitizedFilename}` : `${category}/${timestamp}_${sanitizedFilename}`;
        const result = await (0, s3_1.uploadFile)(req.file.buffer, key, req.file.mimetype, {
            originalName: req.file.originalname,
            uploadedAt: new Date().toISOString()
        }, socialBucket);
        res.json({
            data: {
                key: result.key,
                url: result.url,
                bucket: result.bucket,
                filename: req.file.originalname,
                size: req.file.size,
                contentType: req.file.mimetype
            }
        });
    }
    catch (error) {
        console.error("POST /api/files/upload-social error", error);
        res.status(500).json({
            error: "Falha ao fazer upload do arquivo",
            detail: error?.message || "Erro interno"
        });
    }
});
/**
 * POST /api/files/presigned-url
 * Generate a presigned URL for downloading a file
 */
router.post("/presigned-url", async (req, res) => {
    try {
        const parsed = presignedUrlSchema.safeParse(req.body);
        if (!parsed.success) {
            return res
                .status(400)
                .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
        }
        const url = await (0, s3_1.getPresignedUrl)(parsed.data.key, parsed.data.expiresIn);
        res.json({ data: { url, key: parsed.data.key, expiresIn: parsed.data.expiresIn || 3600 } });
    }
    catch (error) {
        console.error("POST /api/files/presigned-url error", error);
        res.status(500).json({
            error: "Falha ao gerar URL assinada",
            detail: error?.message || "Erro interno"
        });
    }
});
/**
 * POST /api/files/presigned-upload-url
 * Generate a presigned URL for uploading a file directly from the client
 */
router.post("/presigned-upload-url", async (req, res) => {
    try {
        const parsed = presignedUploadUrlSchema.safeParse(req.body);
        if (!parsed.success) {
            return res
                .status(400)
                .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
        }
        const key = (0, s3_1.generateFileKey)(parsed.data.category, parsed.data.filename, parsed.data.id);
        const url = await (0, s3_1.getPresignedUploadUrl)(key, parsed.data.contentType, parsed.data.expiresIn);
        res.json({
            data: {
                url,
                key,
                expiresIn: parsed.data.expiresIn || 3600,
                method: "PUT"
            }
        });
    }
    catch (error) {
        console.error("POST /api/files/presigned-upload-url error", error);
        res.status(500).json({
            error: "Falha ao gerar URL de upload assinada",
            detail: error?.message || "Erro interno"
        });
    }
});
/**
 * DELETE /api/files/:key
 * Delete a file from S3
 * Note: The key should be URL-encoded
 */
router.delete("/:key", async (req, res) => {
    try {
        const key = decodeURIComponent(req.params.key);
        if (!key || key.trim() === "") {
            return res.status(400).json({ error: "Chave do arquivo é obrigatória" });
        }
        await (0, s3_1.deleteFile)(key);
        res.json({ ok: true, message: "Arquivo excluído com sucesso" });
    }
    catch (error) {
        console.error("DELETE /api/files/:key error", error);
        res.status(500).json({
            error: "Falha ao excluir arquivo",
            detail: error?.message || "Erro interno"
        });
    }
});
exports.default = router;
