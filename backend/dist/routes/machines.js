"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const Machine_1 = __importDefault(require("../models/Machine"));
const router = (0, express_1.Router)();
const machineSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, "Nome obrigatório"),
    plate: zod_1.z.string().optional(),
    model: zod_1.z.string().optional(),
    year: zod_1.z.number().optional(),
    chassi: zod_1.z.string().optional(),
    renavam: zod_1.z.string().optional(),
    category: zod_1.z.string().optional(),
    ownerCompany: zod_1.z.string().optional(),
    internalCode: zod_1.z.string().optional(),
    fuelType: zod_1.z.string().optional(),
    fuelAverage: zod_1.z.number().optional(),
    fuelUnit: zod_1.z.string().optional(),
    tankCapacityL: zod_1.z.number().optional(),
    consumptionKmPerL: zod_1.z.number().optional(),
    useType: zod_1.z.enum(["leve", "medio", "pesado"]).optional(),
    autonomyEstimated: zod_1.z.number().optional(),
    hourmeterStart: zod_1.z.number().optional(),
    odometerKm: zod_1.z.number().optional(),
    weightKg: zod_1.z.number().optional(),
    loadCapacityKg: zod_1.z.number().optional(),
    status: zod_1.z.enum(["ativa", "inativa"]).optional(),
    statusOperational: zod_1.z.enum(["operando", "manutencao", "parada", "inativa"]).optional(),
    lastMaintenance: zod_1.z.string().optional(),
    nextMaintenance: zod_1.z.string().optional(),
    maintenanceType: zod_1.z.enum(["preventiva", "corretiva"]).optional(),
    maintenanceVendor: zod_1.z.string().optional(),
    maintenanceCostAvg: zod_1.z.number().optional(),
    requiredLicense: zod_1.z.string().optional(),
    mandatoryTraining: zod_1.z.boolean().optional(),
    checklistRequired: zod_1.z.boolean().optional(),
    lastInspection: zod_1.z.string().optional(),
    laudoValidity: zod_1.z.string().optional(),
    operatorId: zod_1.z.string().optional(),
    operatorName: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional()
});
router.get("/", async (_req, res) => {
    try {
        await (0, db_1.connectDB)();
        // Para lista, usamos apenas campos necessários (projeção leve)
        const machines = await Machine_1.default.aggregate([
            { $sort: { createdAt: -1 } },
            {
                $project: {
                    name: 1,
                    plate: 1,
                    model: 1,
                    year: 1,
                    category: 1,
                    ownerCompany: 1,
                    internalCode: 1,
                    fuelType: 1,
                    fuelAverage: 1,
                    fuelUnit: 1,
                    weightKg: 1,
                    loadCapacityKg: 1,
                    status: 1,
                    statusOperational: 1,
                    operatorId: 1,
                    operatorName: 1,
                    nextMaintenance: 1,
                    maintenanceType: 1,
                    maintenanceVendor: 1,
                    maintenanceCostAvg: 1,
                    createdAt: 1,
                    updatedAt: 1
                }
            }
        ]);
        res.json({ data: machines });
    }
    catch (error) {
        console.error("GET /api/machines error", error);
        res.status(500).json({
            error: "Falha ao carregar máquinas",
            detail: error?.message || "Erro interno"
        });
    }
});
router.post("/", async (req, res) => {
    try {
        const parsed = machineSchema.safeParse(req.body);
        if (!parsed.success) {
            return res
                .status(400)
                .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
        }
        await (0, db_1.connectDB)();
        const operatorId = parsed.data.operatorId && parsed.data.operatorId.trim() !== ""
            ? parsed.data.operatorId
            : null;
        const created = await Machine_1.default.create({
            ...parsed.data,
            operatorId: operatorId || undefined,
            status: parsed.data.status || "ativa",
            statusOperational: parsed.data.statusOperational || "operando"
        });
        res.status(201).json({ data: created });
    }
    catch (error) {
        console.error("POST /api/machines error", error);
        res.status(500).json({
            error: "Falha ao salvar máquina",
            detail: error?.message || "Erro interno"
        });
    }
});
router.put("/:id", async (req, res) => {
    try {
        const parsed = machineSchema.safeParse(req.body);
        if (!parsed.success) {
            return res
                .status(400)
                .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
        }
        await (0, db_1.connectDB)();
        const operatorId = parsed.data.operatorId && parsed.data.operatorId.trim() !== ""
            ? parsed.data.operatorId
            : null;
        const updated = await Machine_1.default.findByIdAndUpdate(req.params.id, {
            ...parsed.data,
            operatorId: operatorId || undefined
        }, { new: true, runValidators: true });
        if (!updated) {
            return res.status(404).json({ error: "Máquina não encontrada" });
        }
        res.json({ data: updated });
    }
    catch (error) {
        console.error("PUT /api/machines/:id error", error);
        res.status(500).json({
            error: "Falha ao atualizar máquina",
            detail: error?.message || "Erro interno"
        });
    }
});
router.delete("/:id", async (req, res) => {
    try {
        await (0, db_1.connectDB)();
        const deleted = await Machine_1.default.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: "Máquina não encontrada" });
        }
        res.json({ ok: true });
    }
    catch (error) {
        console.error("DELETE /api/machines/:id error", error);
        res.status(500).json({
            error: "Falha ao excluir máquina",
            detail: error?.message || "Erro interno"
        });
    }
});
exports.default = router;
