"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const Budget_1 = __importDefault(require("../models/Budget"));
const Client_1 = __importDefault(require("../models/Client"));
const Job_1 = __importDefault(require("../models/Job"));
const Team_1 = __importDefault(require("../models/Team"));
const db_1 = require("../db");
const pdfkit_1 = __importDefault(require("pdfkit"));
const Settings_1 = __importDefault(require("../models/Settings"));
const mongoose_1 = __importDefault(require("mongoose"));
const router = express_1.default.Router();
// Labels for display
const SOIL_TYPE_LABELS = {
    "arenoso": "Arenoso",
    "argiloso": "Argiloso",
    "rochoso": "Rochoso",
    "misturado": "Terra comum",
    "outro": "Não sei informar"
};
const ACCESS_LABELS = {
    "livre": "Acesso livre e desimpedido",
    "limitado": "Algumas limitações",
    "restrito": "Acesso restrito ou complicado"
};
const serviceSchema = zod_1.z.object({
    catalogId: zod_1.z.string().optional(),
    service: zod_1.z.string().min(1, "Serviço é obrigatório"),
    localType: zod_1.z.string().optional(),
    soilType: zod_1.z.string().optional(),
    access: zod_1.z.string().optional(),
    diametro: zod_1.z.string().optional(),
    profundidade: zod_1.z.string().optional(),
    quantidade: zod_1.z.string().optional(),
    categories: zod_1.z.array(zod_1.z.string()).optional(),
    value: zod_1.z.number().min(0).optional(),
    discountPercent: zod_1.z.number().min(0).max(100).optional(),
    discountValue: zod_1.z.number().min(0).optional(),
    finalValue: zod_1.z.number().min(0).optional(),
    basePrice: zod_1.z.number().min(0).optional(),
    executionTime: zod_1.z.number().min(0).optional()
});
const budgetSchema = zod_1.z.object({
    clientId: zod_1.z.string().min(1, "Cliente é obrigatório"),
    clientName: zod_1.z.string().optional(),
    services: zod_1.z.array(serviceSchema).min(1, "Adicione pelo menos um serviço"),
    value: zod_1.z.number().min(0).optional(),
    discountPercent: zod_1.z.number().min(0).max(100).optional(),
    discountValue: zod_1.z.number().min(0).optional(),
    finalValue: zod_1.z.number().min(0).optional(),
    status: zod_1.z.enum(["pendente", "aprovado", "rejeitado", "convertido"]).optional(),
    notes: zod_1.z.string().optional(),
    validUntil: zod_1.z.string().optional(),
    // Travel/Displacement fields
    selectedAddress: zod_1.z.string().optional(),
    travelDistanceKm: zod_1.z.number().min(0).optional(),
    travelPrice: zod_1.z.number().min(0).optional(),
    travelDescription: zod_1.z.string().optional()
});
// GET all budgets
router.get("/", async (req, res) => {
    try {
        await (0, db_1.connectDB)();
        const budgets = await Budget_1.default.aggregate([
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
    }
    catch (error) {
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
        await (0, db_1.connectDB)();
        const budgets = await Budget_1.default.find({ clientId: req.params.clientId })
            .sort({ createdAt: -1 })
            .lean();
        res.json({ data: budgets });
    }
    catch (error) {
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
        await (0, db_1.connectDB)();
        const budget = await Budget_1.default.findById(req.params.id).lean();
        if (!budget) {
            return res.status(404).json({ error: "Orçamento não encontrado" });
        }
        res.json({ data: budget });
    }
    catch (error) {
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
        await (0, db_1.connectDB)();
        // Get next sequence number
        const lastBudget = await Budget_1.default.findOne().sort({ seq: -1 }).lean();
        const seq = (lastBudget?.seq || 0) + 1;
        // Get client name if not provided
        let clientName = parsed.data.clientName;
        if (!clientName && parsed.data.clientId) {
            const client = await Client_1.default.findById(parsed.data.clientId).lean();
            clientName = client?.name || "Cliente";
        }
        // Generate title
        const title = `Orçamento ${clientName} - ORC${String(seq).padStart(6, "0")}`;
        const budget = await Budget_1.default.create({
            ...parsed.data,
            seq,
            title,
            clientName,
            status: parsed.data.status || "pendente"
        });
        res.status(201).json({ data: budget });
    }
    catch (error) {
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
        await (0, db_1.connectDB)();
        const budget = await Budget_1.default.findById(req.params.id);
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
    }
    catch (error) {
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
        await (0, db_1.connectDB)();
        const budget = await Budget_1.default.findById(req.params.id).lean();
        if (!budget) {
            return res.status(404).json({ error: "Orçamento não encontrado" });
        }
        // Don't allow deleting if converted to job
        if (budget.jobId) {
            return res.status(400).json({
                error: "Não é possível excluir orçamento convertido em OS"
            });
        }
        await Budget_1.default.findByIdAndDelete(req.params.id);
        res.json({ message: "Orçamento excluído com sucesso" });
    }
    catch (error) {
        console.error("DELETE /api/budgets/:id error", error);
        res.status(500).json({
            error: "Falha ao excluir orçamento",
            detail: error?.message || "Erro interno"
        });
    }
});
// POST convert budget to job
const convertSchema = zod_1.z.object({
    team: zod_1.z.string().optional(), // Team name (kept for backward compatibility)
    teamId: zod_1.z.string().optional(), // Team ID (preferred)
    plannedDate: zod_1.z.string().min(1, "Data é obrigatória"),
    site: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional()
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
        await (0, db_1.connectDB)();
        const budget = await Budget_1.default.findById(req.params.id);
        if (!budget) {
            return res.status(404).json({ error: "Orçamento não encontrado" });
        }
        if (budget.status === "convertido") {
            return res.status(400).json({
                error: "Este orçamento já foi convertido em OS"
            });
        }
        // Resolve teamId and team name
        let teamId = parsed.data.teamId;
        let teamName = parsed.data.team;
        if (teamId) {
            const team = await Team_1.default.findById(teamId).lean();
            if (team) {
                teamName = team.name; // Ensure teamName is consistent with teamId
            }
            else {
                return res.status(400).json({ error: "Equipe não encontrada" });
            }
        }
        else if (teamName) {
            // If only teamName is provided, try to find teamId
            const team = await Team_1.default.findOne({ name: teamName }).lean();
            if (team) {
                teamId = team._id.toString();
            }
            else {
                return res.status(400).json({ error: "Equipe não encontrada" });
            }
        }
        else {
            return res.status(400).json({ error: "Equipe é obrigatória" });
        }
        // Get next job sequence number
        const lastJob = await Job_1.default.findOne().sort({ seq: -1 }).lean();
        const jobSeq = (lastJob?.seq || 0) + 1;
        // Parse planned date
        const plannedDate = new Date(parsed.data.plannedDate);
        const formattedDate = `${plannedDate.toLocaleDateString("pt-BR")} ${plannedDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
        // Extract latitude and longitude from client addresses
        let siteLatitude;
        let siteLongitude;
        const siteAddress = parsed.data.site || budget.selectedAddress || "";
        if (budget.clientId) {
            try {
                const client = await Client_1.default.findById(budget.clientId).lean();
                if (client) {
                    // Try to find address matching the site address
                    if (siteAddress && client.addresses && client.addresses.length > 0) {
                        const matchingAddress = client.addresses.find((addr) => addr.address && addr.address.toLowerCase().includes(siteAddress.toLowerCase()) ||
                            siteAddress.toLowerCase().includes(addr.address?.toLowerCase() || ""));
                        if (matchingAddress) {
                            siteLatitude = matchingAddress.latitude;
                            siteLongitude = matchingAddress.longitude;
                        }
                        else {
                            // Use first address with coordinates
                            const addressWithCoords = client.addresses.find((addr) => addr.latitude !== undefined && addr.latitude !== null &&
                                addr.longitude !== undefined && addr.longitude !== null);
                            if (addressWithCoords) {
                                siteLatitude = addressWithCoords.latitude;
                                siteLongitude = addressWithCoords.longitude;
                            }
                        }
                    }
                    else if (client.addresses && client.addresses.length > 0) {
                        // No site address, use first address with coordinates
                        const addressWithCoords = client.addresses.find((addr) => addr.latitude !== undefined && addr.latitude !== null &&
                            addr.longitude !== undefined && addr.longitude !== null);
                        if (addressWithCoords) {
                            siteLatitude = addressWithCoords.latitude;
                            siteLongitude = addressWithCoords.longitude;
                        }
                    }
                }
            }
            catch (err) {
                console.warn("Could not fetch client coordinates:", err);
            }
        }
        // Create job from budget
        const job = await Job_1.default.create({
            seq: jobSeq,
            title: `${budget.clientName || "Cliente"} - ${formattedDate} - ${String(jobSeq).padStart(6, "0")}`,
            clientId: budget.clientId,
            clientName: budget.clientName,
            site: parsed.data.site || "",
            siteLatitude: siteLatitude,
            siteLongitude: siteLongitude,
            team: teamName,
            teamId: teamId ? new mongoose_1.default.Types.ObjectId(teamId) : undefined,
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
        budget.jobId = job._id;
        await budget.save();
        res.json({ data: job, budget });
    }
    catch (error) {
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
        await (0, db_1.connectDB)();
        const budget = await Budget_1.default.findById(req.params.id).lean();
        if (!budget) {
            return res.status(404).json({ error: "Orçamento não encontrado" });
        }
        // Get settings for company signature
        const settings = await Settings_1.default.findOne().lean();
        // Create PDF
        const doc = new pdfkit_1.default({
            size: "A4",
            margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename="orcamento-${budget.seq}.pdf"`);
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
        doc.text(`Data: ${new Date(budget.createdAt).toLocaleDateString("pt-BR")}`);
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
        if (currentY > 600) {
            doc.addPage();
            currentY = 50;
        }
        else {
            currentY += 40;
        }
        // Company signature
        const signatureBoxY = currentY;
        const signatureBoxHeight = 100;
        doc
            .rect(50, signatureBoxY, 230, signatureBoxHeight)
            .stroke();
        // Company signature image if exists
        if (settings?.companySignature) {
            try {
                const base64Data = settings.companySignature.replace(/^data:image\/\w+;base64,/, "");
                const imgBuffer = Buffer.from(base64Data, "base64");
                doc.image(imgBuffer, 55, signatureBoxY + 5, {
                    fit: [220, 70],
                    align: "center",
                    valign: "center"
                });
            }
            catch (err) {
                console.error("Error adding company signature:", err);
            }
        }
        doc
            .fontSize(9)
            .fillColor("#000")
            .text("Assinatura da Empresa", 50, signatureBoxY + signatureBoxHeight + 5, { width: 230, align: "center" });
        doc.end();
    }
    catch (error) {
        console.error("GET /api/budgets/:id/pdf error", error);
        res.status(500).json({
            error: "Falha ao gerar PDF",
            detail: error?.message || "Erro interno"
        });
    }
});
exports.default = router;
