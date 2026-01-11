"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const SocialMedia_1 = __importDefault(require("../models/SocialMedia"));
const s3_1 = require("../services/s3");
const router = (0, express_1.Router)();
const socialMediaSchema = zod_1.z.object({
    type: zod_1.z.enum(["image", "video"]),
    url: zod_1.z.string().min(1, "URL obrigatória"),
    title: zod_1.z.string().min(1, "Título obrigatório"),
    description: zod_1.z.string().optional(),
    order: zod_1.z.number().int().default(0),
    active: zod_1.z.boolean().default(true)
});
const updateSchema = zod_1.z.object({
    type: zod_1.z.enum(["image", "video"]).optional(),
    url: zod_1.z.string().min(1).optional(),
    title: zod_1.z.string().min(1).optional(),
    description: zod_1.z.string().optional(),
    order: zod_1.z.number().int().optional(),
    active: zod_1.z.boolean().optional()
});
// Get all social media items
router.get("/", async (_req, res) => {
    try {
        await (0, db_1.connectDB)();
        const items = await SocialMedia_1.default.find()
            .sort({ order: 1, createdAt: -1 })
            .lean();
        res.json({ data: items });
    }
    catch (error) {
        console.error("GET /api/social-media error", error);
        res.status(500).json({
            error: "Falha ao carregar mídias sociais",
            detail: error?.message || "Erro interno"
        });
    }
});
// Get active social media items (for public API)
router.get("/public", async (_req, res) => {
    try {
        await (0, db_1.connectDB)();
        const items = await SocialMedia_1.default.find({ active: true })
            .select("type url title description")
            .sort({ order: 1, createdAt: -1 })
            .lean();
        res.json({ data: items });
    }
    catch (error) {
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
        await (0, db_1.connectDB)();
        const item = await SocialMedia_1.default.findById(req.params.id).lean();
        if (!item) {
            return res.status(404).json({ error: "Item não encontrado" });
        }
        res.json({ data: item });
    }
    catch (error) {
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
        await (0, db_1.connectDB)();
        // If no order specified, set to max order + 1
        if (parsed.data.order === undefined || parsed.data.order === 0) {
            const maxOrder = await SocialMedia_1.default.findOne()
                .sort({ order: -1 })
                .select("order")
                .lean();
            parsed.data.order = maxOrder ? (maxOrder.order || 0) + 1 : 1;
        }
        const created = await SocialMedia_1.default.create(parsed.data);
        res.status(201).json({ data: created });
    }
    catch (error) {
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
        await (0, db_1.connectDB)();
        const updated = await SocialMedia_1.default.findByIdAndUpdate(req.params.id, parsed.data, { new: true, runValidators: true });
        if (!updated) {
            return res.status(404).json({ error: "Item não encontrado" });
        }
        res.json({ data: updated });
    }
    catch (error) {
        console.error("PUT /api/social-media/:id error", error);
        res.status(500).json({
            error: "Falha ao atualizar item",
            detail: error?.message || "Erro interno"
        });
    }
});
// Helper function to check if URL is an S3 file (not external like YouTube/Vimeo)
function isS3File(url) {
    if (!url)
        return false;
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
function extractS3Key(url) {
    if (!url)
        return null;
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
        await (0, db_1.connectDB)();
        const item = await SocialMedia_1.default.findById(req.params.id);
        if (!item) {
            return res.status(404).json({ error: "Item não encontrado" });
        }
        // Delete S3 file if it's an uploaded file (not external URL)
        if (isS3File(item.url)) {
            try {
                const s3Key = extractS3Key(item.url);
                if (s3Key) {
                    console.log(`[Social Media] Deleting S3 file: ${s3Key} from bucket: ${(0, s3_1.getSocialBucketName)()}`);
                    await (0, s3_1.deleteFile)(s3Key, (0, s3_1.getSocialBucketName)());
                    console.log(`[Social Media] Successfully deleted S3 file: ${s3Key}`);
                }
            }
            catch (s3Error) {
                // Log error but don't fail the delete operation
                // The file might already be deleted or not exist
                console.error(`[Social Media] Error deleting S3 file ${item.url}:`, s3Error);
            }
        }
        else {
            console.log(`[Social Media] Skipping S3 deletion for external URL: ${item.url}`);
        }
        // Delete the database record
        await SocialMedia_1.default.findByIdAndDelete(req.params.id);
        res.json({ data: { _id: item._id } });
    }
    catch (error) {
        console.error("DELETE /api/social-media/:id error", error);
        res.status(500).json({
            error: "Falha ao deletar item",
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
        await (0, db_1.connectDB)();
        const updates = items.map((item) => ({
            updateOne: {
                filter: { _id: item._id },
                update: { order: item.order }
            }
        }));
        await SocialMedia_1.default.bulkWrite(updates);
        res.json({ data: { success: true } });
    }
    catch (error) {
        console.error("POST /api/social-media/reorder error", error);
        res.status(500).json({
            error: "Falha ao reordenar itens",
            detail: error?.message || "Erro interno"
        });
    }
});
exports.default = router;
