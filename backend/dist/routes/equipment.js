"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const Equipment_1 = __importDefault(require("../models/Equipment"));
const router = (0, express_1.Router)();
const equipmentSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, "Nome obrigatório"),
    type: zod_1.z.enum(["equipamento", "epi", "ferramenta"]).optional(),
    category: zod_1.z.string().optional(),
    patrimony: zod_1.z.string().optional(),
    serialNumber: zod_1.z.string().optional(),
    status: zod_1.z.enum(["ativo", "inativo"]).optional(),
    quantity: zod_1.z.number().optional(),
    unit: zod_1.z.string().optional(),
    assignedTo: zod_1.z.string().optional(),
    location: zod_1.z.string().optional(),
    nextMaintenance: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional()
});
router.get("/", async (_req, res) => {
    try {
        await (0, db_1.connectDB)();
        // Para lista, projetar apenas campos usados na tabela/filtros
        const equipments = await Equipment_1.default.aggregate([
            { $sort: { createdAt: -1 } },
            {
                $project: {
                    name: 1,
                    type: 1,
                    category: 1,
                    patrimony: 1,
                    serialNumber: 1,
                    status: 1,
                    quantity: 1,
                    unit: 1,
                    assignedTo: 1,
                    location: 1,
                    nextMaintenance: 1,
                    notes: 1,
                    createdAt: 1,
                    updatedAt: 1
                }
            }
        ]);
        res.json({ data: equipments });
    }
    catch (error) {
        console.error("GET /api/equipment error", error);
        res.status(500).json({
            error: "Falha ao carregar equipamentos",
            detail: error?.message || "Erro interno"
        });
    }
});
router.post("/", async (req, res) => {
    try {
        const parsed = equipmentSchema.safeParse(req.body);
        if (!parsed.success) {
            return res
                .status(400)
                .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
        }
        await (0, db_1.connectDB)();
        const created = await Equipment_1.default.create({
            ...parsed.data,
            status: parsed.data.status || "ativo",
            quantity: parsed.data.quantity ?? 1,
            unit: parsed.data.unit || "un"
        });
        res.status(201).json({ data: created });
    }
    catch (error) {
        console.error("POST /api/equipment error", error);
        res.status(500).json({
            error: "Falha ao salvar equipamento",
            detail: error?.message || "Erro interno"
        });
    }
});
router.put("/:id", async (req, res) => {
    try {
        const parsed = equipmentSchema.safeParse(req.body);
        if (!parsed.success) {
            return res
                .status(400)
                .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
        }
        await (0, db_1.connectDB)();
        const updated = await Equipment_1.default.findByIdAndUpdate(req.params.id, parsed.data, { new: true, runValidators: true });
        if (!updated) {
            return res.status(404).json({ error: "Equipamento não encontrado" });
        }
        res.json({ data: updated });
    }
    catch (error) {
        console.error("PUT /api/equipment/:id error", error);
        res.status(500).json({
            error: "Falha ao atualizar equipamento",
            detail: error?.message || "Erro interno"
        });
    }
});
router.delete("/:id", async (req, res) => {
    try {
        await (0, db_1.connectDB)();
        const deleted = await Equipment_1.default.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: "Equipamento não encontrado" });
        }
        res.json({ ok: true });
    }
    catch (error) {
        console.error("DELETE /api/equipment/:id error", error);
        res.status(500).json({
            error: "Falha ao excluir equipamento",
            detail: error?.message || "Erro interno"
        });
    }
});
exports.default = router;
