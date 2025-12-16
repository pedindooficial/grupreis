import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import EquipmentModel from "@/models/Equipment";

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
    const equipments = await EquipmentModel.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ data: equipments });
  } catch (error: any) {
    console.error("GET /api/equipment error", error);
    return NextResponse.json(
      { error: "Falha ao carregar equipamentos", detail: error?.message || "Erro interno" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = equipmentSchema.safeParse(body);

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
    const created = await EquipmentModel.create({
      ...parsed.data,
      status: parsed.data.status || "ativo",
      quantity: parsed.data.quantity ?? 1,
      unit: parsed.data.unit || "un"
    });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/equipment error", error);
    return NextResponse.json(
      { error: "Falha ao salvar equipamento", detail: error?.message || "Erro interno" },
      { status: 500 }
    );
  }
}


