import express from "express";
import { z } from "zod";
import BudgetModel from "../models/Budget";
import ClientModel from "../models/Client";
import JobModel from "../models/Job";
import TeamModel from "../models/Team";
import { connectDB } from "../db";
import PDFDocument from "pdfkit";
import SettingsModel from "../models/Settings";
import mongoose from "mongoose";
import crypto from "crypto";

const router = express.Router();

// Labels for display
const SOIL_TYPE_LABELS: Record<string, string> = {
  "arenoso": "Arenoso",
  "argiloso": "Argiloso",
  "rochoso": "Rochoso",
  "misturado": "Terra comum",
  "outro": "Não sei informar"
};

const ACCESS_LABELS: Record<string, string> = {
  "livre": "Acesso livre e desimpedido",
  "limitado": "Algumas limitações",
  "restrito": "Acesso restrito ou complicado"
};

const serviceSchema = z.object({
  catalogId: z.string().optional(),
  service: z.string().min(1, "Serviço é obrigatório"),
  localType: z.string().optional(),
  soilType: z.string().optional(),
  access: z.string().optional(),
  diametro: z.string().optional(),
  profundidade: z.string().optional(),
  quantidade: z.string().optional(),
  categories: z.array(z.string()).optional(),
  value: z.number().min(0).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  discountValue: z.number().min(0).optional(),
  finalValue: z.number().min(0).optional(),
  basePrice: z.number().min(0).optional(),
  executionTime: z.number().min(0).optional()
});

const budgetSchema = z.object({
  clientId: z.string().min(1, "Cliente é obrigatório"),
  clientName: z.string().optional(),
  services: z.array(serviceSchema).min(1, "Adicione pelo menos um serviço"),
  value: z.number().min(0).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  discountValue: z.number().min(0).optional(),
  finalValue: z.number().min(0).optional(),
  status: z.enum(["pendente", "aprovado", "rejeitado", "convertido"]).optional(),
  notes: z.string().optional(),
  validUntil: z.string().optional(),
  // Travel/Displacement fields
  selectedAddress: z.string().optional(),
  travelDistanceKm: z.number().min(0).optional(),
  travelPrice: z.number().min(0).optional(),
  travelDescription: z.string().optional()
});

// GET all budgets
router.get("/", async (req, res) => {
  try {
    await connectDB();

    const budgets = await BudgetModel.aggregate([
      {
        $sort: { createdAt: -1 }
      },
      {
        $project: {
          seq: 1,
          title: 1,
          clientId: 1,
          clientName: 1,
          status: 1,
          finalValue: 1,
          validUntil: 1,
          jobId: 1,
          createdAt: 1,
          updatedAt: 1,
          servicesCount: { $size: "$services" }
        }
      }
    ]);

    res.json({ data: budgets });
  } catch (error: any) {
    console.error("GET /api/budgets error", error);
    res.status(500).json({
      error: "Falha ao buscar orçamentos",
      detail: error?.message || "Erro interno"
    });
  }
});

// GET budgets by client
router.get("/client/:clientId", async (req, res) => {
  try {
    await connectDB();

    const budgets = await BudgetModel.find({ clientId: req.params.clientId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ data: budgets });
  } catch (error: any) {
    console.error("GET /api/budgets/client/:clientId error", error);
    res.status(500).json({
      error: "Falha ao buscar orçamentos do cliente",
      detail: error?.message || "Erro interno"
    });
  }
});

// GET single budget by ID
router.get("/:id", async (req, res) => {
  try {
    await connectDB();

    const budget = await BudgetModel.findById(req.params.id).lean();
    if (!budget) {
      return res.status(404).json({ error: "Orçamento não encontrado" });
    }

    res.json({ data: budget });
  } catch (error: any) {
    console.error("GET /api/budgets/:id error", error);
    res.status(500).json({
      error: "Falha ao buscar orçamento",
      detail: error?.message || "Erro interno"
    });
  }
});

// POST create budget
router.post("/", async (req, res) => {
  try {
    const parsed = budgetSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Dados inválidos",
        issues: parsed.error.flatten()
      });
    }

    await connectDB();

    // Get next sequence number
    const lastBudget = await BudgetModel.findOne().sort({ seq: -1 }).lean();
    const seq = (lastBudget?.seq || 0) + 1;

    // Get client name if not provided
    let clientName = parsed.data.clientName;
    if (!clientName && parsed.data.clientId) {
      const client = await ClientModel.findById(parsed.data.clientId).lean();
      clientName = client?.name || "Cliente";
    }

    // Generate title
    const title = `Orçamento ${clientName} - ORC${String(seq).padStart(6, "0")}`;

    const budget = await BudgetModel.create({
      ...parsed.data,
      seq,
      title,
      clientName,
      status: parsed.data.status || "pendente"
    });

    res.status(201).json({ data: budget });
  } catch (error: any) {
    console.error("POST /api/budgets error", error);
    res.status(500).json({
      error: "Falha ao criar orçamento",
      detail: error?.message || "Erro interno"
    });
  }
});

// PUT update budget
router.put("/:id", async (req, res) => {
  try {
    const parsed = budgetSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Dados inválidos",
        issues: parsed.error.flatten()
      });
    }

    await connectDB();

    const budget = await BudgetModel.findById(req.params.id);
    if (!budget) {
      return res.status(404).json({ error: "Orçamento não encontrado" });
    }

    // Update fields
    Object.assign(budget, parsed.data);

    // Update title if client name changed
    if (parsed.data.clientName && budget.seq) {
      budget.title = `Orçamento ${parsed.data.clientName} - ORC${String(budget.seq).padStart(6, "0")}`;
    }

    await budget.save();

    res.json({ data: budget });
  } catch (error: any) {
    console.error("PUT /api/budgets/:id error", error);
    res.status(500).json({
      error: "Falha ao atualizar orçamento",
      detail: error?.message || "Erro interno"
    });
  }
});

// DELETE budget
router.delete("/:id", async (req, res) => {
  try {
    await connectDB();

    const budget = await BudgetModel.findById(req.params.id).lean();
    if (!budget) {
      return res.status(404).json({ error: "Orçamento não encontrado" });
    }

    // Don't allow deleting if converted to job
    if (budget.jobId) {
      return res.status(400).json({
        error: "Não é possível excluir orçamento convertido em OS"
      });
    }

    await BudgetModel.findByIdAndDelete(req.params.id);
    res.json({ message: "Orçamento excluído com sucesso" });
  } catch (error: any) {
    console.error("DELETE /api/budgets/:id error", error);
    res.status(500).json({
      error: "Falha ao excluir orçamento",
      detail: error?.message || "Erro interno"
    });
  }
});

// POST convert budget to job
const convertSchema = z.object({
  team: z.string().optional(), // Team name (kept for backward compatibility)
  teamId: z.string().optional(), // Team ID (preferred)
  plannedDate: z.string().min(1, "Data é obrigatória"),
  site: z.string().optional(),
  notes: z.string().optional()
}).refine((data) => data.team || data.teamId, {
  message: "Equipe é obrigatória",
  path: ["team"]
});

router.post("/:id/convert", async (req, res) => {
  try {
    const parsed = convertSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Dados inválidos",
        issues: parsed.error.flatten()
      });
    }

    await connectDB();

    const budget = await BudgetModel.findById(req.params.id);
    if (!budget) {
      return res.status(404).json({ error: "Orçamento não encontrado" });
    }

    // Check if budget was already converted
    if (budget.jobId) {
      // Fetch the job to check when it was created
      const existingJob = await JobModel.findById(budget.jobId).lean();
      
      if (existingJob) {
        // Check if budget was modified after the job was created
        const budgetUpdatedAt = budget.updatedAt ? new Date(budget.updatedAt) : new Date(0);
        const jobCreatedAt = existingJob.createdAt ? new Date(existingJob.createdAt) : new Date(0);
        
        // If budget was NOT modified after job creation, prevent conversion
        if (budgetUpdatedAt <= jobCreatedAt) {
          return res.status(400).json({
            error: "Este orçamento já foi convertido em OS e não pode ser convertido novamente",
            detail: `Orçamento convertido em ${jobCreatedAt.toLocaleString("pt-BR")}. Para converter novamente, o orçamento precisa ser modificado após a conversão.`
          });
        }
        // If budget was modified after job creation, allow conversion (will create a new job)
      } else {
        // Job not found, but budget has jobId - allow conversion to create new job
        // This handles edge cases where job was deleted
      }
    }

    // Legacy check for status (kept for backward compatibility)
    if (budget.status === "convertido" && !budget.jobId) {
      // Status is "convertido" but no jobId - allow conversion
      budget.status = "pendente";
      await budget.save();
    }

    // Resolve teamId and team name
    let teamId = parsed.data.teamId;
    let teamName = parsed.data.team;

    if (teamId) {
      const team = await TeamModel.findById(teamId).lean();
      if (team) {
        teamName = team.name; // Ensure teamName is consistent with teamId
      } else {
        return res.status(400).json({ error: "Equipe não encontrada" });
      }
    } else if (teamName) {
      // If only teamName is provided, try to find teamId
      const team = await TeamModel.findOne({ name: teamName }).lean();
      if (team) {
        teamId = team._id.toString();
      } else {
        return res.status(400).json({ error: "Equipe não encontrada" });
      }
    } else {
      return res.status(400).json({ error: "Equipe é obrigatória" });
    }

    // Get next job sequence number
    const lastJob = await JobModel.findOne().sort({ seq: -1 }).lean();
    const jobSeq = (lastJob?.seq || 0) + 1;

    // Parse planned date
    const plannedDate = new Date(parsed.data.plannedDate);
    const formattedDate = `${plannedDate.toLocaleDateString("pt-BR")} ${plannedDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;

    // Extract latitude and longitude from client addresses
    let siteLatitude: number | undefined;
    let siteLongitude: number | undefined;
    const siteAddress = parsed.data.site || budget.selectedAddress || "";

    if (budget.clientId) {
      try {
        const client = await ClientModel.findById(budget.clientId).lean();
        if (client) {
          // Try to find address matching the site address
          if (siteAddress && client.addresses && client.addresses.length > 0) {
            const matchingAddress = client.addresses.find((addr: any) => 
              addr.address && addr.address.toLowerCase().includes(siteAddress.toLowerCase()) ||
              siteAddress.toLowerCase().includes(addr.address?.toLowerCase() || "")
            );
            
            if (matchingAddress) {
              siteLatitude = matchingAddress.latitude;
              siteLongitude = matchingAddress.longitude;
            } else {
              // Use first address with coordinates
              const addressWithCoords = client.addresses.find((addr: any) => 
                addr.latitude !== undefined && addr.latitude !== null &&
                addr.longitude !== undefined && addr.longitude !== null
              );
              if (addressWithCoords) {
                siteLatitude = addressWithCoords.latitude;
                siteLongitude = addressWithCoords.longitude;
              }
            }
          } else if (client.addresses && client.addresses.length > 0) {
            // No site address, use first address with coordinates
            const addressWithCoords = client.addresses.find((addr: any) => 
              addr.latitude !== undefined && addr.latitude !== null &&
              addr.longitude !== undefined && addr.longitude !== null
            );
            if (addressWithCoords) {
              siteLatitude = addressWithCoords.latitude;
              siteLongitude = addressWithCoords.longitude;
            }
          }
        }
      } catch (err) {
        console.warn("Could not fetch client coordinates:", err);
      }
    }

    // Create job from budget
    const job = await JobModel.create({
      seq: jobSeq,
      title: `${budget.clientName || "Cliente"} - ${formattedDate} - ${String(jobSeq).padStart(6, "0")}`,
      clientId: budget.clientId,
      clientName: budget.clientName,
      site: parsed.data.site || "",
      siteLatitude: siteLatitude,
      siteLongitude: siteLongitude,
      team: teamName,
      teamId: teamId ? new mongoose.Types.ObjectId(teamId) : undefined,
      status: "pendente",
      plannedDate: parsed.data.plannedDate,
      services: budget.services,
      value: budget.value,
      discountPercent: budget.discountPercent,
      discountValue: budget.discountValue,
      finalValue: budget.finalValue,
      notes: parsed.data.notes || budget.notes || "",
      selectedAddress: budget.selectedAddress || parsed.data.site || "",
      travelDistanceKm: budget.travelDistanceKm,
      travelPrice: budget.travelPrice,
      travelDescription: budget.travelDescription
    });

    // Update budget status
    budget.status = "convertido";
    budget.jobId = job._id as any;
    await budget.save();

    res.json({ data: job, budget });
  } catch (error: any) {
    console.error("POST /api/budgets/:id/convert error", error);
    res.status(500).json({
      error: "Falha ao converter orçamento em OS",
      detail: error?.message || "Erro interno"
    });
  }
});

// GET PDF
router.get("/:id/pdf", async (req, res) => {
  try {
    await connectDB();

    const budget = await BudgetModel.findById(req.params.id).lean();
    if (!budget) {
      return res.status(404).json({ error: "Orçamento não encontrado" });
    }

    // Get settings for company signature
    const settings = await SettingsModel.findOne().lean();

    // Create PDF
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="orcamento-${budget.seq}.pdf"`
    );

    doc.pipe(res);

    // Header
    doc.fontSize(20).fillColor("#000").text("ORÇAMENTO", { align: "center" });
    doc.moveDown(0.5);
    doc
      .fontSize(12)
      .text(`${budget.title || ""}`, { align: "center" });
    doc.moveDown();

    // Info section
    doc.fontSize(10).fillColor("#333");
    doc.text(`Cliente: ${budget.clientName || "-"}`, 50, doc.y);
    doc.text(`Data: ${new Date(budget.createdAt!).toLocaleDateString("pt-BR")}`);
    if (budget.validUntil) {
      doc.text(`Válido até: ${new Date(budget.validUntil).toLocaleDateString("pt-BR")}`);
    }
    doc.text(`Status: ${(budget.status || "pendente").toUpperCase()}`);
    doc.moveDown();

    // Services table
    doc.fontSize(12).fillColor("#000").text("Serviços:", 50, doc.y);
    doc.moveDown(0.5);

    let currentY = doc.y;

    // Table headers
    doc.fontSize(9).fillColor("#000");
    doc.text("Serviço", 50, currentY);
    doc.text("Detalhes", 200, currentY);
    doc.text("Qtd", 400, currentY);
    doc.text("Valor", 480, currentY, { width: 70, align: "right" });

    currentY += 20;
    doc.moveTo(50, currentY).lineTo(550, currentY).stroke();
    currentY += 10;

    // Services
    doc.fontSize(8).fillColor("#333");
    for (const service of budget.services) {
      const details = [
        service.diametro ? `Ø ${service.diametro}` : "",
        service.soilType ? (SOIL_TYPE_LABELS[service.soilType] || service.soilType) : "",
        service.access ? (ACCESS_LABELS[service.access] || service.access) : ""
      ]
        .filter(Boolean)
        .join(" • ");

      const qty = service.quantidade
        ? `${service.quantidade} un.`
        : "-";

      const value = service.finalValue
        ? `R$ ${service.finalValue.toFixed(2)}`
        : "-";

      doc.text(service.service, 50, currentY, { width: 140 });
      doc.text(details || "-", 200, currentY, { width: 190 });
      doc.text(qty, 400, currentY);
      doc.text(value, 480, currentY, { width: 70, align: "right" });

      currentY += 25;

      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
      }
    }

    currentY += 10;
    doc.moveTo(50, currentY).lineTo(550, currentY).stroke();
    currentY += 15;

    // Total section
    doc.fontSize(10).fillColor("#000");
    if (budget.value) {
      doc.text("Valor Total:", 400, currentY);
      doc.text(`R$ ${budget.value.toFixed(2)}`, 480, currentY, {
        width: 70,
        align: "right"
      });
      currentY += 20;
    }

    // Travel/Displacement costs
    if (budget.travelPrice && budget.travelPrice > 0) {
      doc.fillColor("#000");
      doc.text("Deslocamento:", 400, currentY);
      doc.text(`R$ ${budget.travelPrice.toFixed(2)}`, 480, currentY, {
        width: 70,
        align: "right"
      });
      currentY += 15;
      // Show travel description if available
      if (budget.travelDescription) {
        doc.fontSize(8).fillColor("#666");
        doc.text(`(${budget.travelDescription})`, 400, currentY, {
          width: 150,
          align: "right"
        });
        currentY += 15;
      }
      doc.fontSize(10).fillColor("#000");
    }

    if (budget.discountValue && budget.discountValue > 0) {
      doc.fillColor("#d00");
      doc.text("Desconto:", 400, currentY);
      doc.text(`- R$ ${budget.discountValue.toFixed(2)}`, 480, currentY, {
        width: 70,
        align: "right"
      });
      currentY += 20;
    }

    doc.fontSize(12).fillColor("#000").font("Helvetica-Bold");
    doc.text("Valor Final:", 400, currentY);
    // Use finalValue (which should already include travel costs if calculated)
    // If finalValue is not set, calculate it: value (services + travel) - discount
    const finalValue = budget.finalValue || 
      ((budget.value || 0) - (budget.discountValue || 0));
    doc.text(`R$ ${finalValue.toFixed(2)}`, 480, currentY, {
      width: 70,
      align: "right"
    });

    doc.font("Helvetica");
    currentY += 40;

    // Notes
    if (budget.notes) {
      doc.fontSize(10).fillColor("#333");
      doc.text("Observações:", 50, currentY);
      currentY += 15;
      doc.fontSize(9).text(budget.notes, 50, currentY, { width: 500 });
      currentY = doc.y + 20;
    }

    // Signature section
    if (currentY > 500) {
      doc.addPage();
      currentY = 50;
    } else {
      currentY += 40;
    }

    // Approval status
    if (budget.approved) {
      doc.fontSize(10).fillColor("#0a0").font("Helvetica-Bold");
      doc.text("✅ ORÇAMENTO APROVADO", 50, currentY);
      if (budget.approvedAt) {
        doc.fontSize(9).fillColor("#333").font("Helvetica");
        doc.text(
          `Aprovado em: ${new Date(budget.approvedAt).toLocaleString("pt-BR")}`,
          50,
          currentY + 15
        );
      }
      currentY += 40;
    } else if (budget.rejected) {
      doc.fontSize(10).fillColor("#a00").font("Helvetica-Bold");
      doc.text("❌ ORÇAMENTO REJEITADO", 50, currentY);
      if (budget.rejectedAt) {
        doc.fontSize(9).fillColor("#333").font("Helvetica");
        doc.text(
          `Rejeitado em: ${new Date(budget.rejectedAt).toLocaleString("pt-BR")}`,
          50,
          currentY + 15
        );
      }
      if (budget.rejectionReason) {
        doc.fontSize(8).fillColor("#666");
        doc.text(`Motivo: ${budget.rejectionReason}`, 50, currentY + 30, {
          width: 500
        });
      }
      currentY += 60;
    }

    // Signatures section - side by side if both exist, otherwise full width
    const hasClientSignature = budget.approved && budget.clientSignature;
    const hasCompanySignature = settings?.companySignature;
    const signatureBoxHeight = 100;
    const signatureBoxY = currentY;

    if (hasClientSignature && hasCompanySignature) {
      // Two signatures side by side
      // Client signature (left)
      doc.rect(50, signatureBoxY, 230, signatureBoxHeight).stroke();
      
      try {
        const clientBase64Data = budget.clientSignature.replace(
          /^data:image\/\w+;base64,/,
          ""
        );
        const clientImgBuffer = Buffer.from(clientBase64Data, "base64");
        doc.image(clientImgBuffer, 55, signatureBoxY + 5, {
          fit: [220, 70],
          align: "center",
          valign: "center"
        });
      } catch (err) {
        console.error("Error adding client signature:", err);
      }

      doc
        .fontSize(9)
        .fillColor("#000")
        .text(
          "Assinatura do Cliente",
          50,
          signatureBoxY + signatureBoxHeight + 5,
          { width: 230, align: "center" }
        );

      if (budget.clientSignedAt) {
        doc.fontSize(8).fillColor("#666");
        doc.text(
          new Date(budget.clientSignedAt).toLocaleDateString("pt-BR"),
          50,
          signatureBoxY + signatureBoxHeight + 18,
          { width: 230, align: "center" }
        );
      }

      // Company signature (right)
      doc.rect(320, signatureBoxY, 230, signatureBoxHeight).stroke();

      try {
        const companyBase64Data = settings.companySignature.replace(
          /^data:image\/\w+;base64,/,
          ""
        );
        const companyImgBuffer = Buffer.from(companyBase64Data, "base64");
        doc.image(companyImgBuffer, 325, signatureBoxY + 5, {
          fit: [220, 70],
          align: "center",
          valign: "center"
        });
      } catch (err) {
        console.error("Error adding company signature:", err);
      }

      doc
        .fontSize(9)
        .fillColor("#000")
        .text(
          "Assinatura da Empresa",
          320,
          signatureBoxY + signatureBoxHeight + 5,
          { width: 230, align: "center" }
        );
    } else if (hasClientSignature) {
      // Only client signature (centered)
      doc.rect(50, signatureBoxY, 500, signatureBoxHeight).stroke();
      
      try {
        const clientBase64Data = budget.clientSignature.replace(
          /^data:image\/\w+;base64,/,
          ""
        );
        const clientImgBuffer = Buffer.from(clientBase64Data, "base64");
        doc.image(clientImgBuffer, 55, signatureBoxY + 5, {
          fit: [490, 70],
          align: "center",
          valign: "center"
        });
      } catch (err) {
        console.error("Error adding client signature:", err);
      }

      doc
        .fontSize(9)
        .fillColor("#000")
        .text(
          "Assinatura do Cliente",
          50,
          signatureBoxY + signatureBoxHeight + 5,
          { width: 500, align: "center" }
        );

      if (budget.clientSignedAt) {
        doc.fontSize(8).fillColor("#666");
        doc.text(
          new Date(budget.clientSignedAt).toLocaleDateString("pt-BR"),
          50,
          signatureBoxY + signatureBoxHeight + 18,
          { width: 500, align: "center" }
        );
      }
    } else if (hasCompanySignature) {
      // Only company signature (centered)
      doc.rect(50, signatureBoxY, 500, signatureBoxHeight).stroke();

      try {
        const companyBase64Data = settings.companySignature.replace(
          /^data:image\/\w+;base64,/,
          ""
        );
        const companyImgBuffer = Buffer.from(companyBase64Data, "base64");
        doc.image(companyImgBuffer, 55, signatureBoxY + 5, {
          fit: [490, 70],
          align: "center",
          valign: "center"
        });
      } catch (err) {
        console.error("Error adding company signature:", err);
      }

      doc
        .fontSize(9)
        .fillColor("#000")
        .text(
          "Assinatura da Empresa",
          50,
          signatureBoxY + signatureBoxHeight + 5,
          { width: 500, align: "center" }
        );
    } else {
      // No signatures - just show signature boxes
      doc.rect(50, signatureBoxY, 230, signatureBoxHeight).stroke();
      doc
        .fontSize(9)
        .fillColor("#000")
        .text(
          "Assinatura do Cliente",
          50,
          signatureBoxY + signatureBoxHeight + 5,
          { width: 230, align: "center" }
        );

      doc.rect(320, signatureBoxY, 230, signatureBoxHeight).stroke();
      doc
        .fontSize(9)
        .fillColor("#000")
        .text(
          "Assinatura da Empresa",
          320,
          signatureBoxY + signatureBoxHeight + 5,
          { width: 230, align: "center" }
        );
    }

    doc.end();
  } catch (error: any) {
    console.error("GET /api/budgets/:id/pdf error", error);
    res.status(500).json({
      error: "Falha ao gerar PDF",
      detail: error?.message || "Erro interno"
    });
  }
});

// POST generate public link for budget
router.post("/:id/generate-link", async (req, res) => {
  try {
    await connectDB();

    const budget = await BudgetModel.findById(req.params.id);
    if (!budget) {
      return res.status(404).json({ error: "Orçamento não encontrado" });
    }

    // Generate unique token if not exists
    if (!budget.publicToken) {
      budget.publicToken = crypto.randomBytes(32).toString("hex");
      await budget.save();
    }

    // Use request origin if available (for dev mode), otherwise use FRONTEND_ORIGIN or default
    const requestOrigin = req.headers.origin;
    let frontendOrigin = requestOrigin;
    
    if (!frontendOrigin) {
      // Fallback to FRONTEND_ORIGIN env var (first one if multiple)
      frontendOrigin = process.env.FRONTEND_ORIGIN?.split(",")[0]?.trim();
    }
    
    // Final fallback to localhost:3000 (common dev port) or localhost:5173 (Vite default)
    if (!frontendOrigin) {
      frontendOrigin = "http://localhost:3000";
    }

    const publicLink = `${frontendOrigin}/budget/${budget.publicToken}`;

    res.json({ 
      data: { 
        publicToken: budget.publicToken,
        publicLink 
      } 
    });
  } catch (error: any) {
    console.error("POST /api/budgets/:id/generate-link error", error);
    res.status(500).json({
      error: "Falha ao gerar link público",
      detail: error?.message || "Erro interno"
    });
  }
});

// GET public budget by token (no auth required)
router.get("/public/:token", async (req, res) => {
  try {
    await connectDB();

    const budget = await BudgetModel.findOne({ publicToken: req.params.token }).lean();
    if (!budget) {
      return res.status(404).json({ error: "Orçamento não encontrado" });
    }

    res.json({ data: budget });
  } catch (error: any) {
    console.error("GET /api/budgets/public/:token error", error);
    res.status(500).json({
      error: "Falha ao buscar orçamento",
      detail: error?.message || "Erro interno"
    });
  }
});

// POST approve budget with signature (public endpoint)
const approveSchema = z.object({
  signature: z.string().min(1, "Assinatura é obrigatória")
});

router.post("/public/:token/approve", async (req, res) => {
  try {
    const parsed = approveSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Dados inválidos",
        issues: parsed.error.flatten()
      });
    }

    await connectDB();

    const budget = await BudgetModel.findOne({ publicToken: req.params.token });
    if (!budget) {
      return res.status(404).json({ error: "Orçamento não encontrado" });
    }

    // Check if already approved or rejected
    if (budget.approved || budget.rejected) {
      return res.status(400).json({ 
        error: "Este orçamento já foi processado" 
      });
    }

    // Update budget with approval
    budget.approved = true;
    budget.approvedAt = new Date();
    budget.clientSignature = parsed.data.signature;
    budget.clientSignedAt = new Date();
    budget.status = "aprovado";
    await budget.save();

    res.json({ 
      data: { 
        message: "Orçamento aprovado com sucesso",
        budget 
      } 
    });
  } catch (error: any) {
    console.error("POST /api/budgets/public/:token/approve error", error);
    res.status(500).json({
      error: "Falha ao aprovar orçamento",
      detail: error?.message || "Erro interno"
    });
  }
});

// POST reject budget with reason (public endpoint)
const rejectSchema = z.object({
  rejectionReason: z.string().min(1, "Motivo da rejeição é obrigatório")
});

router.post("/public/:token/reject", async (req, res) => {
  try {
    const parsed = rejectSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Dados inválidos",
        issues: parsed.error.flatten()
      });
    }

    await connectDB();

    const budget = await BudgetModel.findOne({ publicToken: req.params.token });
    if (!budget) {
      return res.status(404).json({ error: "Orçamento não encontrado" });
    }

    // Check if already approved or rejected
    if (budget.approved || budget.rejected) {
      return res.status(400).json({ 
        error: "Este orçamento já foi processado" 
      });
    }

    // Update budget with rejection
    budget.rejected = true;
    budget.rejectedAt = new Date();
    budget.rejectionReason = parsed.data.rejectionReason;
    budget.status = "rejeitado";
    await budget.save();

    res.json({ 
      data: { 
        message: "Orçamento rejeitado",
        budget 
      } 
    });
  } catch (error: any) {
    console.error("POST /api/budgets/public/:token/reject error", error);
    res.status(500).json({
      error: "Falha ao rejeitar orçamento",
      detail: error?.message || "Erro interno"
    });
  }
});

export default router;

