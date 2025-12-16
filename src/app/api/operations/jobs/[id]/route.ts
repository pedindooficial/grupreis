import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import TeamModel from "@/models/Team";
import JobModel from "@/models/Job";

const bodySchema = z.object({
  token: z.string().min(4),
  password: z.string().min(4),
  status: z.enum(["pendente", "em_execucao", "concluida", "cancelada"]),
  startedAt: z.string().optional(),
  finishedAt: z.string().optional()
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
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
    const team = await TeamModel.findOne({ operationToken: parsed.data.token });
    if (!team) {
      return NextResponse.json({ error: "Link inválido" }, { status: 404 });
    }
    if (team.operationPass !== parsed.data.password) {
      return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
    }

    const update: any = {
      status: parsed.data.status
    };
    if (parsed.data.startedAt) update.startedAt = parsed.data.startedAt;
    if (parsed.data.finishedAt) update.finishedAt = parsed.data.finishedAt;

    const updated = await JobModel.findByIdAndUpdate(params.id, update, {
      new: true,
      runValidators: true
    });

    if (!updated) {
      return NextResponse.json({ error: "OS não encontrada" }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    console.error("PATCH /api/operations/jobs/[id] error", error);
    return NextResponse.json(
      { error: "Falha ao atualizar OS", detail: error?.message || "Erro interno" },
      { status: 500 }
    );
  }
}


