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
        // Query by teamId (preferred) or fallback to team name for backward compatibility
        const jobs = await Job_1.default.find({
            $or: [
                { teamId: team._id },
                { team: team.name }
            ]
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
        // Query by teamId (preferred) or fallback to team name for backward compatibility
        const jobs = await Job_1.default.find({
            $or: [
                { teamId: team._id },
                { team: team.name }
            ]
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
// Server-Sent Events endpoint for real-time job updates
router.get("/team/:id/watch", async (req, res) => {
    try {
        const { password } = req.query;
        if (!password || typeof password !== "string") {
            return res.status(400).json({ error: "Senha obrigatória" });
        }
        await (0, db_1.connectDB)();
        const team = await Team_1.default.findById(req.params.id).lean();
        if (!team) {
            return res.status(404).json({ error: "Equipe não encontrada" });
        }
        if (!team.operationPass || team.operationPass !== password) {
            return res.status(401).json({ error: "Senha incorreta" });
        }
        // Set up SSE headers
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering
        // Send initial connection message
        res.write(`: connected\n\n`);
        // Watch for changes in jobs collection using MongoDB Change Streams
        // We use a pipeline to filter inserts at the database level for efficiency
        // For updates and deletes, we check in code because:
        // - Updates: We need to catch all updates (status changes, etc.), not just team field updates
        // - Deletes: We can't filter by team at DB level without the deleted document
        const teamIdStr = team._id.toString();
        const changeStream = Job_1.default.watch([
            {
                $match: {
                    $or: [
                        // Filter inserts by teamId (preferred) or team name at database level
                        {
                            operationType: "insert",
                            $or: [
                                { "fullDocument.teamId": teamIdStr },
                                { "fullDocument.team": team.name }
                            ]
                        },
                        // Filter updates where teamId or team field is changed to our team
                        {
                            operationType: "update",
                            $or: [
                                { "updateDescription.updatedFields.teamId": teamIdStr },
                                { "updateDescription.updatedFields.team": team.name }
                            ]
                        },
                        // Allow all other updates and deletes through (we'll check in code)
                        { operationType: "update" },
                        { operationType: "delete" }
                    ]
                }
            }
        ], { fullDocument: "updateLookup" });
        changeStream.on("change", async (change) => {
            try {
                let isRelevant = false;
                let jobId = null;
                const teamIdStr = team._id.toString();
                if (change.operationType === "insert") {
                    // Insert: fullDocument should already be filtered by pipeline
                    const job = change.fullDocument;
                    if (job && (job.teamId?.toString() === teamIdStr || job.team === team.name)) {
                        isRelevant = true;
                        jobId = job._id?.toString() || null;
                    }
                }
                else if (change.operationType === "update") {
                    jobId = change.documentKey?._id?.toString() || null;
                    // Check if teamId or team field was updated to our team
                    const updatedFields = change.updateDescription?.updatedFields || {};
                    if (updatedFields.teamId?.toString() === teamIdStr || updatedFields.team === team.name) {
                        // Team was updated to our team - relevant
                        isRelevant = true;
                    }
                    else if (change.fullDocument) {
                        // If fullDocument is available, check if it belongs to our team
                        if (change.fullDocument.teamId?.toString() === teamIdStr || change.fullDocument.team === team.name) {
                            isRelevant = true;
                        }
                    }
                    else {
                        // Team field wasn't updated, but other fields were - fetch to check current team
                        if (jobId) {
                            const job = await Job_1.default.findById(jobId).lean();
                            if (job && (job.teamId?.toString() === teamIdStr || job.team === team.name)) {
                                isRelevant = true;
                            }
                        }
                    }
                }
                else if (change.operationType === "delete") {
                    // For deletes, we need to refresh the list
                    // The pipeline will catch all deletes, but we should verify it was our team's job
                    // Since we can't check the deleted document, we'll refresh anyway
                    isRelevant = true;
                }
                if (isRelevant) {
                    // Fetch all jobs for the team to send complete updated list
                    // Query by teamId (preferred) or fallback to team name for backward compatibility
                    const jobs = await Job_1.default.find({
                        $or: [
                            { teamId: team._id },
                            { team: team.name }
                        ]
                    })
                        .sort({ plannedDate: 1 })
                        .lean();
                    // Send update to client
                    res.write(`data: ${JSON.stringify({ type: "update", jobs, jobId, operationType: change.operationType })}\n\n`);
                }
            }
            catch (error) {
                console.error("Error in change stream:", error);
                res.write(`event: error\ndata: ${JSON.stringify({ error: "Erro ao processar atualização" })}\n\n`);
            }
        });
        changeStream.on("error", (error) => {
            console.error("Change stream error:", error);
            res.write(`event: error\ndata: ${JSON.stringify({ error: "Erro na conexão" })}\n\n`);
        });
        // Handle client disconnect
        req.on("close", () => {
            console.log(`Client disconnected from team ${req.params.id} watch`);
            changeStream.close();
            res.end();
        });
    }
    catch (error) {
        console.error("GET /api/operations/team/:id/watch error", error);
        if (!res.headersSent) {
            res.status(500).json({
                error: "Falha ao estabelecer conexão",
                detail: error?.message || "Erro interno"
            });
        }
    }
});
exports.default = router;
