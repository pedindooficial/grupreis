import { Router } from "express";
import { z } from "zod";
import { connectDB } from "../db";
import EquipmentModel from "../models/Equipment";

const router = Router();

const equipmentSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  type: z.enum(["equipamento", "epi", "ferramenta"]).optional(),
  category: z.string().optional(),
  patrimony: z.string().optional(),
  serialNumber: z.string().optional(),
  status: z.enum(["ativo", "inativo"]).optional(),
  quantity: z.number().optional(),
  unit: z.string().optional(),
  assignedTo: z.string().optional(),
  location: z.string().optional(),
  nextMaintenance: z.string().optional(),
  nextMaintenanceType: z.string().optional(),
  nextMaintenanceDetails: z.string().optional(),
  notes: z.string().optional()
});

router.get("/", async (_req, res) => {
  try {
    await connectDB();
    // Para lista, projetar apenas campos usados na tabela/filtros
    const equipments = await EquipmentModel.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $project: {
          name: 1,
          type: 1,
          category: 1,
          patrimony: 1,
          serialNumber: 1,
          status: 1,
          quantity: 1,
          unit: 1,
          assignedTo: 1,
          location: 1,
          nextMaintenance: 1,
          nextMaintenanceType: 1,
          nextMaintenanceDetails: 1,
          notes: 1,
          createdAt: 1,
          updatedAt: 1
        }
      }
    ]);
    res.json({ data: equipments });
  } catch (error: any) {
    console.error("GET /api/equipment error", error);
    res.status(500).json({
      error: "Falha ao carregar equipamentos",
      detail: error?.message || "Erro interno"
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const parsed = equipmentSchema.safeParse(req.body);

    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
    }

    await connectDB();
    const created = await EquipmentModel.create({
      ...parsed.data,
      status: parsed.data.status || "ativo",
      quantity: parsed.data.quantity ?? 1,
      unit: parsed.data.unit || "un"
    });

    res.status(201).json({ data: created });
  } catch (error: any) {
    console.error("POST /api/equipment error", error);
    res.status(500).json({
      error: "Falha ao salvar equipamento",
      detail: error?.message || "Erro interno"
    });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const parsed = equipmentSchema.safeParse(req.body);

    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
    }

    await connectDB();

    const updated = await EquipmentModel.findByIdAndUpdate(
      req.params.id,
      parsed.data,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Equipamento não encontrado" });
    }

    res.json({ data: updated });
  } catch (error: any) {
    console.error("PUT /api/equipment/:id error", error);
    res.status(500).json({
      error: "Falha ao atualizar equipamento",
      detail: error?.message || "Erro interno"
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await connectDB();

    const deleted = await EquipmentModel.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Equipamento não encontrado" });
    }

    res.json({ ok: true });
  } catch (error: any) {
    console.error("DELETE /api/equipment/:id error", error);
    res.status(500).json({
      error: "Falha ao excluir equipamento",
      detail: error?.message || "Erro interno"
    });
  }
});

export default router;



