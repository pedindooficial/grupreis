import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import JobModel from "@/models/Job";

const updateSchema = z.object({
  status: z.enum(["pendente", "em_execucao", "concluida", "cancelada"]).optional(),
  startedAt: z.string().optional(),
  finishedAt: z.string().optional(),
  team: z.string().optional(),
  notes: z.string().optional(),
  value: z.number().min(0).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  discountValue: z.number().min(0).optional(),
  finalValue: z.number().min(0).optional(),
  cancellationReason: z.string().optional()
});

export async function PATCH(
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
    
    // Calcular desconto e valor final se value ou discountPercent foram fornecidos
    let updateData: any = { ...parsed.data };
    if (updateData.value !== undefined || updateData.discountPercent !== undefined) {
      const existing = await JobModel.findById(params.id).lean();
      const value = updateData.value !== undefined ? updateData.value : (existing?.value || 0);
      const discountPercent = updateData.discountPercent !== undefined ? updateData.discountPercent : (existing?.discountPercent || 0);
      const discountValue = discountPercent > 0 ? (value * discountPercent) / 100 : 0;
      const finalValue = value - discountValue;
      
      updateData.value = value;
      updateData.discountPercent = discountPercent;
      updateData.discountValue = discountValue;
      updateData.finalValue = finalValue;
    }
    
    const updated = await JobModel.findByIdAndUpdate(params.id, updateData, {
      new: true,
      runValidators: true
    });
    if (!updated) {
      return NextResponse.json({ error: "OS não encontrada" }, { status: 404 });
    }
    return NextResponse.json({ data: updated });
  } catch (error: any) {
    console.error("PATCH /api/jobs/[id] error", error);
    return NextResponse.json(
      { error: "Falha ao atualizar OS", detail: error?.message || "Erro interno" },
      { status: 500 }
    );
  }
}


