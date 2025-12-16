import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import MachineModel from "@/models/Machine";

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

export async function GET() {
  try {
    if (!process.env.MONGODB_URI) {
      return NextResponse.json(
        { error: "Configure MONGODB_URI no .env.local" },
        { status: 500 }
      );
    }
    await connectDB();
    const machines = await MachineModel.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ data: machines });
  } catch (error: any) {
    console.error("GET /api/machines error", error);
    return NextResponse.json(
      { error: "Falha ao carregar máquinas", detail: error?.message || "Erro interno" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = machineSchema.safeParse(body);

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
    const operatorId = parsed.data.operatorId && parsed.data.operatorId.trim() !== "" 
      ? parsed.data.operatorId 
      : null;
    
    const created = await MachineModel.create({
      ...parsed.data,
      operatorId: operatorId || undefined,
      status: parsed.data.status || "ativa",
      statusOperational: parsed.data.statusOperational || "operando"
    });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/machines error", error);
    return NextResponse.json(
      { error: "Falha ao salvar máquina", detail: error?.message || "Erro interno" },
      { status: 500 }
    );
  }
}


