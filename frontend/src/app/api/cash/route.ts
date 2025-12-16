import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import CashTransactionModel from "@/models/CashTransaction";
import ClientModel from "@/models/Client";
import JobModel from "@/models/Job";

const transactionSchema = z.object({
  type: z.enum(["entrada", "saida"]),
  amount: z.number().positive("Valor deve ser maior que zero"),
  description: z.string().min(1, "Descrição obrigatória"),
  date: z.string().min(1, "Data obrigatória"),
  clientId: z.string().optional().nullable(),
  clientName: z.string().optional(),
  jobId: z.string().optional().nullable(),
  jobTitle: z.string().optional(),
  paymentMethod: z.enum(["dinheiro", "pix", "transferencia", "cartao", "cheque", "outro"]),
  category: z.string().optional(),
  notes: z.string().optional()
});

export async function GET(request: Request) {
  try {
    if (!process.env.MONGODB_URI) {
      return NextResponse.json(
        { error: "Configure MONGODB_URI no .env.local" },
        { status: 500 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const type = searchParams.get("type");
    const clientId = searchParams.get("clientId");

    let query: any = {};

    if (date) {
      query.date = date;
    }

    if (type && (type === "entrada" || type === "saida")) {
      query.type = type;
    }

    if (clientId) {
      query.clientId = clientId;
    }

    const transactions = await CashTransactionModel.find(query)
      .sort({ date: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({ data: transactions });
  } catch (error: any) {
    console.error("GET /api/cash error", error);
    return NextResponse.json(
      {
        error: "Falha ao carregar transações",
        detail: error?.message || "Erro interno"
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = transactionSchema.safeParse(body);

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

    let clientName = parsed.data.clientName?.trim();
    let jobTitle = parsed.data.jobTitle?.trim();
    let clientId: string | null = parsed.data.clientId || null;
    let jobId: string | null = parsed.data.jobId || null;

    if (clientId) {
      const client = await ClientModel.findById(clientId).lean();
      if (client) {
        clientName = client.name || clientName;
      }
    }

    if (jobId) {
      const job = await JobModel.findById(jobId).lean();
      if (job) {
        jobTitle = job.title || jobTitle;
        if (!clientId && job.clientId) {
          clientId = job.clientId.toString();
          const client = await ClientModel.findById(job.clientId).lean();
          if (client) {
            clientName = client.name || clientName;
          }
        }
      }
    }

    const created = await CashTransactionModel.create({
      ...parsed.data,
      clientId: clientId || undefined,
      clientName,
      jobId: jobId || undefined,
      jobTitle
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/cash error", error);
    return NextResponse.json(
      {
        error: "Falha ao salvar transação",
        detail: error?.message || "Erro interno"
      },
      { status: 500 }
    );
  }
}

