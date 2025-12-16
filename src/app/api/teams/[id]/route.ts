import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import TeamModel from "@/models/Team";
import EmployeeModel from "@/models/Employee";
import crypto from "crypto";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  status: z.enum(["ativa", "inativa"]).optional(),
  leader: z.string().optional(),
  notes: z.string().optional(),
  members: z.array(z.string().min(1)).min(1).optional(),
  employeeIds: z.array(z.string()).optional()
});

const generateSchema = z.object({
  action: z.literal("generateLink"),
  password: z.string().min(4).optional()
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
    
    // Buscar equipe atual para saber quais funcionários estavam vinculados
    const currentTeam = await TeamModel.findById(params.id).lean();
    
    const updated = await TeamModel.findByIdAndUpdate(params.id, parsed.data, {
      new: true,
      runValidators: true
    });

    if (!updated) {
      return NextResponse.json({ error: "Equipe não encontrada" }, { status: 404 });
    }

    // Gerenciar vinculação de funcionários
    if (parsed.data.employeeIds !== undefined) {
      // Remover vinculação de funcionários que não estão mais na equipe
      if (currentTeam) {
        const previousEmployees = await EmployeeModel.find({
          teamId: params.id
        }).select("_id").lean();
        
        const previousEmployeeIds = previousEmployees.map((e) => e._id.toString());
        const newEmployeeIds = parsed.data.employeeIds?.map((id) => id.toString()) || [];
        
        const toRemove = previousEmployeeIds.filter(
          (id) => !newEmployeeIds.includes(id)
        );
        
        if (toRemove.length > 0) {
          await EmployeeModel.updateMany(
            { _id: { $in: toRemove } },
            { teamId: null, teamName: null }
          );
        }
      }

      // Vincular novos funcionários à equipe
      if (parsed.data.employeeIds && parsed.data.employeeIds.length > 0) {
        await EmployeeModel.updateMany(
          { _id: { $in: parsed.data.employeeIds } },
          { teamId: updated._id, teamName: updated.name }
        );
      }
    } else if (parsed.data.name) {
      // Se apenas o nome mudou, atualizar teamName dos funcionários vinculados
      await EmployeeModel.updateMany(
        { teamId: params.id },
        { teamName: parsed.data.name }
      );
    }

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    console.error("PUT /api/teams/[id] error", error);
    return NextResponse.json(
      { error: "Falha ao atualizar equipe", detail: error?.message || "Erro interno" },
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
    
    // Remover vinculação de funcionários antes de excluir a equipe
    await EmployeeModel.updateMany(
      { teamId: params.id },
      { teamId: null, teamName: null }
    );
    
    const deleted = await TeamModel.findByIdAndDelete(params.id);
    if (!deleted) {
      return NextResponse.json({ error: "Equipe não encontrada" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("DELETE /api/teams/[id] error", error);
    return NextResponse.json(
      { error: "Falha ao excluir equipe", detail: error?.message || "Erro interno" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const parsed = generateSchema.safeParse(body);
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

    const baseUrl =
      process.env.NEXTAUTH_URL ||
      process.env.APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    await connectDB();
    const token = crypto.randomBytes(12).toString("hex");
    const pass = parsed.data.password ?? Math.random().toString().slice(2, 8); // 6 dígitos

    const updated = await TeamModel.findByIdAndUpdate(
      params.id,
      { operationToken: token, operationPass: pass },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "Equipe não encontrada" }, { status: 404 });
    }

    const link = `${baseUrl}/operations/${token}`;

    return NextResponse.json({ data: { link, password: pass, team: updated } });
  } catch (error: any) {
    console.error("PATCH /api/teams/[id] error", error);
    return NextResponse.json(
      { error: "Falha ao gerar link", detail: error?.message || "Erro interno" },
      { status: 500 }
    );
  }
}


