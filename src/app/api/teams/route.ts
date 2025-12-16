import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import TeamModel from "@/models/Team";
import EmployeeModel from "@/models/Employee";

const teamSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  status: z.enum(["ativa", "inativa"]).optional(),
  leader: z.string().optional(),
  notes: z.string().optional(),
  members: z.array(z.string().min(1)).min(1, "Informe ao menos um membro"),
  employeeIds: z.array(z.string()).optional()
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
    const teams = await TeamModel.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ data: teams });
  } catch (error: any) {
    console.error("GET /api/teams error", error);
    return NextResponse.json(
      { error: "Falha ao carregar equipes", detail: error?.message || "Erro interno" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = teamSchema.safeParse(body);
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
    const created = await TeamModel.create({
      ...parsed.data,
      status: parsed.data.status || "ativa"
    });

    // Vincular funcionários selecionados à equipe
    if (parsed.data.employeeIds && parsed.data.employeeIds.length > 0) {
      await EmployeeModel.updateMany(
        { _id: { $in: parsed.data.employeeIds } },
        { teamId: created._id, teamName: created.name }
      );
    }

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/teams error", error);
    return NextResponse.json(
      { error: "Falha ao salvar equipe", detail: error?.message || "Erro interno" },
      { status: 500 }
    );
  }
}


