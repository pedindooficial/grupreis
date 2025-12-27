import { Router } from "express";
import { z } from "zod";
import { connectDB } from "../db";
import MaintenanceModel from "../models/Maintenance";
import EquipmentModel from "../models/Equipment";
import MachineModel from "../models/Machine";

const router = Router();

const maintenanceSchema = z.object({
  itemId: z.string().min(1, "ID do item obrigatório"),
  itemType: z.enum(["equipment", "machine"], { required_error: "Tipo do item obrigatório" }),
  date: z.string().min(1, "Data obrigatória"),
  type: z.string().min(1, "Tipo de manutenção obrigatório"),
  details: z.string().optional(),
  cost: z.number().min(0).optional(),
  vendor: z.string().optional(),
  performedBy: z.string().optional(),
  nextMaintenanceDate: z.string().optional(),
  nextMaintenanceType: z.string().optional(),
  notes: z.string().optional()
});

// Get all maintenance records for an item
router.get("/item/:itemId", async (req, res) => {
  try {
    await connectDB();
    const { itemId } = req.params;

    const maintenanceRecords = await MaintenanceModel.find({ itemId })
      .sort({ date: -1 })
      .lean();

    res.json({ data: maintenanceRecords });
  } catch (error: any) {
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
    await connectDB();
    const { itemType, itemId } = req.query;

    const filter: any = {};
    if (itemType) filter.itemType = itemType;
    if (itemId) filter.itemId = itemId;

    const maintenanceRecords = await MaintenanceModel.find(filter)
      .sort({ date: -1 })
      .limit(100)
      .lean();

    res.json({ data: maintenanceRecords });
  } catch (error: any) {
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

    await connectDB();

    // Verify item exists and get its name
    let itemName = "";
    if (parsed.data.itemType === "equipment") {
      const equipment = await EquipmentModel.findById(parsed.data.itemId).lean();
      if (!equipment) {
        return res.status(404).json({ error: "Equipamento não encontrado" });
      }
      itemName = equipment.name;
    } else {
      const machine = await MachineModel.findById(parsed.data.itemId).lean();
      if (!machine) {
        return res.status(404).json({ error: "Máquina não encontrada" });
      }
      itemName = machine.name;
    }

    // Create maintenance record
    const maintenance = await MaintenanceModel.create({
      ...parsed.data,
      itemName
    });

    // Update the item's nextMaintenance if provided
    if (parsed.data.nextMaintenanceDate) {
      const updateData: any = {
        nextMaintenance: parsed.data.nextMaintenanceDate
      };
      if (parsed.data.nextMaintenanceType) {
        updateData.nextMaintenanceType = parsed.data.nextMaintenanceType;
      }

      if (parsed.data.itemType === "equipment") {
        await EquipmentModel.findByIdAndUpdate(parsed.data.itemId, updateData);
      } else {
        await MachineModel.findByIdAndUpdate(parsed.data.itemId, updateData);
      }
    }

    res.status(201).json({ data: maintenance });
  } catch (error: any) {
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

    await connectDB();

    const maintenance = await MaintenanceModel.findByIdAndUpdate(
      req.params.id,
      parsed.data,
      { new: true, runValidators: true }
    );

    if (!maintenance) {
      return res.status(404).json({ error: "Registro de manutenção não encontrado" });
    }

    res.json({ data: maintenance });
  } catch (error: any) {
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
    await connectDB();

    const maintenance = await MaintenanceModel.findByIdAndDelete(req.params.id);

    if (!maintenance) {
      return res.status(404).json({ error: "Registro de manutenção não encontrado" });
    }

    res.json({ data: { _id: maintenance._id }, message: "Registro excluído com sucesso" });
  } catch (error: any) {
    console.error("DELETE /api/maintenance/:id error", error);
    res.status(500).json({
      error: "Falha ao excluir registro de manutenção",
      detail: error?.message || "Erro interno"
    });
  }
});

export default router;

