import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import ClientModel from "@/models/Client";

const updateSchema = z.object({
  name: z.string().min(2, "Nome obrigatório").optional(),
  personType: z.enum(["cpf", "cnpj"]).optional(),
  docNumber: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("E-mail inválido").optional(),
  address: z.string().optional(),
  addressStreet: z.string().optional(),
  addressNumber: z.string().optional(),
  addressNeighborhood: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().optional(),
  addressZip: z.string().optional()
});

export async function PUT(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await _req.json();
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
    const updated = await ClientModel.findByIdAndUpdate(
      params.id,
      parsed.data,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    console.error("PUT /api/clients/[id] error", error);
    return NextResponse.json(
      { error: "Falha ao atualizar cliente", detail: error?.message || "Erro interno" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  await connectDB();
  const deleted = await ClientModel.findByIdAndDelete(params.id);
  if (!deleted) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

