import { Router } from "express";
import { z } from "zod";
import { connectDB } from "../db";
import CashierModel from "../models/Cashier";
import CashTransactionModel from "../models/CashTransaction";

const router = Router();

const openCashierSchema = z.object({
  openingBalance: z.number().min(0).default(0),
  openedBy: z.string().optional(),
  notes: z.string().optional()
});

const closeCashierSchema = z.object({
  closingBalance: z.number().min(0).optional(),
  closedBy: z.string().optional(),
  notes: z.string().optional()
});

// Get current cashier (open or most recent closed)
router.get("/current", async (_req, res) => {
  try {
    await connectDB();

    // First, try to find an open cashier
    const openCashier = await CashierModel.findOne({ status: "aberto" })
      .sort({ openedAt: -1 })
      .lean();

    if (openCashier) {
      // Calculate current balance from transactions
      const transactions = await CashTransactionModel.find({
        cashierId: openCashier._id
      }).lean();

      const totalEntradas = transactions
        .filter((t) => t.type === "entrada")
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      const totalSaidas = transactions
        .filter((t) => t.type === "saida")
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      const currentBalance = (openCashier.openingBalance || 0) + totalEntradas - totalSaidas;

      return res.json({
        data: {
          ...openCashier,
          currentBalance
        }
      });
    }

    // If no open cashier, return the most recent closed one
    const lastClosed = await CashierModel.findOne({ status: "fechado" })
      .sort({ closedAt: -1 })
      .lean();

    res.json({ data: lastClosed || null });
  } catch (error: any) {
    console.error("GET /api/cashiers/current error", error);
    res.status(500).json({
      error: "Falha ao carregar caixa",
      detail: error?.message || "Erro interno"
    });
  }
});

// List all cashiers
router.get("/", async (req, res) => {
  try {
    await connectDB();

    const { status } = req.query as { status?: string };

    const query: any = {};
    if (status && (status === "aberto" || status === "fechado")) {
      query.status = status;
    }

    const cashiers = await CashierModel.find(query)
      .sort({ openedAt: -1 })
      .lean();

    res.json({ data: cashiers });
  } catch (error: any) {
    console.error("GET /api/cashiers error", error);
    res.status(500).json({
      error: "Falha ao carregar caixas",
      detail: error?.message || "Erro interno"
    });
  }
});

// Open a new cashier
router.post("/open", async (req, res) => {
  try {
    const parsed = openCashierSchema.safeParse(req.body);

    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
    }

    await connectDB();

    // Check if there's already an open cashier
    const existingOpen = await CashierModel.findOne({ status: "aberto" }).lean();
    if (existingOpen) {
      return res.status(409).json({
        error: "Já existe um caixa aberto. Feche o caixa atual antes de abrir outro."
      });
    }

    const created = await CashierModel.create({
      status: "aberto",
      openingBalance: parsed.data.openingBalance || 0,
      openedBy: parsed.data.openedBy,
      notes: parsed.data.notes,
      openedAt: new Date()
    });

    res.status(201).json({ data: created });
  } catch (error: any) {
    console.error("POST /api/cashiers/open error", error);
    res.status(500).json({
      error: "Falha ao abrir caixa",
      detail: error?.message || "Erro interno"
    });
  }
});

// Close the current cashier
router.post("/close", async (req, res) => {
  try {
    const parsed = closeCashierSchema.safeParse(req.body);

    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
    }

    await connectDB();

    const openCashier = await CashierModel.findOne({ status: "aberto" }).lean();
    if (!openCashier) {
      return res.status(404).json({
        error: "Nenhum caixa aberto encontrado"
      });
    }

    // Calculate final balance from transactions
    const transactions = await CashTransactionModel.find({
      cashierId: openCashier._id
    }).lean();

    const totalEntradas = transactions
      .filter((t) => t.type === "entrada")
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalSaidas = transactions
      .filter((t) => t.type === "saida")
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const calculatedBalance =
      (openCashier.openingBalance || 0) + totalEntradas - totalSaidas;

    const closingBalance = parsed.data.closingBalance ?? calculatedBalance;

    const updated = await CashierModel.findByIdAndUpdate(
      openCashier._id,
      {
        status: "fechado",
        closedAt: new Date(),
        closingBalance,
        closedBy: parsed.data.closedBy,
        notes: parsed.data.notes
      },
      { new: true }
    );

    res.json({ data: updated });
  } catch (error: any) {
    console.error("POST /api/cashiers/close error", error);
    res.status(500).json({
      error: "Falha ao fechar caixa",
      detail: error?.message || "Erro interno"
    });
  }
});

export default router;

