import { Router } from "express";
import { z } from "zod";
import multer from "multer";
import { uploadFile, getPresignedUrl, getPresignedUploadUrl, deleteFile, generateFileKey } from "../services/s3";

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

const presignedUrlSchema = z.object({
  key: z.string().min(1, "Chave do arquivo é obrigatória"),
  expiresIn: z.number().min(1).max(604800).optional() // Max 7 days
});

const presignedUploadUrlSchema = z.object({
  filename: z.string().min(1, "Nome do arquivo é obrigatório"),
  contentType: z.string().min(1, "Tipo de conteúdo é obrigatório"),
  category: z.string().min(1, "Categoria é obrigatória"),
  id: z.string().optional(), // Optional ID for organizing files (e.g., clientId, jobId)
  expiresIn: z.number().min(1).max(604800).optional() // Max 7 days
});

const deleteFileSchema = z.object({
  key: z.string().min(1, "Chave do arquivo é obrigatória")
});

/**
 * POST /api/files/upload
 * Upload a file directly to S3
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

    const key = generateFileKey(category, req.file.originalname, id);
    const result = await uploadFile(req.file.buffer, key, req.file.mimetype, {
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
  } catch (error: any) {
    console.error("POST /api/files/upload error", error);
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

    const url = await getPresignedUrl(parsed.data.key, parsed.data.expiresIn);

    res.json({ data: { url, key: parsed.data.key, expiresIn: parsed.data.expiresIn || 3600 } });
  } catch (error: any) {
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

    const key = generateFileKey(parsed.data.category, parsed.data.filename, parsed.data.id);
    const url = await getPresignedUploadUrl(key, parsed.data.contentType, parsed.data.expiresIn);

    res.json({
      data: {
        url,
        key,
        expiresIn: parsed.data.expiresIn || 3600,
        method: "PUT"
      }
    });
  } catch (error: any) {
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

    await deleteFile(key);

    res.json({ ok: true, message: "Arquivo excluído com sucesso" });
  } catch (error: any) {
    console.error("DELETE /api/files/:key error", error);
    res.status(500).json({
      error: "Falha ao excluir arquivo",
      detail: error?.message || "Erro interno"
    });
  }
});

export default router;

