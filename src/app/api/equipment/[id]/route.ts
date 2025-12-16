import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import EquipmentModel from "@/models/Equipment";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
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
    const updated = await EquipmentModel.findByIdAndUpdate(params.id, parsed.data, {
      new: true,
      runValidators: true
    });

    if (!updated) {
      return NextResponse.json({ error: "Equipamento não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    console.error("PUT /api/equipment/[id] error", error);
    return NextResponse.json(
      { error: "Falha ao atualizar equipamento", detail: error?.message || "Erro interno" },
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
    const deleted = await EquipmentModel.findByIdAndDelete(params.id);
    if (!deleted) {
      return NextResponse.json({ error: "Equipamento não encontrado" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("DELETE /api/equipment/[id] error", error);
    return NextResponse.json(
      { error: "Falha ao excluir equipamento", detail: error?.message || "Erro interno" },
      { status: 500 }
    );
  }
}


