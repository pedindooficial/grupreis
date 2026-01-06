"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const Team_1 = __importDefault(require("../models/Team"));
const Employee_1 = __importDefault(require("../models/Employee"));
const router = (0, express_1.Router)();
const teamSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, "Nome obrigatório"),
    status: zod_1.z.enum(["ativa", "inativa"]).optional(),
    leader: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
    members: zod_1.z.array(zod_1.z.string().min(1)).min(1, "Informe ao menos um membro"),
    employeeIds: zod_1.z.array(zod_1.z.string()).optional()
});
const updateSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).optional(),
    status: zod_1.z.enum(["ativa", "inativa"]).optional(),
    leader: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
    members: zod_1.z.array(zod_1.z.string().min(1)).min(1).optional(),
    employeeIds: zod_1.z.array(zod_1.z.string()).optional(),
    operationPass: zod_1.z.string().min(4).optional()
});
router.get("/", async (req, res) => {
    try {
        await (0, db_1.connectDB)();
        const includeLocation = req.query.locations === "true";
        const selectFields = includeLocation ? "_id name status currentLocation" : undefined;
        const query = Team_1.default.find();
        if (selectFields) {
            query.select(selectFields);
        }
        const teams = await query
            .sort({ createdAt: -1 })
            .lean();
        // Debug: log teams with locations
        if (includeLocation) {
            const teamsWithLocation = teams.filter((t) => t.currentLocation?.latitude && t.currentLocation?.longitude);
            console.log(`[GET /api/teams] Total teams: ${teams.length}, Teams with location: ${teamsWithLocation.length}`);
        }
        res.json({ data: teams });
    }
    catch (error) {
        console.error("GET /api/teams error", error);
        res.status(500).json({
            error: "Falha ao carregar equipes",
            detail: error?.message || "Erro interno"
        });
    }
});
router.post("/", async (req, res) => {
    try {
        const parsed = teamSchema.safeParse(req.body);
        if (!parsed.success) {
            return res
                .status(400)
                .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
        }
        await (0, db_1.connectDB)();
        const created = await Team_1.default.create({
            ...parsed.data,
            status: parsed.data.status || "ativa"
        });
        if (parsed.data.employeeIds && parsed.data.employeeIds.length > 0) {
            await Employee_1.default.updateMany({ _id: { $in: parsed.data.employeeIds } }, { teamId: created._id, teamName: created.name });
        }
        res.status(201).json({ data: created });
    }
    catch (error) {
        console.error("POST /api/teams error", error);
        res.status(500).json({
            error: "Falha ao salvar equipe",
            detail: error?.message || "Erro interno"
        });
    }
});
router.put("/:id", async (req, res) => {
    try {
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) {
            return res
                .status(400)
                .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
        }
        await (0, db_1.connectDB)();
        const currentTeam = await Team_1.default.findById(req.params.id).lean();
        const updated = await Team_1.default.findByIdAndUpdate(req.params.id, parsed.data, {
            new: true,
            runValidators: true
        });
        if (!updated) {
            return res.status(404).json({ error: "Equipe não encontrada" });
        }
        if (parsed.data.employeeIds !== undefined) {
            if (currentTeam) {
                const previousEmployees = await Employee_1.default.find({
                    teamId: req.params.id
                })
                    .select("_id")
                    .lean();
                const previousEmployeeIds = previousEmployees.map((e) => e._id.toString());
                const newEmployeeIds = parsed.data.employeeIds?.map((id) => id.toString()) || [];
                const toRemove = previousEmployeeIds.filter((id) => !newEmployeeIds.includes(id));
                if (toRemove.length > 0) {
                    await Employee_1.default.updateMany({ _id: { $in: toRemove } }, { teamId: null, teamName: null });
                }
            }
            if (parsed.data.employeeIds && parsed.data.employeeIds.length > 0) {
                await Employee_1.default.updateMany({ _id: { $in: parsed.data.employeeIds } }, { teamId: updated._id, teamName: updated.name });
            }
        }
        else if (parsed.data.name) {
            await Employee_1.default.updateMany({ teamId: req.params.id }, { teamName: parsed.data.name });
        }
        res.json({ data: updated });
    }
    catch (error) {
        console.error("PUT /api/teams/:id error", error);
        res.status(500).json({
            error: "Falha ao atualizar equipe",
            detail: error?.message || "Erro interno"
        });
    }
});
router.delete("/:id", async (req, res) => {
    try {
        await (0, db_1.connectDB)();
        await Employee_1.default.updateMany({ teamId: req.params.id }, { teamId: null, teamName: null });
        const deleted = await Team_1.default.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: "Equipe não encontrada" });
        }
        res.json({ ok: true });
    }
    catch (error) {
        console.error("DELETE /api/teams/:id error", error);
        res.status(500).json({
            error: "Falha ao excluir equipe",
            detail: error?.message || "Erro interno"
        });
    }
});
// Update team location
const locationSchema = zod_1.z.object({
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
    address: zod_1.z.string().optional()
});
router.post("/:id/location", async (req, res) => {
    try {
        const parsed = locationSchema.safeParse(req.body);
        if (!parsed.success) {
            return res
                .status(400)
                .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
        }
        await (0, db_1.connectDB)();
        const updated = await Team_1.default.findByIdAndUpdate(req.params.id, {
            currentLocation: {
                latitude: parsed.data.latitude,
                longitude: parsed.data.longitude,
                address: parsed.data.address,
                timestamp: new Date()
            }
        }, { new: true });
        if (!updated) {
            return res.status(404).json({ error: "Equipe não encontrada" });
        }
        res.json({ data: updated.currentLocation });
    }
    catch (error) {
        console.error("POST /api/teams/:id/location error", error);
        res.status(500).json({
            error: "Falha ao atualizar localização",
            detail: error?.message || "Erro interno"
        });
    }
});
// Get team location
router.get("/:id/location", async (req, res) => {
    try {
        await (0, db_1.connectDB)();
        const team = await Team_1.default.findById(req.params.id)
            .select("currentLocation name")
            .lean();
        if (!team) {
            return res.status(404).json({ error: "Equipe não encontrada" });
        }
        if (!team.currentLocation) {
            return res.json({ data: null });
        }
        res.json({ data: team.currentLocation });
    }
    catch (error) {
        console.error("GET /api/teams/:id/location error", error);
        res.status(500).json({
            error: "Falha ao obter localização",
            detail: error?.message || "Erro interno"
        });
    }
});
exports.default = router;
