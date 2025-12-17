"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const TravelPricing_1 = __importDefault(require("../models/TravelPricing"));
const router = (0, express_1.Router)();
const travelPricingSchema = zod_1.z.object({
    upToKm: zod_1.z.number().min(0).optional().nullable().or(zod_1.z.literal(null)),
    pricePerKm: zod_1.z.number().min(0).optional().nullable(),
    fixedPrice: zod_1.z.number().min(0).optional().nullable(),
    type: zod_1.z.enum(["per_km", "fixed"]),
    description: zod_1.z.string().min(1, "Descrição é obrigatória"),
    roundTrip: zod_1.z.boolean().default(true),
    order: zod_1.z.number().default(0)
});
// GET all travel pricing rules
router.get("/", async (req, res) => {
    try {
        await (0, db_1.connectDB)();
        const pricings = await TravelPricing_1.default.find().sort({ order: 1 }).lean();
        res.json({ data: pricings });
    }
    catch (error) {
        console.error("GET /api/travel-pricing error", error);
        res.status(500).json({ error: "Falha ao buscar preços de deslocamento", detail: error.message });
    }
});
// GET single travel pricing
router.get("/:id", async (req, res) => {
    try {
        await (0, db_1.connectDB)();
        const pricing = await TravelPricing_1.default.findById(req.params.id).lean();
        if (!pricing) {
            return res.status(404).json({ error: "Preço não encontrado" });
        }
        res.json({ data: pricing });
    }
    catch (error) {
        console.error("GET /api/travel-pricing/:id error", error);
        res.status(500).json({ error: "Falha ao buscar preço", detail: error.message });
    }
});
// POST create new travel pricing
router.post("/", async (req, res) => {
    try {
        const parsed = travelPricingSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: "Dados inválidos", issues: parsed.error.flatten() });
        }
        // Validation: if type is per_km, pricePerKm must be set
        if (parsed.data.type === "per_km" && !parsed.data.pricePerKm) {
            return res.status(400).json({ error: "Preço por km é obrigatório para tipo 'por km'" });
        }
        // Validation: if type is fixed, fixedPrice must be set
        if (parsed.data.type === "fixed" && !parsed.data.fixedPrice) {
            return res.status(400).json({ error: "Preço fixo é obrigatório para tipo 'fixo'" });
        }
        await (0, db_1.connectDB)();
        const newPricing = await TravelPricing_1.default.create(parsed.data);
        res.status(201).json({ data: newPricing });
    }
    catch (error) {
        console.error("POST /api/travel-pricing error", error);
        res.status(500).json({ error: "Falha ao criar preço", detail: error.message });
    }
});
// PUT update travel pricing
router.put("/:id", async (req, res) => {
    try {
        const parsed = travelPricingSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: "Dados inválidos", issues: parsed.error.flatten() });
        }
        // Validation: if type is per_km, pricePerKm must be set
        if (parsed.data.type === "per_km" && !parsed.data.pricePerKm) {
            return res.status(400).json({ error: "Preço por km é obrigatório para tipo 'por km'" });
        }
        // Validation: if type is fixed, fixedPrice must be set
        if (parsed.data.type === "fixed" && !parsed.data.fixedPrice) {
            return res.status(400).json({ error: "Preço fixo é obrigatório para tipo 'fixo'" });
        }
        await (0, db_1.connectDB)();
        const updatedPricing = await TravelPricing_1.default.findByIdAndUpdate(req.params.id, parsed.data, { new: true, runValidators: true }).lean();
        if (!updatedPricing) {
            return res.status(404).json({ error: "Preço não encontrado" });
        }
        res.json({ data: updatedPricing });
    }
    catch (error) {
        console.error("PUT /api/travel-pricing/:id error", error);
        res.status(500).json({ error: "Falha ao atualizar preço", detail: error.message });
    }
});
// DELETE travel pricing
router.delete("/:id", async (req, res) => {
    try {
        await (0, db_1.connectDB)();
        const deleted = await TravelPricing_1.default.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: "Preço não encontrado" });
        }
        res.status(204).send();
    }
    catch (error) {
        console.error("DELETE /api/travel-pricing/:id error", error);
        res.status(500).json({ error: "Falha ao excluir preço", detail: error.message });
    }
});
exports.default = router;
