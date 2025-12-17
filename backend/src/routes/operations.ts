import { Router } from "express";
import { z } from "zod";
import { connectDB } from "../db";
import TeamModel from "../models/Team";
import JobModel from "../models/Job";

const router = Router();

const authSchema = z.object({
  password: z.string().min(4, "Senha obrigatória")
});

const updateJobSchema = z.object({
  teamId: z.string().min(4).optional(),
  token: z.string().min(4).optional(), // Legacy support
  password: z.string().min(4),
  status: z.enum(["pendente", "em_execucao", "concluida", "cancelada"]),
  startedAt: z.string().optional(),
  finishedAt: z.string().optional()
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

    await connectDB();

    const team = await TeamModel.findById(req.params.id).lean();
    if (!team) {
      return res.status(404).json({ error: "Equipe não encontrada" });
    }

    if (!team.operationPass) {
      return res.status(403).json({ error: "Senha não configurada para esta equipe" });
    }

    if (team.operationPass !== parsed.data.password) {
      return res.status(401).json({ error: "Senha incorreta" });
    }

    const jobs = await JobModel.find({
      team: team.name
    })
      .sort({ plannedDate: 1 })
      .lean();

    res.json({ data: { team, jobs } });
  } catch (error: any) {
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

    await connectDB();

    const team = await TeamModel.findOne({ operationToken: req.params.token }).lean();
    if (!team) {
      return res.status(404).json({ error: "Link inválido ou expirado. Solicite um novo link ao administrador." });
    }

    if (team.operationPass && team.operationPass !== parsed.data.password) {
      return res.status(401).json({ error: "Senha incorreta" });
    }

    const jobs = await JobModel.find({
      team: team.name
    })
      .sort({ plannedDate: 1 })
      .lean();

    res.json({ data: { team, jobs } });
  } catch (error: any) {
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

    await connectDB();

    // Support both new (teamId) and old (token) methods
    let team;
    if (parsed.data.teamId) {
      team = await TeamModel.findById(parsed.data.teamId).lean();
    } else if (parsed.data.token) {
      team = await TeamModel.findOne({ operationToken: parsed.data.token }).lean();
    }

    if (!team) {
      return res.status(404).json({ error: "Equipe não encontrada" });
    }

    if (!team.operationPass || team.operationPass !== parsed.data.password) {
      return res.status(401).json({ error: "Senha incorreta" });
    }

    const update: any = {
      status: parsed.data.status
    };
    if (parsed.data.startedAt) update.startedAt = parsed.data.startedAt;
    if (parsed.data.finishedAt) update.finishedAt = parsed.data.finishedAt;

    const updated = await JobModel.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true
    }).lean();

    if (!updated) {
      return res.status(404).json({ error: "OS não encontrada" });
    }

    res.json({ data: updated });
  } catch (error: any) {
    console.error("PATCH /api/operations/jobs/:id error", error);
    res.status(500).json({
      error: "Falha ao atualizar OS",
      detail: error?.message || "Erro interno"
    });
  }
});

export default router;

