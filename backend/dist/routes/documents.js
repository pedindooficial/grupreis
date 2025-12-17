"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const Document_1 = __importDefault(require("../models/Document"));
const Client_1 = __importDefault(require("../models/Client"));
const Job_1 = __importDefault(require("../models/Job"));
const s3_1 = require("../services/s3");
const auth_1 = require("../middleware/auth");
const audit_1 = require("../services/audit");
const router = (0, express_1.Router)();
// All document routes require authentication and admin role
router.use(auth_1.authenticate);
router.use(auth_1.requireAdmin);
const documentSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, "Título obrigatório"),
    type: zod_1.z.enum(["contrato", "proposta", "nota_fiscal", "recibo", "outro"]),
    status: zod_1.z.enum(["pendente", "assinado", "cancelado", "arquivado"]).optional(),
    description: zod_1.z.string().optional(),
    clientId: zod_1.z.string().optional().nullable(),
    clientName: zod_1.z.string().optional(),
    jobId: zod_1.z.string().optional().nullable(),
    jobTitle: zod_1.z.string().optional(),
    fileKey: zod_1.z.string().min(1, "Chave do arquivo obrigatória"),
    fileName: zod_1.z.string().min(1, "Nome do arquivo obrigatório"),
    fileSize: zod_1.z.number().min(0, "Tamanho do arquivo inválido"),
    fileType: zod_1.z.string().min(1, "Tipo do arquivo obrigatório"),
    signedAt: zod_1.z.string().optional(),
    expiresAt: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional()
});
const updateSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).optional(),
    type: zod_1.z.enum(["contrato", "proposta", "nota_fiscal", "recibo", "outro"]).optional(),
    status: zod_1.z.enum(["pendente", "assinado", "cancelado", "arquivado"]).optional(),
    description: zod_1.z.string().optional(),
    clientId: zod_1.z.string().optional().nullable(),
    clientName: zod_1.z.string().optional(),
    jobId: zod_1.z.string().optional().nullable(),
    jobTitle: zod_1.z.string().optional(),
    fileKey: zod_1.z.string().min(1).optional(), // Allow file replacement
    fileName: zod_1.z.string().min(1).optional(),
    fileSize: zod_1.z.number().min(0).optional(),
    fileType: zod_1.z.string().min(1).optional(),
    signedAt: zod_1.z.string().optional(),
    expiresAt: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional()
});
// GET /api/documents - List all documents
router.get("/", async (req, res) => {
    try {
        await (0, db_1.connectDB)();
        const { clientId, jobId, type, status } = req.query;
        const filter = {};
        if (clientId)
            filter.clientId = clientId;
        if (jobId)
            filter.jobId = jobId;
        if (type)
            filter.type = type;
        if (status)
            filter.status = status;
        const documents = await Document_1.default.find(filter)
            .sort({ createdAt: -1 })
            .lean();
        res.json({ data: documents });
    }
    catch (error) {
        console.error("GET /api/documents error", error);
        res.status(500).json({
            error: "Falha ao carregar documentos",
            detail: error?.message || "Erro interno"
        });
    }
});
// GET /api/documents/:id - Get single document
router.get("/:id", async (req, res) => {
    try {
        await (0, db_1.connectDB)();
        const document = await Document_1.default.findById(req.params.id).lean();
        if (!document) {
            return res.status(404).json({ error: "Documento não encontrado" });
        }
        res.json({ data: document });
    }
    catch (error) {
        console.error("GET /api/documents/:id error", error);
        res.status(500).json({
            error: "Falha ao carregar documento",
            detail: error?.message || "Erro interno"
        });
    }
});
// GET /api/documents/:id/download-url - Get presigned URL for download
router.get("/:id/download-url", async (req, res) => {
    try {
        await (0, db_1.connectDB)();
        const document = await Document_1.default.findById(req.params.id).lean();
        if (!document) {
            return res.status(404).json({ error: "Documento não encontrado" });
        }
        const expiresIn = req.query.expiresIn
            ? parseInt(req.query.expiresIn, 10)
            : 3600; // Default 1 hour
        const url = await (0, s3_1.getPresignedUrl)(document.fileKey, expiresIn);
        // Log download action
        if (req.user) {
            await (0, audit_1.logAudit)(req, {
                action: "download",
                resource: "document",
                resourceId: document._id?.toString(),
                resourceName: document.title,
                userId: req.user.id,
                userEmail: req.user.email,
                userName: req.user.name,
                details: `Download do documento: ${document.fileName}`
            });
        }
        res.json({ data: { url, expiresIn } });
    }
    catch (error) {
        console.error("GET /api/documents/:id/download-url error", error);
        res.status(500).json({
            error: "Falha ao gerar URL de download",
            detail: error?.message || "Erro interno"
        });
    }
});
// POST /api/documents - Create new document
router.post("/", async (req, res) => {
    try {
        const parsed = documentSchema.safeParse(req.body);
        if (!parsed.success) {
            return res
                .status(400)
                .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
        }
        await (0, db_1.connectDB)();
        let clientName = parsed.data.clientName?.trim();
        let jobTitle = parsed.data.jobTitle?.trim();
        let clientId = parsed.data.clientId || null;
        let jobId = parsed.data.jobId || null;
        // Fetch client name if clientId provided
        if (clientId) {
            const client = await Client_1.default.findById(clientId).lean();
            if (client) {
                clientName = client.name || clientName;
            }
        }
        // Fetch job title if jobId provided
        if (jobId) {
            const job = await Job_1.default.findById(jobId).lean();
            if (job) {
                jobTitle = job.title || jobTitle;
            }
        }
        const document = await Document_1.default.create({
            ...parsed.data,
            clientId: clientId || undefined,
            clientName,
            jobId: jobId || undefined,
            jobTitle,
            signedAt: parsed.data.signedAt ? new Date(parsed.data.signedAt) : undefined,
            expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
            status: parsed.data.status || "pendente"
        });
        // Log create action
        if (req.user) {
            await (0, audit_1.logAudit)(req, {
                action: "create",
                resource: "document",
                resourceId: document._id.toString(),
                resourceName: document.title,
                userId: req.user.id,
                userEmail: req.user.email,
                userName: req.user.name,
                details: `Documento criado: ${document.fileName} (${document.type})`
            });
        }
        res.status(201).json({ data: document });
    }
    catch (error) {
        console.error("POST /api/documents error", error);
        res.status(500).json({
            error: "Falha ao criar documento",
            detail: error?.message || "Erro interno"
        });
    }
});
// PUT /api/documents/:id - Update document
router.put("/:id", async (req, res) => {
    try {
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) {
            return res
                .status(400)
                .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
        }
        await (0, db_1.connectDB)();
        // Get original document for audit
        const originalDoc = await Document_1.default.findById(req.params.id).lean();
        if (!originalDoc) {
            return res.status(404).json({ error: "Documento não encontrado" });
        }
        let clientName = parsed.data.clientName?.trim();
        let jobTitle = parsed.data.jobTitle?.trim();
        // Fetch client name if clientId provided
        if (parsed.data.clientId) {
            const client = await Client_1.default.findById(parsed.data.clientId).lean();
            if (client) {
                clientName = client.name || clientName;
            }
        }
        // Fetch job title if jobId provided
        if (parsed.data.jobId) {
            const job = await Job_1.default.findById(parsed.data.jobId).lean();
            if (job) {
                jobTitle = job.title || jobTitle;
            }
        }
        const updateData = {
            ...parsed.data,
            clientName,
            jobTitle,
            signedAt: parsed.data.signedAt ? new Date(parsed.data.signedAt) : undefined,
            expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined
        };
        // Remove undefined values
        Object.keys(updateData).forEach((key) => updateData[key] === undefined && delete updateData[key]);
        const updated = await Document_1.default.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
            runValidators: true
        });
        if (!updated) {
            return res.status(404).json({ error: "Documento não encontrado" });
        }
        // Log update action
        if (req.user) {
            const changes = [];
            if (parsed.data.fileKey && parsed.data.fileKey !== originalDoc.fileKey) {
                changes.push(`Arquivo substituído: ${originalDoc.fileName} → ${parsed.data.fileName || "novo arquivo"}`);
            }
            if (parsed.data.title && parsed.data.title !== originalDoc.title) {
                changes.push(`Título: ${originalDoc.title} → ${parsed.data.title}`);
            }
            if (parsed.data.status && parsed.data.status !== originalDoc.status) {
                changes.push(`Status: ${originalDoc.status} → ${parsed.data.status}`);
            }
            await (0, audit_1.logAudit)(req, {
                action: "update",
                resource: "document",
                resourceId: updated._id.toString(),
                resourceName: updated.title,
                userId: req.user.id,
                userEmail: req.user.email,
                userName: req.user.name,
                details: changes.length > 0 ? changes.join("; ") : "Documento atualizado",
                metadata: {
                    oldFile: originalDoc.fileName,
                    newFile: updated.fileName,
                    fileReplaced: parsed.data.fileKey ? parsed.data.fileKey !== originalDoc.fileKey : false
                }
            });
        }
        res.json({ data: updated });
    }
    catch (error) {
        console.error("PUT /api/documents/:id error", error);
        res.status(500).json({
            error: "Falha ao atualizar documento",
            detail: error?.message || "Erro interno"
        });
    }
});
// DELETE /api/documents/:id - Delete document
router.delete("/:id", async (req, res) => {
    try {
        await (0, db_1.connectDB)();
        const document = await Document_1.default.findById(req.params.id).lean();
        if (!document) {
            return res.status(404).json({ error: "Documento não encontrado" });
        }
        await Document_1.default.findByIdAndDelete(req.params.id);
        // Log delete action
        if (req.user) {
            await (0, audit_1.logAudit)(req, {
                action: "delete",
                resource: "document",
                resourceId: document._id?.toString(),
                resourceName: document.title,
                userId: req.user.id,
                userEmail: req.user.email,
                userName: req.user.name,
                details: `Documento excluído: ${document.fileName}`
            });
        }
        res.json({ ok: true, message: "Documento excluído com sucesso" });
    }
    catch (error) {
        console.error("DELETE /api/documents/:id error", error);
        res.status(500).json({
            error: "Falha ao excluir documento",
            detail: error?.message || "Erro interno"
        });
    }
});
exports.default = router;
