import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import TeamModel from "@/models/Team";
import JobModel from "@/models/Job";

const bodySchema = z.object({
  password: z.string().min(4, "Senha obrigatória")
});

export async function POST(
  req: Request,
  { params }: { params: { token: string } }
) {
  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await connectDB();
    const team = await TeamModel.findOne({ operationToken: params.token }).lean();
    if (!team) {
      return NextResponse.json({ error: "Link inválido" }, { status: 404 });
    }
    if (team.operationPass !== parsed.data.password) {
      return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
    }

    const jobs = await JobModel.find({
      team: team.name
    })
      .sort({ plannedDate: 1 })
      .lean();

    return NextResponse.json({ data: { team, jobs } });
  } catch (error: any) {
    console.error("POST /api/operations/[token] error", error);
    return NextResponse.json(
      { error: "Falha ao carregar painel", detail: error?.message || "Erro interno" },
      { status: 500 }
    );
  }
}


