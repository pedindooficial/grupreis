import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import CashTransactionModel from "@/models/CashTransaction";
import ClientModel from "@/models/Client";
import JobModel from "@/models/Job";

const transactionSchema = z.object({
  type: z.enum(["entrada", "saida"]).optional(),
  amount: z.number().positive().optional(),
  description: z.string().min(1).optional(),
  date: z.string().min(1).optional(),
  clientId: z.string().optional().nullable(),
  clientName: z.string().optional(),
  jobId: z.string().optional().nullable(),
  jobTitle: z.string().optional(),
  paymentMethod: z.enum(["dinheiro", "pix", "transferencia", "cartao", "cheque", "outro"]).optional(),
  category: z.string().optional(),
  notes: z.string().optional()
});

export async function GET(
  request: Request,
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
    const transaction = await CashTransactionModel.findById(params.id).lean();

    if (!transaction) {
      return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 });
    }

    return NextResponse.json({ data: transaction });
  } catch (error: any) {
    console.error("GET /api/cash/[id] error", error);
    return NextResponse.json(
      {
        error: "Falha ao carregar transação",
        detail: error?.message || "Erro interno"
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const existing = await CashTransactionModel.findById(params.id);
    if (!existing) {
      return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 });
    }

    let clientName = parsed.data.clientName?.trim();
    let jobTitle = parsed.data.jobTitle?.trim();
    let clientId: string | null = parsed.data.clientId !== undefined ? (parsed.data.clientId || null) : existing.clientId?.toString() || null;
    let jobId: string | null = parsed.data.jobId !== undefined ? (parsed.data.jobId || null) : existing.jobId?.toString() || null;

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

    const updated = await CashTransactionModel.findByIdAndUpdate(
      params.id,
      {
        ...parsed.data,
        clientId: clientId || undefined,
        clientName: clientName || existing.clientName,
        jobId: jobId || undefined,
        jobTitle: jobTitle || existing.jobTitle
      },
      { new: true, runValidators: true }
    );

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    console.error("PUT /api/cash/[id] error", error);
    return NextResponse.json(
      {
        error: "Falha ao atualizar transação",
        detail: error?.message || "Erro interno"
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
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
    const deleted = await CashTransactionModel.findByIdAndDelete(params.id);

    if (!deleted) {
      return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 });
    }

    return NextResponse.json({ data: { id: params.id } });
  } catch (error: any) {
    console.error("DELETE /api/cash/[id] error", error);
    return NextResponse.json(
      {
        error: "Falha ao excluir transação",
        detail: error?.message || "Erro interno"
      },
      { status: 500 }
    );
  }
}

