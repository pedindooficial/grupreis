import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import MachineModel from "@/models/Machine";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
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

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (!process.env.MONGODB_URI) {
      return NextResponse.json(
        { error: "Configure MONGODB_URI no .env.local" },
        { status: 500 }
      );
    }

    await connectDB();
    
    // Tratar operatorId: se for string vazia, converter para null
    const updateData: any = { ...parsed.data };
    if (updateData.operatorId !== undefined) {
      updateData.operatorId = updateData.operatorId && updateData.operatorId.trim() !== "" 
        ? updateData.operatorId 
        : null;
    }
    
    const updated = await MachineModel.findByIdAndUpdate(params.id, updateData, {
      new: true,
      runValidators: true
    });

    if (!updated) {
      return NextResponse.json({ error: "Máquina não encontrada" }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    console.error("PUT /api/machines/[id] error", error);
    return NextResponse.json(
      { error: "Falha ao atualizar máquina", detail: error?.message || "Erro interno" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!process.env.MONGODB_URI) {
      return NextResponse.json(
        { error: "Configure MONGODB_URI no .env.local" },
        { status: 500 }
      );
    }

    await connectDB();
    const deleted = await MachineModel.findByIdAndDelete(params.id);
    if (!deleted) {
      return NextResponse.json({ error: "Máquina não encontrada" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("DELETE /api/machines/[id] error", error);
    return NextResponse.json(
      { error: "Falha ao excluir máquina", detail: error?.message || "Erro interno" },
      { status: 500 }
    );
  }
}


