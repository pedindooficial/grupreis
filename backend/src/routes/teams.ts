import { Router } from "express";
import { z } from "zod";
import { connectDB } from "../db";
import TeamModel from "../models/Team";
import EmployeeModel from "../models/Employee";

const router = Router();

const teamSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  status: z.enum(["ativa", "inativa"]).optional(),
  leader: z.string().optional(),
  notes: z.string().optional(),
  members: z.array(z.string().min(1)).min(1, "Informe ao menos um membro"),
  employeeIds: z.array(z.string()).optional()
});

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  status: z.enum(["ativa", "inativa"]).optional(),
  leader: z.string().optional(),
  notes: z.string().optional(),
  members: z.array(z.string().min(1)).min(1).optional(),
  employeeIds: z.array(z.string()).optional(),
  operationPass: z.string().min(4).optional()
});

router.get("/", async (req, res) => {
  try {
    await connectDB();
    const includeLocation = req.query.locations === "true";
    const selectFields = includeLocation ? "_id name status currentLocation" : undefined;
    const teams = await TeamModel.find()
      .select(selectFields)
      .sort({ createdAt: -1 })
      .lean();
    
    // Debug: log teams with locations
    if (includeLocation) {
      const teamsWithLocation = teams.filter((t: any) => t.currentLocation?.latitude && t.currentLocation?.longitude);
      console.log(`[GET /api/teams] Total teams: ${teams.length}, Teams with location: ${teamsWithLocation.length}`);
    }
    
    res.json({ data: teams });
  } catch (error: any) {
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

    await connectDB();
    const created = await TeamModel.create({
      ...parsed.data,
      status: parsed.data.status || "ativa"
    });

    if (parsed.data.employeeIds && parsed.data.employeeIds.length > 0) {
      await EmployeeModel.updateMany(
        { _id: { $in: parsed.data.employeeIds } },
        { teamId: created._id, teamName: created.name }
      );
    }

    res.status(201).json({ data: created });
  } catch (error: any) {
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

    await connectDB();

    const currentTeam = await TeamModel.findById(req.params.id).lean();

    const updated = await TeamModel.findByIdAndUpdate(req.params.id, parsed.data, {
      new: true,
      runValidators: true
    });

    if (!updated) {
      return res.status(404).json({ error: "Equipe não encontrada" });
    }

    if (parsed.data.employeeIds !== undefined) {
      if (currentTeam) {
        const previousEmployees = await EmployeeModel.find({
          teamId: req.params.id
        })
          .select("_id")
          .lean();

        const previousEmployeeIds = previousEmployees.map((e) => e._id.toString());
        const newEmployeeIds = parsed.data.employeeIds?.map((id) => id.toString()) || [];

        const toRemove = previousEmployeeIds.filter((id) => !newEmployeeIds.includes(id));

        if (toRemove.length > 0) {
          await EmployeeModel.updateMany(
            { _id: { $in: toRemove } },
            { teamId: null, teamName: null }
          );
        }
      }

      if (parsed.data.employeeIds && parsed.data.employeeIds.length > 0) {
        await EmployeeModel.updateMany(
          { _id: { $in: parsed.data.employeeIds } },
          { teamId: updated._id, teamName: updated.name }
        );
      }
    } else if (parsed.data.name) {
      await EmployeeModel.updateMany(
        { teamId: req.params.id },
        { teamName: parsed.data.name }
      );
    }

    res.json({ data: updated });
  } catch (error: any) {
    console.error("PUT /api/teams/:id error", error);
    res.status(500).json({
      error: "Falha ao atualizar equipe",
      detail: error?.message || "Erro interno"
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await connectDB();

    await EmployeeModel.updateMany(
      { teamId: req.params.id },
      { teamId: null, teamName: null }
    );

    const deleted = await TeamModel.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Equipe não encontrada" });
    }
    res.json({ ok: true });
  } catch (error: any) {
    console.error("DELETE /api/teams/:id error", error);
    res.status(500).json({
      error: "Falha ao excluir equipe",
      detail: error?.message || "Erro interno"
    });
  }
});

// Update team location
const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().optional()
});

router.post("/:id/location", async (req, res) => {
  try {
    const parsed = locationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
    }

    await connectDB();

    const updated = await TeamModel.findByIdAndUpdate(
      req.params.id,
      {
        currentLocation: {
          latitude: parsed.data.latitude,
          longitude: parsed.data.longitude,
          address: parsed.data.address,
          timestamp: new Date()
        }
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Equipe não encontrada" });
    }

    res.json({ data: updated.currentLocation });
  } catch (error: any) {
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
    await connectDB();

    const team = await TeamModel.findById(req.params.id)
      .select("currentLocation name")
      .lean();

    if (!team) {
      return res.status(404).json({ error: "Equipe não encontrada" });
    }

    if (!team.currentLocation) {
      return res.json({ data: null });
    }

    res.json({ data: team.currentLocation });
  } catch (error: any) {
    console.error("GET /api/teams/:id/location error", error);
    res.status(500).json({
      error: "Falha ao obter localização",
      detail: error?.message || "Erro interno"
    });
  }
});

export default router;



