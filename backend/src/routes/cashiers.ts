import { Router } from "express";
import { z } from "zod";
import PDFDocument from "pdfkit";
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

// Generate PDF report for a specific cashier
router.get("/:id/pdf", async (req, res) => {
  try {
    await connectDB();

    const cashier = await CashierModel.findById(req.params.id).lean();
    if (!cashier) {
      return res.status(404).json({ error: "Caixa não encontrado" });
    }

    const transactions = await CashTransactionModel.find({
      cashierId: cashier._id
    })
      .sort({ date: 1, createdAt: 1 })
      .lean();

    const totalEntradas = transactions
      .filter((t) => t.type === "entrada")
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalSaidas = transactions
      .filter((t) => t.type === "saida")
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const openingBalance = cashier.openingBalance || 0;
    const closingBalance = cashier.closingBalance ?? openingBalance + totalEntradas - totalSaidas;

    const formatCurrency = (value: number | undefined | null) => {
      const v = value || 0;
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL"
      }).format(v);
    };

    const formatDateTime = (date: Date | string | undefined | null) => {
      if (!date) return "-";
      const d = new Date(date);
      if (isNaN(d.getTime())) return "-";
      return d.toLocaleString("pt-BR");
    };

    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 40, bottom: 40, left: 40, right: 40 }
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="relatorio-caixa-${cashier._id.toString().slice(-6)}.pdf"`
    );

    doc.pipe(res);

    // Helper to draw a box/rectangle
    const drawBox = (x: number, y: number, width: number, height: number, fillColor?: string) => {
      if (fillColor) {
        doc.rect(x, y, width, height).fillColor(fillColor).fill();
      }
      doc.rect(x, y, width, height).stroke();
    };

    // Header with background
    const headerY = 40;
    doc.rect(40, headerY, 515, 35).fillColor("#f0f0f0").fill();
    doc.rect(40, headerY, 515, 35).stroke();
    
    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .fillColor("#000000")
      .text("RELATÓRIO DE CAIXA", 50, headerY + 10, { width: 505, align: "center" });
    
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#666666")
      .text(`ID: ${cashier._id.toString().slice(-8)}`, 50, headerY + 25, { width: 505, align: "center" });

    let currentY = 90;

    // Summary Section with box
    const summaryBoxY = currentY;
    doc.fontSize(14).font("Helvetica-Bold").fillColor("#000000").text("RESUMO", 50, summaryBoxY);
    currentY += 20;

    // Draw summary box
    const summaryHeight = cashier.notes ? 160 : 140; // Increased to accommodate extra spacing for closing balance
    drawBox(50, summaryBoxY - 5, 505, summaryHeight, "#fafafa");
    
    doc.fontSize(10).font("Helvetica");
    let summaryY = summaryBoxY + 10;

    // Status and dates in two columns
    doc.font("Helvetica-Bold").text("Status:", 60, summaryY);
    doc.font("Helvetica").text(cashier.status === "aberto" ? "Aberto" : "Fechado", 120, summaryY);
    
    doc.font("Helvetica-Bold").text("Aberto em:", 300, summaryY);
    doc.font("Helvetica").text(formatDateTime(cashier.openedAt as any), 380, summaryY);
    summaryY += 15;

    if (cashier.closedAt) {
      doc.font("Helvetica-Bold").text("Fechado em:", 60, summaryY);
      doc.font("Helvetica").text(formatDateTime(cashier.closedAt as any), 140, summaryY);
    }
    
    if (cashier.openedBy || cashier.closedBy) {
      if (cashier.openedBy) {
        doc.font("Helvetica-Bold").text("Aberto por:", 300, summaryY);
        doc.font("Helvetica").text(cashier.openedBy, 380, summaryY);
      }
      summaryY += 15;
      if (cashier.closedBy) {
        doc.font("Helvetica-Bold").text("Fechado por:", 60, summaryY);
        doc.font("Helvetica").text(cashier.closedBy, 140, summaryY);
      }
    }
    
    summaryY += 20;

    // Financial summary with better formatting
    doc.moveTo(60, summaryY).lineTo(540, summaryY).strokeColor("#cccccc").stroke();
    summaryY += 10;

    doc.fontSize(11).font("Helvetica-Bold").text("Saldo Inicial:", 60, summaryY);
    doc.font("Helvetica").text(formatCurrency(openingBalance), 200, summaryY, { width: 120, align: "right" });
    summaryY += 15;

    doc.font("Helvetica-Bold").fillColor("#10b981").text("Total de Entradas:", 60, summaryY);
    doc.font("Helvetica").fillColor("#10b981").text(formatCurrency(totalEntradas), 200, summaryY, { width: 120, align: "right" });
    summaryY += 15;

    doc.font("Helvetica-Bold").fillColor("#ef4444").text("Total de Saídas:", 60, summaryY);
    doc.font("Helvetica").fillColor("#ef4444").text(formatCurrency(totalSaidas), 200, summaryY, { width: 120, align: "right" });
    summaryY += 15;

    // Draw separator line with thinner stroke to reduce visual weight and overlap
    doc.moveTo(60, summaryY).lineTo(540, summaryY).lineWidth(0.3).strokeColor("#cccccc").stroke();
    // Reset line width for subsequent operations
    doc.lineWidth(1);
    // Add extra spacing to account for text baseline (text extends upward from Y position)
    // 12pt font needs ~10px clearance above baseline, plus buffer for line
    summaryY += 22; // Spacing after line to prevent text overlap

    doc.fontSize(12).font("Helvetica-Bold").fillColor("#000000").text("Saldo de Fechamento:", 60, summaryY);
    doc.fontSize(12).font("Helvetica-Bold").fillColor("#000000").text(formatCurrency(closingBalance), 200, summaryY, { width: 120, align: "right" });

    if (cashier.notes) {
      summaryY += 20;
      doc.moveTo(60, summaryY).lineTo(540, summaryY).strokeColor("#cccccc").stroke();
      summaryY += 10;
      doc.fontSize(10).font("Helvetica-Bold").text("Observações:", 60, summaryY);
      summaryY += 12;
      doc.font("Helvetica").text(cashier.notes || "-", 60, summaryY, { width: 480 });
    }

    currentY = summaryBoxY + summaryHeight + 20;

    // Transactions Section
    doc.fontSize(14).font("Helvetica-Bold").fillColor("#000000").text("TRANSAÇÕES DO CAIXA", 50, currentY);
    currentY += 15;

    if (transactions.length === 0) {
      doc.fontSize(10).font("Helvetica").fillColor("#666666").text("Nenhuma transação registrada para este caixa.", 50, currentY);
    } else {
      // Table header with background
      const tableStartY = currentY;
      doc.rect(50, tableStartY, 505, 20).fillColor("#e5e5e5").fill();
      doc.rect(50, tableStartY, 505, 20).stroke();
      
      doc.fontSize(9).font("Helvetica-Bold").fillColor("#000000");
      doc.text("Data", 55, tableStartY + 6);
      doc.text("Tipo", 140, tableStartY + 6);
      doc.text("Descrição", 200, tableStartY + 6);
      doc.text("Valor", 480, tableStartY + 6, { width: 70, align: "right" });

      currentY = tableStartY + 25;

      // Group transactions by date for better organization
      const transactionsByDate = new Map<string, typeof transactions>();
      transactions.forEach((t) => {
        const date = t.date || t.createdAt;
        const dateStr = date ? new Date(date).toLocaleDateString("pt-BR") : "Sem data";
        if (!transactionsByDate.has(dateStr)) {
          transactionsByDate.set(dateStr, []);
        }
        transactionsByDate.get(dateStr)!.push(t);
      });

      // Sort dates
      const sortedDates = Array.from(transactionsByDate.keys()).sort((a, b) => {
        const dateA = new Date(a.split("/").reverse().join("-"));
        const dateB = new Date(b.split("/").reverse().join("-"));
        return dateA.getTime() - dateB.getTime();
      });

      sortedDates.forEach((dateStr) => {
        const dateTransactions = transactionsByDate.get(dateStr)!;
        
        // Check if we need a new page
        if (currentY > 720) {
          doc.addPage();
          currentY = 50;
        }

        // Date header
        doc.fontSize(10).font("Helvetica-Bold").fillColor("#333333").text(dateStr, 55, currentY);
        currentY += 15;

        let rowCounter = 0;
        dateTransactions.forEach((t) => {
          // Check if we need a new page
          if (currentY > 720) {
            doc.addPage();
            currentY = 50;
          }

          // Alternate row background
          if (rowCounter % 2 === 0) {
            doc.rect(50, currentY - 3, 505, 15).fillColor("#f9f9f9").fill();
          }
          rowCounter++;

          const date = t.date || t.createdAt;
          const timeStr = date ? new Date(date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
          
          doc.fontSize(9).font("Helvetica").fillColor("#000000");
          doc.text(timeStr, 55, currentY, { width: 80 });
          
          // Type with color
          if (t.type === "entrada") {
            doc.fillColor("#10b981").text("Entrada", 140, currentY, { width: 55 });
          } else {
            doc.fillColor("#ef4444").text("Saída", 140, currentY, { width: 55 });
          }
          doc.fillColor("#000000");
          
          // Description (truncate if too long)
          const desc = (t.description || "-").substring(0, 45);
          doc.text(desc, 200, currentY, { width: 270 });
          
          // Amount with color
          const amount = t.amount || 0;
          if (t.type === "entrada") {
            doc.fillColor("#10b981").text(formatCurrency(amount), 480, currentY, { width: 70, align: "right" });
          } else {
            doc.fillColor("#ef4444").text(`-${formatCurrency(amount)}`, 480, currentY, { width: 70, align: "right" });
          }
          doc.fillColor("#000000");
          
          currentY += 15;
        });

        currentY += 5; // Space between date groups
      });

      // Footer line
      doc.moveTo(50, currentY).lineTo(555, currentY).strokeColor("#cccccc").stroke();
      currentY += 10;

      // Totals at bottom
      doc.fontSize(10).font("Helvetica-Bold").text("Total de Transações:", 350, currentY);
      doc.font("Helvetica").text(`${transactions.length}`, 480, currentY, { width: 70, align: "right" });
    }

    doc.end();
  } catch (error: any) {
    console.error("GET /api/cashiers/:id/pdf error", error);
    res.status(500).json({
      error: "Falha ao gerar PDF do caixa",
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

