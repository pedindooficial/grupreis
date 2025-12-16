import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import EmployeeModel from "@/models/Employee";
import TeamModel from "@/models/Team";
import MachineModel from "@/models/Machine";

const fileRefSchema = z.object({
  name: z.string(),
  mime: z.string(),
  size: z.number(),
  data: z.string()
});

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.string().optional(),
  email: z.string().email("E-mail inválido").optional(),
  phone: z.string().optional(),
  document: z.string().optional(),
  docRg: z.string().optional(),
  docCnh: z.string().optional(),
  docAddressProof: z.string().optional(),
  docCv: z.string().optional(),
  docRgFile: fileRefSchema.optional(),
  docCnhFile: fileRefSchema.optional(),
  docAddressProofFile: fileRefSchema.optional(),
  docCvFile: fileRefSchema.optional(),
  status: z.enum(["ativo", "inativo"]).optional(),
  hireDate: z.string().optional(),
  salary: z.number().min(0).optional(),
  teamId: z.string().optional(),
  teamName: z.string().optional(),
  machineId: z.string().optional(),
  machineName: z.string().optional(),
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

    let teamName = parsed.data.teamName;
    if (parsed.data.teamId) {
      const team = await TeamModel.findById(parsed.data.teamId).lean();
      if (team) {
        teamName = team.name || teamName;
      }
    }

    let machineName = parsed.data.machineName;
    if (parsed.data.machineId) {
      const machine = await MachineModel.findById(parsed.data.machineId).lean();
      if (machine) {
        machineName = machine.name || machineName;
      }
    }

    const updated = await EmployeeModel.findByIdAndUpdate(
      params.id,
      { ...parsed.data, teamName, machineName },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    console.error("PUT /api/employees/[id] error", error);
    return NextResponse.json(
      { error: "Falha ao atualizar funcionário", detail: error?.message || "Erro interno" },
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
    const deleted = await EmployeeModel.findByIdAndDelete(params.id);
    if (!deleted) {
      return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("DELETE /api/employees/[id] error", error);
    return NextResponse.json(
      { error: "Falha ao excluir funcionário", detail: error?.message || "Erro interno" },
      { status: 500 }
    );
  }
}


