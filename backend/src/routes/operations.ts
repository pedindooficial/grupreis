import { Router } from "express";
import { z } from "zod";
import { connectDB } from "../db";
import TeamModel from "../models/Team";
import JobModel from "../models/Job";
import mongoose from "mongoose";

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

// Server-Sent Events endpoint for real-time job updates
router.get("/team/:id/watch", async (req, res) => {
  try {
    const { password } = req.query;
    
    if (!password || typeof password !== "string") {
      return res.status(400).json({ error: "Senha obrigatória" });
    }

    await connectDB();

    const team = await TeamModel.findById(req.params.id).lean();
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

    // Watch for changes in jobs collection
    // We'll filter by team in the change handler
    const changeStream = JobModel.watch(
      [],
      { fullDocument: "updateLookup" }
    );

    changeStream.on("change", async (change) => {
      try {
        // Check if this change is relevant to our team
        let isRelevant = false;
        
        if (change.operationType === "insert" || change.operationType === "update") {
          const job = change.fullDocument;
          if (job && job.team === team.name) {
            isRelevant = true;
          }
        } else if (change.operationType === "delete") {
          // For deletes, we need to check if the deleted job belonged to this team
          // We'll refresh the list anyway to be safe
          isRelevant = true;
        }

        if (isRelevant) {
          // Fetch all jobs for the team to send complete updated list
          const jobs = await JobModel.find({
            team: team.name
          })
            .sort({ plannedDate: 1 })
            .lean();

          // Send update to client
          res.write(`data: ${JSON.stringify({ type: "update", jobs })}\n\n`);
        }
      } catch (error) {
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
  } catch (error: any) {
    console.error("GET /api/operations/team/:id/watch error", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: "Falha ao estabelecer conexão",
        detail: error?.message || "Erro interno"
      });
    }
  }
});

export default router;

