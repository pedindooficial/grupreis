import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import ClientModel from "@/models/Client";

const clientSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  personType: z.enum(["cpf", "cnpj"]).optional(),
  docNumber: z.string().optional(),
  contact: z.string().optional(),
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

export async function GET() {
  try {
    if (!process.env.MONGODB_URI) {
      return NextResponse.json(
        { error: "Configure MONGODB_URI no .env.local" },
        { status: 500 }
      );
    }

    await connectDB();
    const clients = await ClientModel.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ data: clients });
  } catch (error: any) {
    console.error("GET /api/clients error", error);
    return NextResponse.json(
      { error: "Falha ao carregar clientes", detail: error?.message || "Erro interno" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = clientSchema.safeParse(body);

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
    const docNumber = parsed.data.docNumber?.trim();
    const personType = parsed.data.personType || "cpf";

    if (docNumber) {
      const exists = await ClientModel.findOne({ docNumber, personType }).lean();
      if (exists) {
        return NextResponse.json(
          { error: "Cliente já cadastrado com este documento." },
          { status: 409 }
        );
      }
    }

    const created = await ClientModel.create({
      ...parsed.data,
      personType,
      docNumber
    });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/clients error", error);
    return NextResponse.json(
      { error: "Falha ao salvar cliente", detail: error?.message || "Erro interno" },
      { status: 500 }
    );
  }
}

