"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const Team_1 = __importDefault(require("../models/Team"));
const Job_1 = __importDefault(require("../models/Job"));
const router = (0, express_1.Router)();
const authSchema = zod_1.z.object({
    password: zod_1.z.string().min(4, "Senha obrigatória")
});
const updateJobSchema = zod_1.z.object({
    teamId: zod_1.z.string().min(4).optional(),
    token: zod_1.z.string().min(4).optional(), // Legacy support
    password: zod_1.z.string().min(4),
    status: zod_1.z.enum(["pendente", "em_execucao", "concluida", "cancelada"]),
    startedAt: zod_1.z.string().optional(),
    finishedAt: zod_1.z.string().optional()
}).refine((data) => data.teamId || data.token, {
    message: "Either teamId or token must be provided"
});
// New route: POST /api/operations/team/:id (Preferred)
router.post("/team/:id", async (req, res) => {
    try {
        const parsed = authSchema.safeParse(req.body);
        if (!parsed.success) {
            return res
                .status(400)
                .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
        }
        await (0, db_1.connectDB)();
        const team = await Team_1.default.findById(req.params.id).lean();
        if (!team) {
            return res.status(404).json({ error: "Equipe não encontrada" });
        }
        if (!team.operationPass) {
            return res.status(403).json({ error: "Senha não configurada para esta equipe" });
        }
        if (team.operationPass !== parsed.data.password) {
            return res.status(401).json({ error: "Senha incorreta" });
        }
        const jobs = await Job_1.default.find({
            team: team.name
        })
            .sort({ plannedDate: 1 })
            .lean();
        res.json({ data: { team, jobs } });
    }
    catch (error) {
        console.error("POST /api/operations/team/:id error", error);
        res.status(500).json({
            error: "Falha ao carregar painel",
            detail: error?.message || "Erro interno"
        });
    }
});
// Old route: POST /api/operations/:token (Legacy - for backward compatibility)
router.post("/:token", async (req, res) => {
    try {
        const parsed = authSchema.safeParse(req.body);
        if (!parsed.success) {
            return res
                .status(400)
                .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
        }
        await (0, db_1.connectDB)();
        const team = await Team_1.default.findOne({ operationToken: req.params.token }).lean();
        if (!team) {
            return res.status(404).json({ error: "Link inválido ou expirado. Solicite um novo link ao administrador." });
        }
        if (team.operationPass && team.operationPass !== parsed.data.password) {
            return res.status(401).json({ error: "Senha incorreta" });
        }
        const jobs = await Job_1.default.find({
            team: team.name
        })
            .sort({ plannedDate: 1 })
            .lean();
        res.json({ data: { team, jobs } });
    }
    catch (error) {
        console.error("POST /api/operations/:token error (legacy)", error);
        res.status(500).json({
            error: "Falha ao carregar painel",
            detail: error?.message || "Erro interno"
        });
    }
});
router.patch("/jobs/:id", async (req, res) => {
    try {
        const parsed = updateJobSchema.safeParse(req.body);
        if (!parsed.success) {
            return res
                .status(400)
                .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
        }
        await (0, db_1.connectDB)();
        // Support both new (teamId) and old (token) methods
        let team;
        if (parsed.data.teamId) {
            team = await Team_1.default.findById(parsed.data.teamId).lean();
        }
        else if (parsed.data.token) {
            team = await Team_1.default.findOne({ operationToken: parsed.data.token }).lean();
        }
        if (!team) {
            return res.status(404).json({ error: "Equipe não encontrada" });
        }
        if (!team.operationPass || team.operationPass !== parsed.data.password) {
            return res.status(401).json({ error: "Senha incorreta" });
        }
        const update = {
            status: parsed.data.status
        };
        if (parsed.data.startedAt)
            update.startedAt = parsed.data.startedAt;
        if (parsed.data.finishedAt)
            update.finishedAt = parsed.data.finishedAt;
        const updated = await Job_1.default.findByIdAndUpdate(req.params.id, update, {
            new: true,
            runValidators: true
        }).lean();
        if (!updated) {
            return res.status(404).json({ error: "OS não encontrada" });
        }
        res.json({ data: updated });
    }
    catch (error) {
        console.error("PATCH /api/operations/jobs/:id error", error);
        res.status(500).json({
            error: "Falha ao atualizar OS",
            detail: error?.message || "Erro interno"
        });
    }
});
exports.default = router;
