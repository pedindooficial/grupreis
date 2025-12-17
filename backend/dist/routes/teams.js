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
router.get("/", async (_req, res) => {
    try {
        await (0, db_1.connectDB)();
        const teams = await Team_1.default.find().sort({ createdAt: -1 }).lean();
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
exports.default = router;
