import { Router } from "express";
import { z } from "zod";
import { connectDB } from "../db";
import DocumentModel from "../models/Document";
import ClientModel from "../models/Client";
import JobModel from "../models/Job";
import { getPresignedUrl } from "../services/s3";
import { authenticate, requireAdmin, AuthRequest } from "../middleware/auth";
import { logAudit } from "../services/audit";

const router = Router();

// All document routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

const documentSchema = z.object({
  title: z.string().min(1, "Título obrigatório"),
  type: z.enum(["contrato", "proposta", "nota_fiscal", "recibo", "outro"]),
  status: z.enum(["pendente", "assinado", "cancelado", "arquivado"]).optional(),
  description: z.string().optional(),
  clientId: z.string().optional().nullable(),
  clientName: z.string().optional(),
  jobId: z.string().optional().nullable(),
  jobTitle: z.string().optional(),
  fileKey: z.string().min(1, "Chave do arquivo obrigatória"),
  fileName: z.string().min(1, "Nome do arquivo obrigatório"),
  fileSize: z.number().min(0, "Tamanho do arquivo inválido"),
  fileType: z.string().min(1, "Tipo do arquivo obrigatório"),
  signedAt: z.string().optional(),
  expiresAt: z.string().optional(),
  notes: z.string().optional()
});

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  type: z.enum(["contrato", "proposta", "nota_fiscal", "recibo", "outro"]).optional(),
  status: z.enum(["pendente", "assinado", "cancelado", "arquivado"]).optional(),
  description: z.string().optional(),
  clientId: z.string().optional().nullable(),
  clientName: z.string().optional(),
  jobId: z.string().optional().nullable(),
  jobTitle: z.string().optional(),
  fileKey: z.string().min(1).optional(), // Allow file replacement
  fileName: z.string().min(1).optional(),
  fileSize: z.number().min(0).optional(),
  fileType: z.string().min(1).optional(),
  signedAt: z.string().optional(),
  expiresAt: z.string().optional(),
  notes: z.string().optional()
});

// GET /api/documents - List all documents
router.get("/", async (req, res) => {
  try {
    await connectDB();
    const { clientId, jobId, type, status } = req.query;

    const filter: any = {};
    if (clientId) filter.clientId = clientId;
    if (jobId) filter.jobId = jobId;
    if (type) filter.type = type;
    if (status) filter.status = status;

    const documents = await DocumentModel.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    res.json({ data: documents });
  } catch (error: any) {
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
    await connectDB();
    const document = await DocumentModel.findById(req.params.id).lean();
    if (!document) {
      return res.status(404).json({ error: "Documento não encontrado" });
    }
    res.json({ data: document });
  } catch (error: any) {
    console.error("GET /api/documents/:id error", error);
    res.status(500).json({
      error: "Falha ao carregar documento",
      detail: error?.message || "Erro interno"
    });
  }
});

// GET /api/documents/:id/download-url - Get presigned URL for download
router.get("/:id/download-url", async (req: AuthRequest, res) => {
  try {
    await connectDB();
    const document = await DocumentModel.findById(req.params.id).lean();
    if (!document) {
      return res.status(404).json({ error: "Documento não encontrado" });
    }

    const expiresIn = req.query.expiresIn
      ? parseInt(req.query.expiresIn as string, 10)
      : 3600; // Default 1 hour

    const url = await getPresignedUrl(document.fileKey, expiresIn);

    // Log download action
    if (req.user) {
      await logAudit(req, {
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
  } catch (error: any) {
    console.error("GET /api/documents/:id/download-url error", error);
    res.status(500).json({
      error: "Falha ao gerar URL de download",
      detail: error?.message || "Erro interno"
    });
  }
});

// POST /api/documents - Create new document
router.post("/", async (req: AuthRequest, res) => {
  try {
    const parsed = documentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
    }

    await connectDB();

    let clientName = parsed.data.clientName?.trim();
    let jobTitle = parsed.data.jobTitle?.trim();
    let clientId: string | null = parsed.data.clientId || null;
    let jobId: string | null = parsed.data.jobId || null;

    // Fetch client name if clientId provided
    if (clientId) {
      const client = await ClientModel.findById(clientId).lean();
      if (client) {
        clientName = client.name || clientName;
      }
    }

    // Fetch job title if jobId provided
    if (jobId) {
      const job = await JobModel.findById(jobId).lean();
      if (job) {
        jobTitle = job.title || jobTitle;
      }
    }

    const document = await DocumentModel.create({
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
      await logAudit(req, {
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
  } catch (error: any) {
    console.error("POST /api/documents error", error);
    res.status(500).json({
      error: "Falha ao criar documento",
      detail: error?.message || "Erro interno"
    });
  }
});

// PUT /api/documents/:id - Update document
router.put("/:id", async (req: AuthRequest, res) => {
  try {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
    }

    await connectDB();

    // Get original document for audit
    const originalDoc = await DocumentModel.findById(req.params.id).lean();
    if (!originalDoc) {
      return res.status(404).json({ error: "Documento não encontrado" });
    }

    let clientName = parsed.data.clientName?.trim();
    let jobTitle = parsed.data.jobTitle?.trim();

    // Fetch client name if clientId provided
    if (parsed.data.clientId) {
      const client = await ClientModel.findById(parsed.data.clientId).lean();
      if (client) {
        clientName = client.name || clientName;
      }
    }

    // Fetch job title if jobId provided
    if (parsed.data.jobId) {
      const job = await JobModel.findById(parsed.data.jobId).lean();
      if (job) {
        jobTitle = job.title || jobTitle;
      }
    }

    const updateData: any = {
      ...parsed.data,
      clientName,
      jobTitle,
      signedAt: parsed.data.signedAt ? new Date(parsed.data.signedAt) : undefined,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined
    };

    // Remove undefined values
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key]
    );

    const updated = await DocumentModel.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });

    if (!updated) {
      return res.status(404).json({ error: "Documento não encontrado" });
    }

    // Log update action
    if (req.user) {
      const changes: string[] = [];
      if (parsed.data.fileKey && parsed.data.fileKey !== originalDoc.fileKey) {
        changes.push(`Arquivo substituído: ${originalDoc.fileName} → ${parsed.data.fileName || "novo arquivo"}`);
      }
      if (parsed.data.title && parsed.data.title !== originalDoc.title) {
        changes.push(`Título: ${originalDoc.title} → ${parsed.data.title}`);
      }
      if (parsed.data.status && parsed.data.status !== originalDoc.status) {
        changes.push(`Status: ${originalDoc.status} → ${parsed.data.status}`);
      }

      await logAudit(req, {
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
  } catch (error: any) {
    console.error("PUT /api/documents/:id error", error);
    res.status(500).json({
      error: "Falha ao atualizar documento",
      detail: error?.message || "Erro interno"
    });
  }
});

// DELETE /api/documents/:id - Delete document
router.delete("/:id", async (req: AuthRequest, res) => {
  try {
    await connectDB();
    const document = await DocumentModel.findById(req.params.id).lean();
    if (!document) {
      return res.status(404).json({ error: "Documento não encontrado" });
    }

    await DocumentModel.findByIdAndDelete(req.params.id);

    // Log delete action
    if (req.user) {
      await logAudit(req, {
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
  } catch (error: any) {
    console.error("DELETE /api/documents/:id error", error);
    res.status(500).json({
      error: "Falha ao excluir documento",
      detail: error?.message || "Erro interno"
    });
  }
});

export default router;

