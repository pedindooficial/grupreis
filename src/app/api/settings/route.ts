import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import SettingsModel from "@/models/Settings";

const settingsSchema = z.object({
  companyName: z.string().optional(),
  headquartersAddress: z.string().optional(),
  headquartersStreet: z.string().optional(),
  headquartersNumber: z.string().optional(),
  headquartersNeighborhood: z.string().optional(),
  headquartersCity: z.string().optional(),
  headquartersState: z.string().optional(),
  headquartersZip: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("E-mail inválido").optional()
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
    let settings = await SettingsModel.findOne().lean();
    
    // Se não existir, cria um documento vazio
    if (!settings) {
      settings = await SettingsModel.create({});
    }
    
    return NextResponse.json({ data: settings });
  } catch (error: any) {
    console.error("GET /api/settings error", error);
    return NextResponse.json(
      { error: "Falha ao carregar configurações", detail: error?.message || "Erro interno" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const parsed = settingsSchema.safeParse(body);

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
    
    // Atualiza ou cria o documento de configurações
    const settings = await SettingsModel.findOneAndUpdate(
      {},
      parsed.data,
      { new: true, upsert: true, runValidators: true }
    );

    return NextResponse.json({ data: settings });
  } catch (error: any) {
    console.error("PUT /api/settings error", error);
    return NextResponse.json(
      { error: "Falha ao salvar configurações", detail: error?.message || "Erro interno" },
      { status: 500 }
    );
  }
}

