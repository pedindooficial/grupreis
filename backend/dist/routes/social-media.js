"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const SocialMedia_1 = __importDefault(require("../models/SocialMedia"));
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
// Delete social media item
router.delete("/:id", async (req, res) => {
    try {
        await (0, db_1.connectDB)();
        const deleted = await SocialMedia_1.default.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: "Item não encontrado" });
        }
        res.json({ data: { _id: deleted._id } });
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
