"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const Maintenance_1 = __importDefault(require("../models/Maintenance"));
const Equipment_1 = __importDefault(require("../models/Equipment"));
const Machine_1 = __importDefault(require("../models/Machine"));
const router = (0, express_1.Router)();
const maintenanceSchema = zod_1.z.object({
    itemId: zod_1.z.string().min(1, "ID do item obrigatório"),
    itemType: zod_1.z.enum(["equipment", "machine"], { required_error: "Tipo do item obrigatório" }),
    date: zod_1.z.string().min(1, "Data obrigatória"),
    type: zod_1.z.string().min(1, "Tipo de manutenção obrigatório"),
    details: zod_1.z.string().optional(),
    cost: zod_1.z.number().min(0).optional(),
    vendor: zod_1.z.string().optional(),
    performedBy: zod_1.z.string().optional(),
    nextMaintenanceDate: zod_1.z.string().optional(),
    nextMaintenanceType: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional()
});
// Get all maintenance records for an item
router.get("/item/:itemId", async (req, res) => {
    try {
        await (0, db_1.connectDB)();
        const { itemId } = req.params;
        const maintenanceRecords = await Maintenance_1.default.find({ itemId })
            .sort({ date: -1 })
            .lean();
        res.json({ data: maintenanceRecords });
    }
    catch (error) {
        console.error("GET /api/maintenance/item/:itemId error", error);
        res.status(500).json({
            error: "Falha ao carregar histórico de manutenção",
            detail: error?.message || "Erro interno"
        });
    }
});
// Get all maintenance records (with optional filters)
router.get("/", async (req, res) => {
    try {
        await (0, db_1.connectDB)();
        const { itemType, itemId } = req.query;
        const filter = {};
        if (itemType)
            filter.itemType = itemType;
        if (itemId)
            filter.itemId = itemId;
        const maintenanceRecords = await Maintenance_1.default.find(filter)
            .sort({ date: -1 })
            .limit(100)
            .lean();
        res.json({ data: maintenanceRecords });
    }
    catch (error) {
        console.error("GET /api/maintenance error", error);
        res.status(500).json({
            error: "Falha ao carregar manutenções",
            detail: error?.message || "Erro interno"
        });
    }
});
// Create a new maintenance record
router.post("/", async (req, res) => {
    try {
        const parsed = maintenanceSchema.safeParse(req.body);
        if (!parsed.success) {
            return res
                .status(400)
                .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
        }
        await (0, db_1.connectDB)();
        // Verify item exists and get its name
        let itemName = "";
        if (parsed.data.itemType === "equipment") {
            const equipment = await Equipment_1.default.findById(parsed.data.itemId).lean();
            if (!equipment) {
                return res.status(404).json({ error: "Equipamento não encontrado" });
            }
            itemName = equipment.name;
        }
        else {
            const machine = await Machine_1.default.findById(parsed.data.itemId).lean();
            if (!machine) {
                return res.status(404).json({ error: "Máquina não encontrada" });
            }
            itemName = machine.name;
        }
        // Create maintenance record
        const maintenance = await Maintenance_1.default.create({
            ...parsed.data,
            itemName
        });
        // Update the item's nextMaintenance if provided
        if (parsed.data.nextMaintenanceDate) {
            const updateData = {
                nextMaintenance: parsed.data.nextMaintenanceDate
            };
            if (parsed.data.nextMaintenanceType) {
                updateData.nextMaintenanceType = parsed.data.nextMaintenanceType;
            }
            if (parsed.data.itemType === "equipment") {
                await Equipment_1.default.findByIdAndUpdate(parsed.data.itemId, updateData);
            }
            else {
                await Machine_1.default.findByIdAndUpdate(parsed.data.itemId, updateData);
            }
        }
        res.status(201).json({ data: maintenance });
    }
    catch (error) {
        console.error("POST /api/maintenance error", error);
        res.status(500).json({
            error: "Falha ao criar registro de manutenção",
            detail: error?.message || "Erro interno"
        });
    }
});
// Update a maintenance record
router.put("/:id", async (req, res) => {
    try {
        const parsed = maintenanceSchema.safeParse(req.body);
        if (!parsed.success) {
            return res
                .status(400)
                .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
        }
        await (0, db_1.connectDB)();
        const maintenance = await Maintenance_1.default.findByIdAndUpdate(req.params.id, parsed.data, { new: true, runValidators: true });
        if (!maintenance) {
            return res.status(404).json({ error: "Registro de manutenção não encontrado" });
        }
        res.json({ data: maintenance });
    }
    catch (error) {
        console.error("PUT /api/maintenance/:id error", error);
        res.status(500).json({
            error: "Falha ao atualizar registro de manutenção",
            detail: error?.message || "Erro interno"
        });
    }
});
// Delete a maintenance record
router.delete("/:id", async (req, res) => {
    try {
        await (0, db_1.connectDB)();
        const maintenance = await Maintenance_1.default.findByIdAndDelete(req.params.id);
        if (!maintenance) {
            return res.status(404).json({ error: "Registro de manutenção não encontrado" });
        }
        res.json({ data: { _id: maintenance._id }, message: "Registro excluído com sucesso" });
    }
    catch (error) {
        console.error("DELETE /api/maintenance/:id error", error);
        res.status(500).json({
            error: "Falha ao excluir registro de manutenção",
            detail: error?.message || "Erro interno"
        });
    }
});
exports.default = router;
