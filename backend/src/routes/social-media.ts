import { Router } from "express";
import { z } from "zod";
import multer from "multer";
import { connectDB } from "../db";
import SocialMediaModel from "../models/SocialMedia";
import { deleteFile, getSocialBucketName, uploadFile } from "../services/s3";

const router = Router();

// Configure multer for memory storage (50MB max)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and videos
    const allowedMimes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "video/mp4",
      "video/mpeg",
      "video/quicktime",
      "video/x-msvideo"
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Tipo de arquivo não permitido. Use imagens (JPEG, PNG, GIF, WebP) ou vídeos (MP4, MPEG, MOV, AVI)."));
    }
  }
});

const socialMediaSchema = z.object({
  type: z.enum(["image", "video"]),
  url: z.string().min(1, "URL obrigatória"),
  title: z.string().min(1, "Título obrigatório"),
  description: z.string().optional(),
  order: z.number().int().default(0),
  active: z.boolean().default(true)
});

const updateSchema = z.object({
  type: z.enum(["image", "video"]).optional(),
  url: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  order: z.number().int().optional(),
  active: z.boolean().optional(),
  approved: z.boolean().optional() // For client uploads
});

// Get all social media items
router.get("/", async (_req, res) => {
  try {
    await connectDB();
    const items = await SocialMediaModel.find()
      .sort({ order: 1, createdAt: -1 })
      .lean();
    res.json({ data: items });
  } catch (error: any) {
    console.error("GET /api/social-media error", error);
    res.status(500).json({
      error: "Falha ao carregar mídias sociais",
      detail: error?.message || "Erro interno"
    });
  }
});

// Get active social media items (for public API)
// Only shows items that are active AND (not client uploads OR approved client uploads)
router.get("/public", async (_req, res) => {
  try {
    await connectDB();
    const items = await SocialMediaModel.find({
      active: true,
      $or: [
        { clientUpload: { $ne: true } }, // Not a client upload
        { clientUpload: true, approved: true } // Client upload that is approved
      ]
    })
      .select("type url title description")
      .sort({ order: 1, createdAt: -1 })
      .lean();
    res.json({ data: items });
  } catch (error: any) {
    console.error("GET /api/social-media/public error", error);
    res.status(500).json({
      error: "Falha ao carregar mídias sociais",
      detail: error?.message || "Erro interno"
    });
  }
});

// Get single social media item
router.get("/:id", async (req, res) => {
  try {
    await connectDB();
    const item = await SocialMediaModel.findById(req.params.id).lean();
    if (!item) {
      return res.status(404).json({ error: "Item não encontrado" });
    }
    res.json({ data: item });
  } catch (error: any) {
    console.error("GET /api/social-media/:id error", error);
    res.status(500).json({
      error: "Falha ao carregar item",
      detail: error?.message || "Erro interno"
    });
  }
});

// Create new social media item
router.post("/", async (req, res) => {
  try {
    const parsed = socialMediaSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
    }

    await connectDB();
    
    // If no order specified, set to max order + 1
    if (parsed.data.order === undefined || parsed.data.order === 0) {
      const maxOrder = await SocialMediaModel.findOne()
        .sort({ order: -1 })
        .select("order")
        .lean();
      parsed.data.order = maxOrder ? (maxOrder.order || 0) + 1 : 1;
    }

    const created = await SocialMediaModel.create(parsed.data);
    res.status(201).json({ data: created });
  } catch (error: any) {
    console.error("POST /api/social-media error", error);
    res.status(500).json({
      error: "Falha ao criar item",
      detail: error?.message || "Erro interno"
    });
  }
});

// Update social media item
router.put("/:id", async (req, res) => {
  try {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
    }

    await connectDB();
    const updated = await SocialMediaModel.findByIdAndUpdate(
      req.params.id,
      parsed.data,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Item não encontrado" });
    }

    res.json({ data: updated });
  } catch (error: any) {
    console.error("PUT /api/social-media/:id error", error);
    res.status(500).json({
      error: "Falha ao atualizar item",
      detail: error?.message || "Erro interno"
    });
  }
});

// Helper function to check if URL is an S3 file (not external like YouTube/Vimeo)
function isS3File(url: string): boolean {
  if (!url) return false;
  
  // Check if it's an external video URL (YouTube, Vimeo)
  const youtubeRegex = /(?:youtube\.com|youtu\.be)/i;
  const vimeoRegex = /vimeo\.com/i;
  
  if (youtubeRegex.test(url) || vimeoRegex.test(url)) {
    return false; // External video URL, not an S3 file
  }
  
  // Check if it's a full S3 URL
  const s3UrlRegex = /https?:\/\/.*\.s3\..*\.amazonaws\.com\/(.+)/i;
  const s3UrlMatch = url.match(s3UrlRegex);
  if (s3UrlMatch) {
    return true; // Full S3 URL
  }
  
  // Check if it's an S3 key (path like "fotos/image.jpg" or "videos/video.mp4")
  // S3 keys typically don't start with http:// or https://
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return true; // Likely an S3 key
  }
  
  // If it's an http/https URL but not YouTube/Vimeo, it might be an external image
  // We'll be conservative and only delete if it looks like an S3 URL
  return false;
}

// Helper function to extract S3 key from URL
function extractS3Key(url: string): string | null {
  if (!url) return null;
  
  // If it's a full S3 URL, extract the key
  const s3UrlRegex = /https?:\/\/.*\.s3\..*\.amazonaws\.com\/(.+)/i;
  const s3UrlMatch = url.match(s3UrlRegex);
  if (s3UrlMatch) {
    return decodeURIComponent(s3UrlMatch[1]);
  }
  
  // If it's already a key (doesn't start with http), return as is
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return url;
  }
  
  return null;
}

// Delete social media item
router.delete("/:id", async (req, res) => {
  try {
    await connectDB();
    const item = await SocialMediaModel.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: "Item não encontrado" });
    }
    
    // Delete S3 file if it's an uploaded file (not external URL)
    if (isS3File(item.url)) {
      try {
        const s3Key = extractS3Key(item.url);
        if (s3Key) {
          console.log(`[Social Media] Deleting S3 file: ${s3Key} from bucket: ${getSocialBucketName()}`);
          await deleteFile(s3Key, getSocialBucketName());
          console.log(`[Social Media] Successfully deleted S3 file: ${s3Key}`);
        }
      } catch (s3Error: any) {
        // Log error but don't fail the delete operation
        // The file might already be deleted or not exist
        console.error(`[Social Media] Error deleting S3 file ${item.url}:`, s3Error);
      }
    } else {
      console.log(`[Social Media] Skipping S3 deletion for external URL: ${item.url}`);
    }
    
    // Delete the database record
    await SocialMediaModel.findByIdAndDelete(req.params.id);
    
    res.json({ data: { _id: item._id } });
  } catch (error: any) {
    console.error("DELETE /api/social-media/:id error", error);
    res.status(500).json({
      error: "Falha ao deletar item",
      detail: error?.message || "Erro interno"
    });
  }
});

// Public endpoint for clients to upload photos/videos
// This endpoint is public (no authentication required)
router.post("/public/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }

    const { title, description, clientName, clientEmail } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Título é obrigatório" });
    }

    // Determine file type
    const isVideo = req.file.mimetype.startsWith("video/");
    const type = isVideo ? "video" : "image";

    await connectDB();

    // Upload to S3 (same folder structure as admin uploads)
    const socialBucket = getSocialBucketName();
    const timestamp = Date.now();
    const sanitizedFilename = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    const category = isVideo ? "videos" : "fotos";
    const key = `${category}/${timestamp}_${sanitizedFilename}`;

    const result = await uploadFile(
      req.file.buffer,
      key,
      req.file.mimetype,
      {
        originalName: req.file.originalname,
        uploadedAt: new Date().toISOString(),
        uploadedBy: "client",
        clientName: clientName || "",
        clientEmail: clientEmail || ""
      },
      socialBucket
    );

    // Create social media item (pending approval)
    const created = await SocialMediaModel.create({
      type,
      url: result.key, // Store S3 key, not full URL
      title: title.trim(),
      description: description?.trim() || "",
      active: false, // Inactive until approved
      clientUpload: true,
      approved: false, // Pending approval
      clientName: clientName?.trim() || undefined,
      clientEmail: clientEmail?.trim() || undefined,
      order: 0 // Will be set when approved
    });

    res.status(201).json({
      data: {
        message: "Upload realizado com sucesso! Seu conteúdo será revisado e publicado em breve.",
        id: created._id
      }
    });
  } catch (error: any) {
    console.error("POST /api/social-media/public/upload error", error);
    
    // Handle multer errors
    if (error.message && error.message.includes("Tipo de arquivo")) {
      return res.status(400).json({
        error: error.message
      });
    }
    
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: "Arquivo muito grande. Tamanho máximo permitido: 50MB"
      });
    }

    res.status(500).json({
      error: "Falha ao fazer upload do arquivo",
      detail: error?.message || "Erro interno"
    });
  }
});

// Get pending client uploads (admin only - requires authentication via middleware)
router.get("/pending", async (req, res) => {
  try {
    await connectDB();
    const items = await SocialMediaModel.find({
      clientUpload: true,
      approved: false
    })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ data: items });
  } catch (error: any) {
    console.error("GET /api/social-media/pending error", error);
    res.status(500).json({
      error: "Falha ao carregar uploads pendentes",
      detail: error?.message || "Erro interno"
    });
  }
});

// Approve client upload (admin only)
router.post("/:id/approve", async (req, res) => {
  try {
    await connectDB();
    const item = await SocialMediaModel.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ error: "Item não encontrado" });
    }

    if (!item.clientUpload) {
      return res.status(400).json({ error: "Este item não é um upload de cliente" });
    }

    if (item.approved) {
      return res.status(400).json({ error: "Este item já foi aprovado" });
    }

    // Set order if not set (max order + 1)
    if (item.order === 0 || !item.order) {
      const maxOrder = await SocialMediaModel.findOne()
        .sort({ order: -1 })
        .select("order")
        .lean();
      item.order = maxOrder ? (maxOrder.order || 0) + 1 : 1;
    }

    // Approve and activate
    item.approved = true;
    item.active = true;
    await item.save();

    res.json({
      data: {
        message: "Upload aprovado com sucesso",
        item
      }
    });
  } catch (error: any) {
    console.error("POST /api/social-media/:id/approve error", error);
    res.status(500).json({
      error: "Falha ao aprovar upload",
      detail: error?.message || "Erro interno"
    });
  }
});

// Reject client upload (admin only) - deletes the item and S3 file
router.post("/:id/reject", async (req, res) => {
  try {
    await connectDB();
    const item = await SocialMediaModel.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ error: "Item não encontrado" });
    }

    if (!item.clientUpload) {
      return res.status(400).json({ error: "Este item não é um upload de cliente" });
    }

    // Delete S3 file if it's an uploaded file
    if (isS3File(item.url)) {
      try {
        const s3Key = extractS3Key(item.url);
        if (s3Key) {
          console.log(`[Social Media] Deleting rejected S3 file: ${s3Key} from bucket: ${getSocialBucketName()}`);
          await deleteFile(s3Key, getSocialBucketName());
          console.log(`[Social Media] Successfully deleted rejected S3 file: ${s3Key}`);
        }
      } catch (s3Error: any) {
        console.error(`[Social Media] Error deleting rejected S3 file ${item.url}:`, s3Error);
        // Continue with deletion even if S3 deletion fails
      }
    }

    // Delete the database record
    await SocialMediaModel.findByIdAndDelete(req.params.id);

    res.json({
      data: {
        message: "Upload rejeitado e removido",
        _id: item._id
      }
    });
  } catch (error: any) {
    console.error("POST /api/social-media/:id/reject error", error);
    res.status(500).json({
      error: "Falha ao rejeitar upload",
      detail: error?.message || "Erro interno"
    });
  }
});

// Reorder items
router.post("/reorder", async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: "Items deve ser um array" });
    }

    await connectDB();
    const updates = items.map((item: { _id: string; order: number }) => ({
      updateOne: {
        filter: { _id: item._id },
        update: { order: item.order }
      }
    }));

    await SocialMediaModel.bulkWrite(updates);
    res.json({ data: { success: true } });
  } catch (error: any) {
    console.error("POST /api/social-media/reorder error", error);
    res.status(500).json({
      error: "Falha ao reordenar itens",
      detail: error?.message || "Erro interno"
    });
  }
});

export default router;

