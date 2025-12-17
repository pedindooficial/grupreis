"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const Catalog_1 = __importDefault(require("../models/Catalog"));
const auth_1 = require("../middleware/auth");
const audit_1 = require("../services/audit");
const router = (0, express_1.Router)();
// All catalog routes require authentication and admin role
router.use(auth_1.authenticate);
router.use(auth_1.requireAdmin);
const priceVariationSchema = zod_1.z.object({
    diameter: zod_1.z.number().min(0, "Diâmetro deve ser positivo"),
    soilType: zod_1.z.enum(["argiloso", "arenoso", "rochoso", "misturado", "outro"]),
    access: zod_1.z.enum(["livre", "limitado", "restrito"]),
    price: zod_1.z.number().min(0, "Preço deve ser positivo"),
    executionTime: zod_1.z.number().min(0, "Tempo de execução deve ser positivo").optional()
});
const catalogSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Nome obrigatório"),
    description: zod_1.z.string().optional(),
    category: zod_1.z.string().optional(),
    photos: zod_1.z.array(zod_1.z.string()).optional(),
    priceVariations: zod_1.z
        .array(priceVariationSchema)
        .min(1, "Pelo menos uma variação de preço é obrigatória"),
    active: zod_1.z.boolean().optional()
});
const updateCatalogSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    description: zod_1.z.string().optional(),
    category: zod_1.z.string().optional(),
    photos: zod_1.z.array(zod_1.z.string()).optional(),
    priceVariations: zod_1.z.array(priceVariationSchema).min(1).optional(),
    active: zod_1.z.boolean().optional()
});
// GET /api/catalog - List all catalog items
router.get("/", async (req, res) => {
    try {
        await (0, db_1.connectDB)();
        const { search, category, active } = req.query;
        const filter = {};
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
                { category: { $regex: search, $options: "i" } }
            ];
        }
        if (category && category !== "all") {
            filter.category = category;
        }
        if (active !== undefined) {
            filter.active = active === "true";
        }
        const items = await Catalog_1.default.find(filter).sort({ createdAt: -1 }).lean();
        res.json({ data: items });
    }
    catch (error) {
        console.error("GET /api/catalog error", error);
        res.status(500).json({
            error: "Falha ao carregar catálogo",
            detail: error?.message || "Erro interno"
        });
    }
});
// GET /api/catalog/:id - Get single catalog item
router.get("/:id", async (req, res) => {
    try {
        await (0, db_1.connectDB)();
        const item = await Catalog_1.default.findById(req.params.id).lean();
        if (!item) {
            return res.status(404).json({ error: "Item do catálogo não encontrado" });
        }
        res.json({ data: item });
    }
    catch (error) {
        console.error("GET /api/catalog/:id error", error);
        res.status(500).json({
            error: "Falha ao carregar item do catálogo",
            detail: error?.message || "Erro interno"
        });
    }
});
// POST /api/catalog - Create new catalog item
router.post("/", async (req, res) => {
    try {
        const parsed = catalogSchema.safeParse(req.body);
        if (!parsed.success) {
            return res
                .status(400)
                .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
        }
        await (0, db_1.connectDB)();
        const item = await Catalog_1.default.create({
            ...parsed.data,
            active: parsed.data.active !== undefined ? parsed.data.active : true
        });
        // Log create action
        if (req.user) {
            await (0, audit_1.logAudit)(req, {
                action: "create",
                resource: "other",
                resourceId: item._id.toString(),
                resourceName: item.name,
                userId: req.user.id,
                userEmail: req.user.email,
                userName: req.user.name,
                details: `Item de catálogo criado: ${item.name}`
            });
        }
        res.status(201).json({ data: item });
    }
    catch (error) {
        console.error("POST /api/catalog error", error);
        res.status(500).json({
            error: "Falha ao criar item do catálogo",
            detail: error?.message || "Erro interno"
        });
    }
});
// PUT /api/catalog/:id - Update catalog item
router.put("/:id", async (req, res) => {
    try {
        const parsed = updateCatalogSchema.safeParse(req.body);
        if (!parsed.success) {
            console.error("Validation error:", parsed.error.errors);
            return res
                .status(400)
                .json({
                error: "Dados inválidos",
                issues: parsed.error.flatten(),
                details: parsed.error.errors
            });
        }
        await (0, db_1.connectDB)();
        const originalItem = await Catalog_1.default.findById(req.params.id).lean();
        if (!originalItem) {
            return res.status(404).json({ error: "Item do catálogo não encontrado" });
        }
        const updated = await Catalog_1.default.findByIdAndUpdate(req.params.id, parsed.data, { new: true, runValidators: true }).lean();
        if (!updated) {
            return res.status(404).json({ error: "Item do catálogo não encontrado" });
        }
        // Log update action
        if (req.user) {
            await (0, audit_1.logAudit)(req, {
                action: "update",
                resource: "other",
                resourceId: updated._id.toString(),
                resourceName: updated.name,
                userId: req.user.id,
                userEmail: req.user.email,
                userName: req.user.name,
                details: `Item de catálogo atualizado: ${updated.name}`
            });
        }
        res.json({ data: updated });
    }
    catch (error) {
        console.error("PUT /api/catalog/:id error", error);
        res.status(500).json({
            error: "Falha ao atualizar item do catálogo",
            detail: error?.message || "Erro interno"
        });
    }
});
// DELETE /api/catalog/:id - Delete catalog item
router.delete("/:id", async (req, res) => {
    try {
        await (0, db_1.connectDB)();
        const item = await Catalog_1.default.findById(req.params.id).lean();
        if (!item) {
            return res.status(404).json({ error: "Item do catálogo não encontrado" });
        }
        await Catalog_1.default.findByIdAndDelete(req.params.id);
        // Log delete action
        if (req.user) {
            await (0, audit_1.logAudit)(req, {
                action: "delete",
                resource: "other",
                resourceId: item._id?.toString(),
                resourceName: item.name,
                userId: req.user.id,
                userEmail: req.user.email,
                userName: req.user.name,
                details: `Item de catálogo excluído: ${item.name}`
            });
        }
        res.json({ ok: true, message: "Item do catálogo excluído com sucesso" });
    }
    catch (error) {
        console.error("DELETE /api/catalog/:id error", error);
        res.status(500).json({
            error: "Falha ao excluir item do catálogo",
            detail: error?.message || "Erro interno"
        });
    }
});
exports.default = router;
