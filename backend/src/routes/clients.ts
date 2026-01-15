import { Router } from "express";
import { z } from "zod";
import { connectDB } from "../db";
import ClientModel from "../models/Client";
import BudgetModel from "../models/Budget";
import JobModel from "../models/Job";
import { authenticate } from "../middleware/auth";

const router = Router();

// Função auxiliar para formatar endereço completo
function formatAddress(address: {
  addressStreet?: string;
  addressNumber?: string;
  addressNeighborhood?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
}): string {
  return [
    [address.addressStreet, address.addressNumber].filter(Boolean).join(", "),
    address.addressNeighborhood,
    [address.addressCity, address.addressState].filter(Boolean).join(" - "),
    address.addressZip
  ]
    .filter((v) => v && v.trim().length > 0)
    .join(", ");
}

// Função auxiliar para processar e formatar array de endereços
function processAddresses(addresses?: any[]): any[] {
  if (!addresses || !Array.isArray(addresses)) {
    return [];
  }
  
  return addresses.map((addr) => {
    const formattedAddress = formatAddress(addr);
    return {
      ...addr,
      address: formattedAddress || addr.address || ""
    };
  });
}

const clientAddressSchema = z.object({
  _id: z.string().optional(),
  label: z.string().optional(),
  address: z.string().optional(),
  addressStreet: z.string().optional(),
  addressNumber: z.string().optional(),
  addressNeighborhood: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().optional(),
  addressZip: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional()
});

const clientSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  personType: z.enum(["cpf", "cnpj"]).optional(),
  docNumber: z.string().optional(),
  contact: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("E-mail inválido").optional(),
  // Campos legados para compatibilidade
  address: z.string().optional(),
  addressStreet: z.string().optional(),
  addressNumber: z.string().optional(),
  addressNeighborhood: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().optional(),
  addressZip: z.string().optional(),
  // Novo campo: array de endereços
  addresses: z.array(clientAddressSchema).optional()
});

router.get("/", async (req, res) => {
  try {
    await connectDB();
    
    // Parse query parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string)?.trim() || "";
    const filterType = req.query.filterType as string || "all";
    
    // Build filter query
    const filter: any = {};
    
    // Filter by personType if specified
    if (filterType !== "all" && (filterType === "cpf" || filterType === "cnpj")) {
      filter.personType = filterType;
    }
    
    // Search filter (name, docNumber, or phone)
    if (search) {
      const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { name: searchRegex },
        { docNumber: searchRegex },
        { phone: searchRegex }
      ];
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Get total count for pagination metadata
    const total = await ClientModel.countDocuments(filter);
    
    // Fetch paginated results
    const clients = await ClientModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    const totalPages = Math.ceil(total / limit);
    
    res.json({
      data: clients,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error: any) {
    console.error("GET /clients error", error);
    res
      .status(500)
      .json({ error: "Falha ao carregar clientes", detail: error?.message });
  }
});

// GET - Watch for real-time updates (must be before /:id route to avoid conflict)
// Note: No authentication required as EventSource doesn't support custom headers
// This route is only accessible from authenticated dashboard pages
router.get("/watch", async (req, res) => {
  try {
    await connectDB();

    // Set up SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering

    // Send initial connection message
    res.write(`: connected\n\n`);

    // Watch for changes in Clients collection
    // Note: Simplified pipeline - MongoDB Change Streams don't support complex $or in $match
    const clientChangeStream = ClientModel.watch(
      [],
      { fullDocument: "updateLookup" }
    );

    // Watch for changes in Budgets collection (especially approvals/rejections)
    const budgetChangeStream = BudgetModel.watch(
      [],
      { fullDocument: "updateLookup" }
    );

    // Watch for changes in Jobs collection
    const jobChangeStream = JobModel.watch(
      [],
      { fullDocument: "updateLookup" }
    );

    // Handle Client changes
    clientChangeStream.on("change", async (change) => {
      try {
        // Filter operation types in code
        if (!["insert", "update", "delete"].includes(change.operationType)) {
          return;
        }

        if (change.operationType === "insert") {
          const client = change.fullDocument;
          if (client) {
            res.write(
              `data: ${JSON.stringify({ type: "client", operation: "insert", client })}\n\n`
            );
          }
        } else if (change.operationType === "update") {
          const clientId = change.documentKey?._id?.toString();
          if (change.fullDocument) {
            res.write(
              `data: ${JSON.stringify({ type: "client", operation: "update", client: change.fullDocument, clientId })}\n\n`
            );
          } else if (clientId) {
            const client = await ClientModel.findById(clientId).lean();
            if (client) {
              res.write(
                `data: ${JSON.stringify({ type: "client", operation: "update", client, clientId })}\n\n`
              );
            }
          }
        } else if (change.operationType === "delete") {
          const clientId = change.documentKey?._id?.toString();
          if (clientId) {
            res.write(
              `data: ${JSON.stringify({ type: "client", operation: "delete", clientId })}\n\n`
            );
          }
        }
      } catch (error) {
        console.error("Error processing client change:", error);
      }
    });

    // Handle Budget changes
    budgetChangeStream.on("change", async (change) => {
      try {
        // Only process updates that affect relevant fields
        if (change.operationType === "update" && change.fullDocument) {
          const budget = change.fullDocument;
          const clientId = budget.clientId?.toString();
          
          // Check if relevant fields were updated
          const updatedFields = change.updateDescription?.updatedFields || {};
          const hasRelevantUpdate = 
            updatedFields.approved !== undefined ||
            updatedFields.rejected !== undefined ||
            updatedFields.status !== undefined ||
            updatedFields.clientSignature !== undefined;
          
          if (clientId && hasRelevantUpdate) {
            res.write(
              `data: ${JSON.stringify({ type: "budget", budget, clientId })}\n\n`
            );
          }
        }
      } catch (error) {
        console.error("Error processing budget change:", error);
      }
    });

    // Handle Job changes
    jobChangeStream.on("change", async (change) => {
      try {
        // Only process updates that affect relevant fields
        if (change.operationType === "update" && change.fullDocument) {
          const job = change.fullDocument;
          const clientId = job.clientId?.toString();
          
          // Check if relevant fields were updated
          const updatedFields = change.updateDescription?.updatedFields || {};
          const hasRelevantUpdate = 
            updatedFields.status !== undefined ||
            updatedFields.clientId !== undefined;
          
          if (clientId && hasRelevantUpdate) {
            res.write(
              `data: ${JSON.stringify({ type: "job", job, clientId })}\n\n`
            );
          }
        }
      } catch (error) {
        console.error("Error processing job change:", error);
      }
    });

    // Keep connection alive
    const keepAliveInterval = setInterval(() => {
      res.write(`: keepalive\n\n`);
    }, 30000);

    // Handle client disconnect
    req.on("close", () => {
      clearInterval(keepAliveInterval);
      clientChangeStream.close();
      budgetChangeStream.close();
      jobChangeStream.close();
    });
  } catch (error: any) {
    console.error("GET /clients/watch error", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: "Falha ao estabelecer conexão SSE",
        detail: error?.message || "Erro interno"
      });
    }
  }
});

// GET single client by ID
router.get("/:id", async (req, res) => {
  try {
    await connectDB();
    const client = await ClientModel.findById(req.params.id).lean();
    if (!client) {
      return res.status(404).json({ error: "Cliente não encontrado" });
    }
    res.json({ data: client });
  } catch (error: any) {
    console.error("GET /clients/:id error", error);
    res
      .status(500)
      .json({ error: "Falha ao buscar cliente", detail: error?.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const parsed = clientSchema.safeParse(req.body);

    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
    }

    await connectDB();
    const docNumber = parsed.data.docNumber?.trim();
    const personType = parsed.data.personType || "cpf";

    if (docNumber) {
      const exists = await ClientModel.findOne({ docNumber, personType }).lean();
      if (exists) {
        return res
          .status(409)
          .json({ error: "Cliente já cadastrado com este documento." });
      }
    }

    // Processar endereços
    const processedAddresses = processAddresses(parsed.data.addresses);
    
    const createData: any = {
      name: parsed.data.name,
      personType,
      docNumber,
      contact: parsed.data.contact,
      phone: parsed.data.phone,
      email: parsed.data.email,
      addresses: processedAddresses.length > 0 ? processedAddresses : []
    };
    
    // Don't use legacy address fields when creating with addresses array
    // This keeps the data clean
    
    const created = await ClientModel.create(createData);

    res.status(201).json({ data: created });
  } catch (error: any) {
    console.error("POST /clients error", error);
    res
      .status(500)
      .json({ error: "Falha ao salvar cliente", detail: error?.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const parsed = clientSchema.safeParse(req.body);

    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
    }

    await connectDB();

    const docNumber = parsed.data.docNumber?.trim();
    const personType = parsed.data.personType || "cpf";

    // Verificar se outro cliente já tem este documento (exceto o atual)
    if (docNumber) {
      const exists = await ClientModel.findOne({
        docNumber,
        personType,
        _id: { $ne: req.params.id }
      }).lean();
      if (exists) {
        return res
          .status(409)
          .json({ error: "Cliente já cadastrado com este documento." });
      }
    }

    // Processar endereços
    const processedAddresses = parsed.data.addresses !== undefined 
      ? processAddresses(parsed.data.addresses)
      : undefined;
    
    const updateData: any = {
      name: parsed.data.name,
      personType,
      docNumber,
      contact: parsed.data.contact,
      phone: parsed.data.phone,
      email: parsed.data.email
    };
    
    // Incluir addresses apenas se fornecidos (substitui completamente os endereços existentes)
    if (processedAddresses !== undefined) {
      updateData.addresses = processedAddresses;
      
      // Clear legacy address fields when using addresses array
      // This prevents confusion between old and new address system
      updateData.address = "";
      updateData.addressStreet = "";
      updateData.addressNumber = "";
      updateData.addressNeighborhood = "";
      updateData.addressCity = "";
      updateData.addressState = "";
      updateData.addressZip = "";
      
      console.log(`✅ Clearing legacy address fields for client ${req.params.id}`);
      console.log(`📍 New addresses array length: ${processedAddresses.length}`);
    }
    
    const updated = await ClientModel.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Cliente não encontrado" });
    }

    res.json({ data: updated });
  } catch (error: any) {
    console.error("PUT /clients/:id error", error);
    res.status(500).json({
      error: "Falha ao atualizar cliente",
      detail: error?.message || "Erro interno"
    });
  }
});

// Update client location from capture
router.put("/:id/location", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      address,
      addressStreet,
      addressNumber,
      addressNeighborhood,
      addressCity,
      addressState,
      addressZip,
      latitude,
      longitude
    } = req.body;

    await connectDB();

    const client = await ClientModel.findById(id);
    if (!client) {
      return res.status(404).json({ error: "Cliente não encontrado" });
    }

    // Update main address fields
    if (address) client.address = address;
    if (addressStreet) client.addressStreet = addressStreet;
    if (addressNumber) client.addressNumber = addressNumber;
    if (addressNeighborhood) client.addressNeighborhood = addressNeighborhood;
    if (addressCity) client.addressCity = addressCity;
    if (addressState) client.addressState = addressState;
    if (addressZip) client.addressZip = addressZip;

    // Also update in addresses array if exists
    if (client.addresses && client.addresses.length > 0) {
      const mainAddress = client.addresses.find(addr => addr.label === "Endereço Principal");
      if (mainAddress) {
        if (address) mainAddress.address = address;
        if (addressStreet) mainAddress.addressStreet = addressStreet;
        if (addressNumber) mainAddress.addressNumber = addressNumber;
        if (addressNeighborhood) mainAddress.addressNeighborhood = addressNeighborhood;
        if (addressCity) mainAddress.addressCity = addressCity;
        if (addressState) mainAddress.addressState = addressState;
        if (addressZip) mainAddress.addressZip = addressZip;
        if (latitude !== undefined) mainAddress.latitude = latitude;
        if (longitude !== undefined) mainAddress.longitude = longitude;
      }
    }

    await client.save();

    res.json({ 
      data: client,
      message: "Localização atualizada com sucesso"
    });
  } catch (error: any) {
    console.error(`PUT /clients/${req.params.id}/location error`, error);
    res.status(500).json({
      error: "Falha ao atualizar localização do cliente",
      detail: error?.message || "Erro interno"
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await connectDB();

    const deleted = await ClientModel.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Cliente não encontrado" });
    }

    res.json({ ok: true });
  } catch (error: any) {
    console.error("DELETE /clients/:id error", error);
    res.status(500).json({
      error: "Falha ao excluir cliente",
      detail: error?.message || "Erro interno"
    });
  }
});

export default router;


