import { Router } from "express";
import { z } from "zod";
import { connectDB } from "../db";
import CashTransactionModel from "../models/CashTransaction";
import CashierModel from "../models/Cashier";
import ClientModel from "../models/Client";
import JobModel from "../models/Job";

const router = Router();

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

router.get("/", async (req, res) => {
  try {
    await connectDB();

    const { date, type, clientId } = req.query as {
      date?: string;
      type?: string;
      clientId?: string;
    };

    const matchStage: any = {};

    if (date) matchStage.date = date;
    if (type && (type === "entrada" || type === "saida")) matchStage.type = type;
    if (clientId) matchStage.clientId = clientId;

    const pipeline: any[] = [];

    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    pipeline.push(
      { $sort: { date: -1, createdAt: -1 } },
      {
        $project: {
          type: 1,
          amount: 1,
          description: 1,
          date: 1,
          clientId: 1,
          clientName: 1,
          jobId: 1,
          jobTitle: 1,
          paymentMethod: 1,
          category: 1,
          notes: 1,
          cashierId: 1,
          createdAt: 1,
          updatedAt: 1
        }
      }
    );

    const transactions = await CashTransactionModel.aggregate(pipeline);

    res.json({ data: transactions });
  } catch (error: any) {
    console.error("GET /api/cash error", error);
    res.status(500).json({
      error: "Falha ao carregar transações",
      detail: error?.message || "Erro interno"
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const parsed = transactionSchema.safeParse(req.body);

    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
    }

    await connectDB();

    // Check if there's an open cashier
    const openCashier = await CashierModel.findOne({ status: "aberto" }).lean();
    if (!openCashier) {
      return res.status(400).json({
        error: "Nenhum caixa aberto. Abra um caixa antes de registrar transações."
      });
    }

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
      // Check if a transaction already exists for this job
      const existingTransaction = await CashTransactionModel.findOne({
        jobId: jobId,
        type: "entrada"
      }).lean();

      if (existingTransaction) {
        return res.status(409).json({
          error: "Já existe uma transação registrada para esta OS",
          detail: "Cada Order de Serviço pode ter apenas uma transação de recebimento"
        });
      }

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
      jobTitle,
      cashierId: openCashier._id
    });

    res.status(201).json({ data: created });
  } catch (error: any) {
    console.error("POST /api/cash error", error);
    res.status(500).json({
      error: "Falha ao salvar transação",
      detail: error?.message || "Erro interno"
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await connectDB();

    const deleted = await CashTransactionModel.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Transação não encontrada" });
    }

    res.json({ ok: true });
  } catch (error: any) {
    console.error("DELETE /api/cash/:id error", error);
    res.status(500).json({
      error: "Falha ao excluir transação",
      detail: error?.message || "Erro interno"
    });
  }
});

export default router;



