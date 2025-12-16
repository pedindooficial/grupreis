import { Router } from "express";
import { z } from "zod";
import { connectDB } from "../db";
import MachineModel from "../models/Machine";

const router = Router();

const machineSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  plate: z.string().optional(),
  model: z.string().optional(),
  year: z.number().optional(),
  chassi: z.string().optional(),
  renavam: z.string().optional(),
  category: z.string().optional(),
  ownerCompany: z.string().optional(),
  internalCode: z.string().optional(),
  fuelType: z.string().optional(),
  fuelAverage: z.number().optional(),
  fuelUnit: z.string().optional(),
  tankCapacityL: z.number().optional(),
  consumptionKmPerL: z.number().optional(),
  useType: z.enum(["leve", "medio", "pesado"]).optional(),
  autonomyEstimated: z.number().optional(),
  hourmeterStart: z.number().optional(),
  odometerKm: z.number().optional(),
  weightKg: z.number().optional(),
  loadCapacityKg: z.number().optional(),
  status: z.enum(["ativa", "inativa"]).optional(),
  statusOperational: z.enum(["operando", "manutencao", "parada", "inativa"]).optional(),
  lastMaintenance: z.string().optional(),
  nextMaintenance: z.string().optional(),
  maintenanceType: z.enum(["preventiva", "corretiva"]).optional(),
  maintenanceVendor: z.string().optional(),
  maintenanceCostAvg: z.number().optional(),
  requiredLicense: z.string().optional(),
  mandatoryTraining: z.boolean().optional(),
  checklistRequired: z.boolean().optional(),
  lastInspection: z.string().optional(),
  laudoValidity: z.string().optional(),
  operatorId: z.string().optional(),
  operatorName: z.string().optional(),
  notes: z.string().optional()
});

router.get("/", async (_req, res) => {
  try {
    await connectDB();
    // Para lista, usamos apenas campos necessários (projeção leve)
    const machines = await MachineModel.aggregate([
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
  } catch (error: any) {
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

    await connectDB();

    const operatorId =
      parsed.data.operatorId && parsed.data.operatorId.trim() !== ""
        ? parsed.data.operatorId
        : null;

    const created = await MachineModel.create({
      ...parsed.data,
      operatorId: operatorId || undefined,
      status: parsed.data.status || "ativa",
      statusOperational: parsed.data.statusOperational || "operando"
    });

    res.status(201).json({ data: created });
  } catch (error: any) {
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

    await connectDB();

    const operatorId =
      parsed.data.operatorId && parsed.data.operatorId.trim() !== ""
        ? parsed.data.operatorId
        : null;

    const updated = await MachineModel.findByIdAndUpdate(
      req.params.id,
      {
        ...parsed.data,
        operatorId: operatorId || undefined
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Máquina não encontrada" });
    }

    res.json({ data: updated });
  } catch (error: any) {
    console.error("PUT /api/machines/:id error", error);
    res.status(500).json({
      error: "Falha ao atualizar máquina",
      detail: error?.message || "Erro interno"
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await connectDB();

    const deleted = await MachineModel.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Máquina não encontrada" });
    }

    res.json({ ok: true });
  } catch (error: any) {
    console.error("DELETE /api/machines/:id error", error);
    res.status(500).json({
      error: "Falha ao excluir máquina",
      detail: error?.message || "Erro interno"
    });
  }
});

export default router;



