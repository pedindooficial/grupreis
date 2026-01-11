import { Router } from "express";
import { z } from "zod";
import { connectDB } from "../db";
import ClientModel from "../models/Client";
import BudgetModel from "../models/Budget";
import JobModel from "../models/Job";
import { authenticateClient, ClientAuthRequest } from "../middleware/client-auth";

const router = Router();

// All routes require client authentication
router.use(authenticateClient);

// Get client's own data
router.get("/me", async (req: ClientAuthRequest, res) => {
  try {
    if (!req.client) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    await connectDB();

    const client = await ClientModel.findById(req.client.id)
      .select("-password -passwordResetToken -passwordResetExpires")
      .lean();

    if (!client) {
      return res.status(404).json({ error: "Cliente não encontrado" });
    }

    res.json({ data: client });
  } catch (error: any) {
    console.error("GET /api/client-protected/me error", error);
    res.status(500).json({
      error: "Falha ao carregar dados do cliente",
      detail: error?.message || "Erro interno"
    });
  }
});

// Get client's budgets
router.get("/budgets", async (req: ClientAuthRequest, res) => {
  try {
    if (!req.client) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    await connectDB();

    const budgets = await BudgetModel.find({ clientId: req.client.id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ data: budgets });
  } catch (error: any) {
    console.error("GET /api/client-protected/budgets error", error);
    res.status(500).json({
      error: "Falha ao carregar orçamentos",
      detail: error?.message || "Erro interno"
    });
  }
});

// Get single budget
router.get("/budgets/:id", async (req: ClientAuthRequest, res) => {
  try {
    if (!req.client) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    await connectDB();

    const budget = await BudgetModel.findOne({
      _id: req.params.id,
      clientId: req.client.id
    }).lean();

    if (!budget) {
      return res.status(404).json({ error: "Orçamento não encontrado" });
    }

    res.json({ data: budget });
  } catch (error: any) {
    console.error("GET /api/client-protected/budgets/:id error", error);
    res.status(500).json({
      error: "Falha ao carregar orçamento",
      detail: error?.message || "Erro interno"
    });
  }
});

// Get client's addresses
router.get("/addresses", async (req: ClientAuthRequest, res) => {
  try {
    if (!req.client) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    await connectDB();

    const client = await ClientModel.findById(req.client.id)
      .select("addresses")
      .lean();

    if (!client) {
      return res.status(404).json({ error: "Cliente não encontrado" });
    }

    res.json({ data: client.addresses || [] });
  } catch (error: any) {
    console.error("GET /api/client-protected/addresses error", error);
    res.status(500).json({
      error: "Falha ao carregar endereços",
      detail: error?.message || "Erro interno"
    });
  }
});

// Add new address
const addAddressSchema = z.object({
  label: z.string().min(1, "Rótulo é obrigatório"),
  address: z.string().min(1, "Endereço é obrigatório"),
  addressStreet: z.string().optional(),
  addressNumber: z.string().optional(),
  addressNeighborhood: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().optional(),
  addressZip: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional()
});

router.post("/addresses", async (req: ClientAuthRequest, res) => {
  try {
    if (!req.client) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    const parsed = addAddressSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
    }

    await connectDB();

    const client = await ClientModel.findById(req.client.id);
    if (!client) {
      return res.status(404).json({ error: "Cliente não encontrado" });
    }

    if (!client.addresses) {
      client.addresses = [];
    }

    client.addresses.push(parsed.data);
    await client.save();

    const newAddress = client.addresses[client.addresses.length - 1];

    res.status(201).json({ data: newAddress });
  } catch (error: any) {
    console.error("POST /api/client-protected/addresses error", error);
    res.status(500).json({
      error: "Falha ao adicionar endereço",
      detail: error?.message || "Erro interno"
    });
  }
});

// Update address
const updateAddressSchema = z.object({
  label: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  addressStreet: z.string().optional(),
  addressNumber: z.string().optional(),
  addressNeighborhood: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().optional(),
  addressZip: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional()
});

router.put("/addresses/:addressId", async (req: ClientAuthRequest, res) => {
  try {
    if (!req.client) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    const parsed = updateAddressSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
    }

    await connectDB();

    const client = await ClientModel.findById(req.client.id);
    if (!client) {
      return res.status(404).json({ error: "Cliente não encontrado" });
    }

    if (!client.addresses) {
      return res.status(404).json({ error: "Endereço não encontrado" });
    }

    const addressIndex = client.addresses.findIndex(
      (addr) => addr._id?.toString() === req.params.addressId
    );

    if (addressIndex === -1) {
      return res.status(404).json({ error: "Endereço não encontrado" });
    }

    // Update address fields
    Object.assign(client.addresses[addressIndex], parsed.data);
    await client.save();

    res.json({ data: client.addresses[addressIndex] });
  } catch (error: any) {
    console.error("PUT /api/client-protected/addresses/:addressId error", error);
    res.status(500).json({
      error: "Falha ao atualizar endereço",
      detail: error?.message || "Erro interno"
    });
  }
});

// Delete address
router.delete("/addresses/:addressId", async (req: ClientAuthRequest, res) => {
  try {
    if (!req.client) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    await connectDB();

    const client = await ClientModel.findById(req.client.id);
    if (!client) {
      return res.status(404).json({ error: "Cliente não encontrado" });
    }

    if (!client.addresses) {
      return res.status(404).json({ error: "Endereço não encontrado" });
    }

    const addressIndex = client.addresses.findIndex(
      (addr) => addr._id?.toString() === req.params.addressId
    );

    if (addressIndex === -1) {
      return res.status(404).json({ error: "Endereço não encontrado" });
    }

    client.addresses.splice(addressIndex, 1);
    await client.save();

    res.json({ data: { _id: req.params.addressId } });
  } catch (error: any) {
    console.error("DELETE /api/client-protected/addresses/:addressId error", error);
    res.status(500).json({
      error: "Falha ao deletar endereço",
      detail: error?.message || "Erro interno"
    });
  }
});

// Approve budget with signature
const approveBudgetSchema = z.object({
  signature: z.string().min(1, "Assinatura é obrigatória")
});

router.post("/budgets/:id/approve", async (req: ClientAuthRequest, res) => {
  try {
    if (!req.client) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    const parsed = approveBudgetSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
    }

    await connectDB();

    const budget = await BudgetModel.findOne({
      _id: req.params.id,
      clientId: req.client.id
    });

    if (!budget) {
      return res.status(404).json({ error: "Orçamento não encontrado" });
    }

    // Check if already approved (but allow approving after rejection)
    if (budget.approved) {
      return res.status(400).json({ 
        error: "Este orçamento já foi aprovado" 
      });
    }

    // Update budget with approval (even if previously rejected)
    budget.approved = true;
    budget.approvedAt = new Date();
    budget.clientSignature = parsed.data.signature;
    budget.clientSignedAt = new Date();
    budget.status = "aprovado";
    // Clear rejection status if it was previously rejected
    if (budget.rejected) {
      budget.rejected = false;
      budget.rejectedAt = undefined;
      budget.rejectionReason = undefined;
    }
    await budget.save();

    res.json({ 
      data: { 
        message: "Orçamento aprovado com sucesso",
        budget 
      } 
    });
  } catch (error: any) {
    console.error("POST /api/client-protected/budgets/:id/approve error", error);
    res.status(500).json({
      error: "Falha ao aprovar orçamento",
      detail: error?.message || "Erro interno"
    });
  }
});

// Reject budget with reason
const rejectBudgetSchema = z.object({
  rejectionReason: z.string().min(1, "Motivo da rejeição é obrigatório")
});

router.post("/budgets/:id/reject", async (req: ClientAuthRequest, res) => {
  try {
    if (!req.client) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    const parsed = rejectBudgetSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
    }

    await connectDB();

    const budget = await BudgetModel.findOne({
      _id: req.params.id,
      clientId: req.client.id
    });

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
    console.error("POST /api/client-protected/budgets/:id/reject error", error);
    res.status(500).json({
      error: "Falha ao rejeitar orçamento",
      detail: error?.message || "Erro interno"
    });
  }
});

// Get client's jobs (OS)
router.get("/jobs", async (req: ClientAuthRequest, res) => {
  try {
    if (!req.client) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    await connectDB();

    const jobs = await JobModel.find({ clientId: req.client.id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ data: jobs });
  } catch (error: any) {
    console.error("GET /api/client-protected/jobs error", error);
    res.status(500).json({
      error: "Falha ao carregar ordens de serviço",
      detail: error?.message || "Erro interno"
    });
  }
});

// Get single job (OS)
router.get("/jobs/:id", async (req: ClientAuthRequest, res) => {
  try {
    if (!req.client) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    await connectDB();

    const job = await JobModel.findOne({
      _id: req.params.id,
      clientId: req.client.id
    }).lean();

    if (!job) {
      return res.status(404).json({ error: "Ordem de serviço não encontrada" });
    }

    res.json({ data: job });
  } catch (error: any) {
    console.error("GET /api/client-protected/jobs/:id error", error);
    res.status(500).json({
      error: "Falha ao carregar ordem de serviço",
      detail: error?.message || "Erro interno"
    });
  }
});

export default router;

