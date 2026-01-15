import { Router } from "express";
import { z } from "zod";
import { connectDB } from "../db";
import OrcamentoRequestModel from "../models/OrcamentoRequest";
import ClientModel from "../models/Client";
import BudgetModel from "../models/Budget";
import JobModel from "../models/Job";
import CatalogModel from "../models/Catalog";

const router = Router();

const orcamentoRequestSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  phone: z.string().min(1, "Telefone obrigatório"),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(), // Latitude: -90 to 90
  longitude: z.number().min(-180).max(180).optional(), // Longitude: -180 to 180
  locationType: z.string().optional(),
  soilType: z.string().optional(),
  access: z.string().optional(),
  deadline: z.string().optional(),
  sptDiagnostic: z.string().optional(),
  services: z.array(
    z.object({
      serviceType: z.string(),
      serviceTypeOther: z.string().optional(),
      serviceId: z.string().optional(), // Catalog service ID
      serviceName: z.string().optional(), // Catalog service name
      diameter: z.string().optional(),
      depth: z.string().optional(),
      depthOther: z.string().optional(),
      quantity: z.string().optional(),
      quantityOther: z.string().optional()
    })
  ).min(1, "Pelo menos um serviço é obrigatório"),
  source: z.string().optional()
});

// POST - Create new orcamento request (public endpoint)
router.post("/", async (req, res) => {
  try {
    const parsed = orcamentoRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
    }

    await connectDB();

    // Generate sequence number
    const lastRequest = await OrcamentoRequestModel.findOne()
      .sort({ seq: -1 })
      .lean();
    const seq = (lastRequest?.seq || 0) + 1;

    const request = await OrcamentoRequestModel.create({
      ...parsed.data,
      seq,
      status: "pendente",
      source: parsed.data.source || "website"
    });

    res.status(201).json({
      data: request,
      message: "Solicitação de orçamento recebida com sucesso!"
    });
  } catch (error: any) {
    console.error("POST /api/orcamento-requests error", error);
    res.status(500).json({
      error: "Falha ao salvar solicitação",
      detail: error?.message || "Erro interno"
    });
  }
});

// GET - Count pending orcamento requests (protected)
router.get("/count/pending", async (req, res) => {
  try {
    await connectDB();
    // Count only non-archived pending requests
    const count = await OrcamentoRequestModel.countDocuments({ 
      status: "pendente",
      archived: { $ne: true }
    });
    res.json({ data: { count } });
  } catch (error: any) {
    console.error("GET /api/orcamento-requests/count/pending error", error);
    res.status(500).json({
      error: "Falha ao contar solicitações pendentes",
      detail: error?.message || "Erro interno"
    });
  }
});

// GET - Real-time count updates via SSE (protected)
router.get("/count/watch", async (req, res) => {
  try {
    await connectDB();

    // Set up SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering

    // Send initial count (only non-archived pending requests)
    const initialCount = await OrcamentoRequestModel.countDocuments({ 
      status: "pendente",
      archived: { $ne: true }
    });
    res.write(`data: ${JSON.stringify({ type: "count", count: initialCount })}\n\n`);

    // Watch for changes in orcamento requests collection using MongoDB Change Streams
    // Note: Simplified pipeline - MongoDB Change Streams don't support complex $or in $match
    const changeStream = OrcamentoRequestModel.watch(
      [],
      { fullDocument: "updateLookup" }
    );

    changeStream.on("change", async (change) => {
      try {
        // Filter operation types in code
        if (!["insert", "update", "delete"].includes(change.operationType)) {
          return;
        }

        // For updates, only recalculate if status or archived field was changed
        if (change.operationType === "update") {
          const updatedFields = change.updateDescription?.updatedFields || {};
          if (!updatedFields.status && !updatedFields.archived) {
            return; // Status or archived wasn't updated, no need to recalculate count
          }
        }

        // Recalculate count when there's a relevant change (only non-archived pending requests)
        const count = await OrcamentoRequestModel.countDocuments({ 
          status: "pendente",
          archived: { $ne: true }
        });
        res.write(`data: ${JSON.stringify({ type: "count", count })}\n\n`);
      } catch (error) {
        console.error("Error calculating count in change stream:", error);
      }
    });

    changeStream.on("error", (error) => {
      console.error("Change stream error in count watch:", error);
      res.write(`event: error\ndata: ${JSON.stringify({ error: "Erro na conexão" })}\n\n`);
    });

    // Send keep-alive heartbeat every 30 seconds to prevent connection timeout
    const keepAliveInterval = setInterval(() => {
      try {
        if (!res.destroyed && !res.closed) {
          res.write(`: keepalive\n\n`);
        }
      } catch (error) {
        console.error("Error sending keep-alive:", error);
        clearInterval(keepAliveInterval);
      }
    }, 30000); // 30 seconds

    // Handle client disconnect
    req.on("close", () => {
      console.log("Client disconnected from orcamento requests count watch");
      clearInterval(keepAliveInterval);
      changeStream.close();
      res.end();
    });

    // Handle request abort
    req.on("aborted", () => {
      console.log("Request aborted for orcamento requests count watch");
      clearInterval(keepAliveInterval);
      changeStream.close();
      if (!res.headersSent) {
        res.end();
      }
    });
  } catch (error: any) {
    console.error("GET /api/orcamento-requests/count/watch error", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: "Falha ao estabelecer conexão",
        detail: error?.message || "Erro interno"
      });
    }
  }
});

// GET - List all orcamento requests (protected)
router.get("/", async (req, res) => {
  try {
    await connectDB();

    const { status, search, showArchived } = req.query;
    
    const query: any = {};
    
    // By default, exclude archived requests unless showArchived is true
    // Normalize showArchived to a boolean - it comes as a string from query params
    const shouldShowArchived = showArchived === "true" || showArchived === "1";
    if (!shouldShowArchived) {
      query.archived = { $ne: true };
    }
    
    if (status && status !== "all") {
      query.status = status;
    }
    if (search && typeof search === "string") {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } }
      ];
    }

    const requests = await OrcamentoRequestModel.find(query)
      .sort({ createdAt: -1 })
      .lean();

    res.json({ data: requests });
  } catch (error: any) {
    console.error("GET /api/orcamento-requests error", error);
    res.status(500).json({
      error: "Falha ao carregar solicitações",
      detail: error?.message || "Erro interno"
    });
  }
});

// GET - Watch for real-time updates (must be before /:id route)
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

    // Watch for changes in orcamento requests collection using MongoDB Change Streams
    // Note: Simplified pipeline - MongoDB Change Streams don't support complex $or in $match
    const changeStream = OrcamentoRequestModel.watch(
      [],
      { fullDocument: "updateLookup" }
    );

    changeStream.on("change", async (change) => {
      try {
        // Filter operation types in code
        if (!["insert", "update", "delete"].includes(change.operationType)) {
          return;
        }

        let isRelevant = true; // All changes are relevant for the dashboard
        let requestId: string | null = null;

        if (change.operationType === "insert") {
          const request = change.fullDocument;
          if (request) {
            requestId = request._id?.toString() || null;
            // Send the new request
            res.write(
              `data: ${JSON.stringify({ type: "insert", request, requestId, operationType: change.operationType })}\n\n`
            );
          }
        } else if (change.operationType === "update") {
          requestId = change.documentKey?._id?.toString() || null;
          if (change.fullDocument) {
            // Send the updated request
            res.write(
              `data: ${JSON.stringify({ type: "update", request: change.fullDocument, requestId, operationType: change.operationType })}\n\n`
            );
          } else if (requestId) {
            // Fetch the updated document
            const request = await OrcamentoRequestModel.findById(requestId).lean();
            if (request) {
              res.write(
                `data: ${JSON.stringify({ type: "update", request, requestId, operationType: change.operationType })}\n\n`
              );
            }
          }
        } else if (change.operationType === "delete") {
          requestId = change.documentKey?._id?.toString() || null;
          // Send delete notification
          res.write(
            `data: ${JSON.stringify({ type: "delete", requestId, operationType: change.operationType })}\n\n`
          );
        }

        // Also send a refresh signal to fetch all requests
        if (isRelevant) {
          const allRequests = await OrcamentoRequestModel.find()
            .sort({ createdAt: -1 })
            .lean();
          res.write(
            `data: ${JSON.stringify({ type: "refresh", requests: allRequests })}\n\n`
          );
        }
      } catch (error) {
        console.error("Error in change stream:", error);
        res.write(`event: error\ndata: ${JSON.stringify({ error: "Erro ao processar atualização" })}\n\n`);
      }
    });

    changeStream.on("error", (error) => {
      console.error("Change stream error:", error);
      res.write(`event: error\ndata: ${JSON.stringify({ error: "Erro na conexão" })}\n\n`);
    });

    // Send keep-alive heartbeat every 30 seconds to prevent connection timeout
    const keepAliveInterval = setInterval(() => {
      try {
        if (!res.destroyed && !res.closed) {
          res.write(`: keepalive\n\n`);
        }
      } catch (error) {
        console.error("Error sending keep-alive:", error);
        clearInterval(keepAliveInterval);
      }
    }, 30000); // 30 seconds

    // Handle client disconnect
    req.on("close", () => {
      console.log("Client disconnected from orcamento requests watch");
      clearInterval(keepAliveInterval);
      changeStream.close();
      res.end();
    });

    // Handle request abort
    req.on("aborted", () => {
      console.log("Request aborted for orcamento requests watch");
      clearInterval(keepAliveInterval);
      changeStream.close();
      if (!res.headersSent) {
        res.end();
      }
    });
  } catch (error: any) {
    console.error("GET /api/orcamento-requests/watch error", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: "Falha ao estabelecer conexão",
        detail: error?.message || "Erro interno"
      });
    }
  }
});

// GET - Get single orcamento request
// GET - Check if client exists for a request
router.get("/:id/check-client", async (req, res) => {
  try {
    await connectDB();

    const request = await OrcamentoRequestModel.findById(req.params.id).lean();
    if (!request) {
      return res.status(404).json({ error: "Solicitação não encontrada" });
    }

    // Check if client already exists by phone, email, or CPF
    let existingClient = null;
    
    // Check by phone
    if (request.phone) {
      existingClient = await ClientModel.findOne({ phone: request.phone })
        .select("_id name phone email docNumber personType")
        .lean();
    }
    
    // Check by email
    if (!existingClient && request.email) {
      existingClient = await ClientModel.findOne({ email: request.email })
        .select("_id name phone email docNumber personType")
        .lean();
    }
    
    // Check by name and phone combination
    if (!existingClient && request.phone && request.name) {
      existingClient = await ClientModel.findOne({ 
        name: request.name,
        phone: request.phone 
      })
        .select("_id name phone email docNumber personType")
        .lean();
    }

    res.json({
      data: {
        hasClient: !!existingClient,
        client: existingClient ? {
          id: existingClient._id.toString(),
          name: existingClient.name,
          phone: existingClient.phone,
          email: existingClient.email,
          docNumber: existingClient.docNumber,
          personType: existingClient.personType
        } : null
      }
    });
  } catch (error: any) {
    console.error("GET /api/orcamento-requests/:id/check-client error", error);
    res.status(500).json({
      error: "Falha ao verificar cliente",
      detail: error?.message || "Erro interno"
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    await connectDB();

    const request = await OrcamentoRequestModel.findById(req.params.id).lean();

    if (!request) {
      return res.status(404).json({ error: "Solicitação não encontrada" });
    }

    res.json({ data: request });
  } catch (error: any) {
    console.error("GET /api/orcamento-requests/:id error", error);
    res.status(500).json({
      error: "Falha ao carregar solicitação",
      detail: error?.message || "Erro interno"
    });
  }
});

// PATCH - Update orcamento request status/notes
router.patch("/:id", async (req, res) => {
  try {
    await connectDB();

    const updateSchema = z.object({
      status: z.enum(["pendente", "em_contato", "convertido", "descartado"]).optional(),
      notes: z.string().optional(),
      archived: z.boolean().optional()
    });

    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
    }

    const updateData: any = { ...parsed.data };
    
    // If archiving, set archivedAt timestamp
    if (updateData.archived === true) {
      updateData.archivedAt = new Date();
    } else if (updateData.archived === false) {
      updateData.archivedAt = null;
    }

    const request = await OrcamentoRequestModel.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).lean();

    if (!request) {
      return res.status(404).json({ error: "Solicitação não encontrada" });
    }

    res.json({ data: request });
  } catch (error: any) {
    console.error("PATCH /api/orcamento-requests/:id error", error);
    res.status(500).json({
      error: "Falha ao atualizar solicitação",
      detail: error?.message || "Erro interno"
    });
  }
});

// POST - Convert orcamento request to client and optionally budget
router.post("/:id/convert", async (req, res) => {
  try {
    await connectDB();

    const convertSchema = z.object({
      createBudget: z.boolean().optional().default(false),
      notes: z.string().optional()
    });

    const parsed = convertSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
    }

    const request = await OrcamentoRequestModel.findById(req.params.id).lean();
    if (!request) {
      return res.status(404).json({ error: "Solicitação não encontrada" });
    }

    if (request.status === "convertido") {
      return res.status(400).json({
        error: "Esta solicitação já foi convertida"
      });
    }

    // Step 1: Check if client already exists by phone or email
    let existingClient = null;
    if (request.phone) {
      existingClient = await ClientModel.findOne({ phone: request.phone });
    }
    if (!existingClient && request.email) {
      existingClient = await ClientModel.findOne({ email: request.email });
    }
    // Also check by name and phone combination as a fallback
    if (!existingClient && request.phone && request.name) {
      existingClient = await ClientModel.findOne({ 
        name: request.name,
        phone: request.phone 
      });
    }

    // Step 2: Create or update client
    let client;
    if (!existingClient) {
      // Create new client
      // Generate a unique docNumber if not provided to avoid duplicate key errors on the unique index
      // Use a timestamp-based unique identifier prefixed with "TEMP_" to indicate it's auto-generated
      const uniqueDocNumber = `TEMP_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      const clientData: any = {
        name: request.name,
        phone: request.phone,
        personType: "cpf",
        docNumber: uniqueDocNumber // Set unique docNumber to avoid index conflicts
      };
      
      if (request.email) clientData.email = request.email;
      if (request.address) clientData.address = request.address;
      
      // Always add address to addresses array if we have address or coordinates
      const addressData: any = {};
      if (request.address) addressData.address = request.address;
      if (request.latitude !== undefined && request.latitude !== null) {
        addressData.latitude = request.latitude;
      }
      if (request.longitude !== undefined && request.longitude !== null) {
        addressData.longitude = request.longitude;
      }
      
      if (Object.keys(addressData).length > 0) {
        clientData.addresses = [addressData];
      }
      
      try {
        // Try to create the client
        client = await ClientModel.create(clientData);
        await client.save(); // Ensure it's saved
        console.log("Client created successfully:", client._id.toString());
      } catch (createError: any) {
        // If duplicate key error, try to find existing client
        if (createError.code === 11000 || createError.message?.includes("duplicate key")) {
          console.warn("Duplicate key error, trying to find existing client:", createError.message);
          
          // Check if it's the personType/docNumber duplicate
          const isPersonTypeDocNumberDuplicate = createError.message?.includes("personType_1_docNumber_1");
          
          let foundClient = null;
          
          if (isPersonTypeDocNumberDuplicate) {
            // For personType/docNumber duplicates, query by the exact index fields
            // The error says there's a client with { personType: "cpf", docNumber: null }
            // First try to find by index + contact info to get the right client
            const queryByIndexAndContact: any = {
              personType: "cpf",
              $or: [
                { docNumber: null },
                { docNumber: { $exists: false } },
                { docNumber: "" }
              ]
            };
            
            // Try to match by phone first (most reliable)
            if (request.phone) {
              queryByIndexAndContact.phone = request.phone;
              foundClient = await ClientModel.findOne(queryByIndexAndContact);
            }
            
            // If not found, try by email
            if (!foundClient && request.email) {
              const queryByIndexAndEmail = { ...queryByIndexAndContact };
              delete queryByIndexAndEmail.phone;
              queryByIndexAndEmail.email = request.email;
              foundClient = await ClientModel.findOne(queryByIndexAndEmail);
            }
            
            // If still not found, try by name
            if (!foundClient && request.name) {
              const queryByIndexAndName = { ...queryByIndexAndContact };
              delete queryByIndexAndName.phone;
              queryByIndexAndName.name = request.name;
              foundClient = await ClientModel.findOne(queryByIndexAndName);
            }
            
            // Last resort: just find any client with the duplicate index values
            if (!foundClient) {
              foundClient = await ClientModel.findOne({ 
                personType: "cpf",
                $or: [
                  { docNumber: null },
                  { docNumber: { $exists: false } },
                  { docNumber: "" }
                ]
              });
              
              if (foundClient) {
                console.warn("Found client by index only (contact info doesn't match). Using it anyway.");
              }
            }
          }
          
          // If not found by index or not an index duplicate, try other strategies
          if (!foundClient) {
            // Strategy 1: By phone
            if (request.phone) {
              foundClient = await ClientModel.findOne({ phone: request.phone });
            }
            
            // Strategy 2: By email
            if (!foundClient && request.email) {
              foundClient = await ClientModel.findOne({ email: request.email });
            }
            
            // Strategy 3: By name and phone (most reliable for duplicate key errors)
            if (!foundClient && request.phone && request.name) {
              foundClient = await ClientModel.findOne({ 
                name: request.name,
                phone: request.phone 
              });
            }
            
            // Strategy 4: By name only (last resort)
            if (!foundClient && request.name) {
              foundClient = await ClientModel.findOne({ name: request.name });
            }
          }
          
          if (foundClient) {
            client = foundClient;
            console.log("Found existing client after duplicate key error:", client._id.toString());
          } else {
            // If we still can't find it, the duplicate might be a different issue
            console.error("Duplicate key error but could not find existing client:", createError.message);
            console.error("Request data:", { name: request.name, phone: request.phone, email: request.email });
            throw new Error(`Falha ao criar cliente: Cliente duplicado encontrado mas não foi possível localizá-lo. ${createError.message}`);
          }
        } else {
          console.error("Error creating client:", createError);
          throw new Error(`Falha ao criar cliente: ${createError.message}`);
        }
      }
    } else {
      // Update existing client
      client = existingClient;
      const updateData: any = {};
      let needsUpdate = false;
      
      if (request.name && !client.name) {
        updateData.name = request.name;
        needsUpdate = true;
      }
      if (request.email && !client.email) {
        updateData.email = request.email;
        needsUpdate = true;
      }
      if (request.address && !client.address) {
        updateData.address = request.address;
        needsUpdate = true;
      }
      
      // Add address to addresses array if we have new address/coordinates
      const hasNewAddress = request.address || (request.latitude && request.longitude);
      if (hasNewAddress) {
        const addresses = client.addresses || [];
        // Check if this address already exists
        const addressExists = addresses.some((addr: any) => 
          addr.address === request.address ||
          (addr.latitude === request.latitude && addr.longitude === request.longitude)
        );
        
        if (!addressExists) {
          const newAddress: any = {};
          if (request.address) newAddress.address = request.address;
          if (request.latitude !== undefined && request.latitude !== null) {
            newAddress.latitude = request.latitude;
          }
          if (request.longitude !== undefined && request.longitude !== null) {
            newAddress.longitude = request.longitude;
          }
          updateData.$push = { addresses: newAddress };
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        try {
          await ClientModel.findByIdAndUpdate(client._id, updateData, { new: true });
          // Reload client to get updated data
          client = await ClientModel.findById(client._id);
          console.log("Client updated successfully:", client?._id.toString());
        } catch (updateError: any) {
          console.error("Error updating client:", updateError);
          throw new Error(`Falha ao atualizar cliente: ${updateError.message}`);
        }
      } else {
        console.log("Client already exists, no update needed:", client._id.toString());
      }
    }

    // Ensure we have a valid client ID
    if (!client || !client._id) {
      throw new Error("Falha ao obter ID do cliente");
    }
    
    const clientId = client._id;

    let budget = null;
    if (parsed.data.createBudget) {
      try {
        // Helper function to map orçamento request soil type to catalog soil type
        const mapSoilTypeToCatalog = (soilType: string | undefined): "argiloso" | "arenoso" | "rochoso" | "misturado" | "outro" => {
          if (!soilType) return "outro";
          const mapping: Record<string, "argiloso" | "arenoso" | "rochoso" | "misturado" | "outro"> = {
            "terra_comum": "misturado",
            "argiloso": "argiloso",
            "arenoso": "arenoso",
            "rochoso": "rochoso",
            "nao_sei": "misturado"
          };
          return mapping[soilType] || "outro";
        };

        // Helper function to map orçamento request access to catalog access
        const mapAccessToCatalog = (access: string | undefined): "livre" | "limitado" | "restrito" => {
          if (!access) return "livre";
          const mapping: Record<string, "livre" | "limitado" | "restrito"> = {
            "facil": "livre",
            "medio": "limitado",
            "dificil": "restrito"
          };
          return mapping[access] || "livre";
        };

        // Convert services to budget format with price calculation
        const budgetServices = await Promise.all(
          request.services.map(async (s) => {
            let catalogId = undefined;
            let serviceName = s.serviceName;
            let basePrice = 0;
            let executionTime = 0;
            let value = 0;
            
            // Ensure diameter includes "cm" suffix
            let diametro = s.diameter;
            if (diametro && !diametro.includes("cm")) {
              // Remove any non-numeric characters and add "cm"
              const diameterNum = diametro.replace(/\D/g, "");
              if (diameterNum) {
                diametro = `${diameterNum}cm`;
              }
            }
            
            // Get profundidade and quantidade
            const profundidade = s.depth === "outro" ? s.depthOther : s.depth;
            const quantidade = s.quantity === "outro" ? s.quantityOther : s.quantity;
            
            // If serviceId is provided, try to find the catalog item and calculate price
            if (s.serviceId) {
              try {
                const catalogItem = await CatalogModel.findById(s.serviceId).lean();
                if (catalogItem) {
                  catalogId = catalogItem._id;
                  serviceName = catalogItem.name; // Use catalog name if found
                  
                  // Calculate price if we have all required fields
                  if (diametro && request.soilType && request.access && quantidade && profundidade) {
                    const catalogSoilType = mapSoilTypeToCatalog(request.soilType);
                    const catalogAccess = mapAccessToCatalog(request.access);
                    const diameterNum = parseInt(diametro.replace(/\D/g, ""), 10);
                    
                    if (!isNaN(diameterNum)) {
                      const priceVariation = catalogItem.priceVariations?.find(
                        (pv: any) =>
                          pv.diameter === diameterNum &&
                          pv.soilType === catalogSoilType &&
                          pv.access === catalogAccess
                      );
                      
                      if (priceVariation) {
                        basePrice = priceVariation.price || 0;
                        executionTime = priceVariation.executionTime || 0;
                        
                        // Calculate value: (quantity * profundidade) * basePrice
                        const quantityNum = parseFloat(quantidade) || 0;
                        const depthNum = parseFloat(profundidade) || 0;
                        value = (quantityNum * depthNum) * basePrice;
                      }
                    }
                  }
                }
              } catch (catalogError) {
                console.warn(`Catalog item not found for serviceId: ${s.serviceId}`, catalogError);
              }
            }
            
            // Determine service name/type
            const service =
              serviceName ||
              (s.serviceType === "outro" && s.serviceTypeOther
                ? s.serviceTypeOther
                : s.serviceType);
            
            return {
              catalogId: catalogId,
              service: service,
              localType: request.locationType,
              soilType: request.soilType, // Keep original soil type for display
              access: request.access, // Keep original access for display
              diametro: diametro, // Ensure it has "cm" suffix
              profundidade: profundidade,
              quantidade: quantidade,
              basePrice: basePrice > 0 ? basePrice : undefined,
              executionTime: executionTime > 0 ? executionTime : undefined,
              value: value > 0 ? value : undefined,
              finalValue: value > 0 ? value : undefined
            };
          })
        );

        // Calculate total budget value
        const totalValue = budgetServices.reduce((sum, s) => sum + (s.value || 0), 0);

        // Generate budget sequence
        const lastBudget = await BudgetModel.findOne().sort({ seq: -1 }).lean();
        const budgetSeq = (lastBudget?.seq || 0) + 1;

        budget = await BudgetModel.create({
          seq: budgetSeq,
          title: `Orçamento ${request.name} - ORC${String(budgetSeq).padStart(6, "0")}`,
          clientId: clientId, // Use the clientId variable
          clientName: request.name,
          services: budgetServices,
          value: totalValue > 0 ? totalValue : undefined,
          finalValue: totalValue > 0 ? totalValue : undefined,
          status: "pendente",
          notes: parsed.data.notes || request.sptDiagnostic || undefined
        });
        console.log("Budget created:", budget._id);
      } catch (budgetError: any) {
        console.error("Error creating budget:", budgetError);
        throw new Error(`Falha ao criar orçamento: ${budgetError.message}`);
      }
    }

    // Step 3: Update request status with clientId and budgetId
    const updatedRequest = await OrcamentoRequestModel.findByIdAndUpdate(
      req.params.id,
      {
        status: "convertido",
        clientId: clientId,
        budgetId: budget?._id || null,
        notes: parsed.data.notes || undefined
      },
      { new: true }
    ).lean();

    console.log("Request updated, clientId:", clientId.toString(), "budgetId:", budget?._id?.toString() || "null");

    // Reload client to get latest data
    const clientData = await ClientModel.findById(clientId).lean();

    res.json({
      data: {
        request: updatedRequest,
        client: clientData ? {
          _id: clientData._id,
          name: clientData.name,
          phone: clientData.phone,
          email: clientData.email,
          address: clientData.address,
          addresses: clientData.addresses
        } : null,
        budget: budget ? {
          _id: budget._id,
          seq: budget.seq,
          title: budget.title
        } : null
      },
      message: budget 
        ? `Solicitação convertida com sucesso! Cliente e orçamento criados.`
        : `Solicitação convertida com sucesso! Cliente criado.`
    });
  } catch (error: any) {
    console.error("POST /api/orcamento-requests/:id/convert error", error);
    res.status(500).json({
      error: "Falha ao converter solicitação",
      detail: error?.message || "Erro interno"
    });
  }
});

// DELETE - Delete orcamento request
// POST - Convert request to budget using existing client
router.post("/:id/convert-to-budget", async (req, res) => {
  try {
    await connectDB();

    const convertSchema = z.object({
      clientId: z.string().min(1, "ID do cliente é obrigatório"),
      notes: z.string().optional()
    });

    const parsed = convertSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
    }

    const request = await OrcamentoRequestModel.findById(req.params.id).lean();
    if (!request) {
      return res.status(404).json({ error: "Solicitação não encontrada" });
    }

    if (request.status === "convertido") {
      return res.status(400).json({
        error: "Esta solicitação já foi convertida"
      });
    }

    // Verify client exists
    const client = await ClientModel.findById(parsed.data.clientId);
    if (!client) {
      return res.status(404).json({ error: "Cliente não encontrado" });
    }

    // Helper functions (same as in convert endpoint)
    const mapSoilTypeToCatalog = (soilType: string | undefined): "argiloso" | "arenoso" | "rochoso" | "misturado" | "outro" => {
      if (!soilType) return "outro";
      const mapping: Record<string, "argiloso" | "arenoso" | "rochoso" | "misturado" | "outro"> = {
        "terra_comum": "misturado",
        "argiloso": "argiloso",
        "arenoso": "arenoso",
        "rochoso": "rochoso",
        "nao_sei": "misturado"
      };
      return mapping[soilType] || "outro";
    };

    const mapAccessToCatalog = (access: string | undefined): "livre" | "limitado" | "restrito" => {
      if (!access) return "livre";
      const mapping: Record<string, "livre" | "limitado" | "restrito"> = {
        "facil": "livre",
        "medio": "limitado",
        "dificil": "restrito"
      };
      return mapping[access] || "livre";
    };

    // Convert services to budget format with price calculation (same logic as /convert endpoint)
    const budgetServices = await Promise.all(
      request.services.map(async (s) => {
        let catalogId = undefined;
        let serviceName = s.serviceName;
        let basePrice = 0;
        let executionTime = 0;
        let value = 0;
        
        // Ensure diameter includes "cm" suffix
        let diametro = s.diameter;
        if (diametro && !diametro.includes("cm")) {
          // Remove any non-numeric characters and add "cm"
          const diameterNum = diametro.replace(/\D/g, "");
          if (diameterNum) {
            diametro = `${diameterNum}cm`;
          }
        }
        
        // Get profundidade and quantidade
        const profundidade = s.depth === "outro" ? s.depthOther : s.depth;
        const quantidade = s.quantity === "outro" ? s.quantityOther : s.quantity;
        
        // If serviceId is provided, try to find the catalog item and calculate price
        if (s.serviceId) {
          try {
            const catalogItem = await CatalogModel.findById(s.serviceId).lean();
            if (catalogItem) {
              catalogId = catalogItem._id;
              serviceName = catalogItem.name; // Use catalog name if found
              
              // Calculate price if we have all required fields
              if (diametro && request.soilType && request.access && quantidade && profundidade) {
                const catalogSoilType = mapSoilTypeToCatalog(request.soilType);
                const catalogAccess = mapAccessToCatalog(request.access);
                const diameterNum = parseInt(diametro.replace(/\D/g, ""), 10);
                
                if (!isNaN(diameterNum)) {
                  const priceVariation = catalogItem.priceVariations?.find(
                    (pv: any) =>
                      pv.diameter === diameterNum &&
                      pv.soilType === catalogSoilType &&
                      pv.access === catalogAccess
                  );
                  
                  if (priceVariation) {
                    basePrice = priceVariation.price || 0;
                    executionTime = priceVariation.executionTime || 0;
                    
                    // Calculate value: (quantity * profundidade) * basePrice
                    const quantityNum = parseFloat(quantidade) || 0;
                    const depthNum = parseFloat(profundidade) || 0;
                    value = (quantityNum * depthNum) * basePrice;
                  }
                }
              }
            }
          } catch (catalogError) {
            console.warn(`Catalog item not found for serviceId: ${s.serviceId}`, catalogError);
          }
        }
        
        // Determine service name/type
        const service =
          serviceName ||
          (s.serviceType === "outro" && s.serviceTypeOther
            ? s.serviceTypeOther
            : s.serviceType);
        
        return {
          catalogId: catalogId,
          service: service,
          localType: request.locationType,
          soilType: request.soilType, // Keep original soil type for display
          access: request.access, // Keep original access for display
          diametro: diametro, // Ensure it has "cm" suffix
          profundidade: profundidade,
          quantidade: quantidade,
          basePrice: basePrice > 0 ? basePrice : undefined,
          executionTime: executionTime > 0 ? executionTime : undefined,
          value: value > 0 ? value : undefined,
          finalValue: value > 0 ? value : undefined
        };
      })
    );

    // Calculate total budget value
    const totalValue = budgetServices.reduce((sum, s) => sum + (s.value || 0), 0);

    // Generate budget sequence (same as /convert endpoint)
    const lastBudget = await BudgetModel.findOne().sort({ seq: -1 }).lean();
    const budgetSeq = (lastBudget?.seq || 0) + 1;

    // Create budget (same structure as /convert endpoint)
    const budget = await BudgetModel.create({
      seq: budgetSeq,
      title: `Orçamento ${request.name} - ORC${String(budgetSeq).padStart(6, "0")}`,
      clientId: client._id,
      clientName: request.name,
      services: budgetServices,
      value: totalValue > 0 ? totalValue : undefined,
      finalValue: totalValue > 0 ? totalValue : undefined,
      status: "pendente",
      notes: parsed.data.notes || request.sptDiagnostic || undefined
    });

    // Step 3: Update request status with clientId and budgetId (same as /convert endpoint)
    const updatedRequest = await OrcamentoRequestModel.findByIdAndUpdate(
      request._id,
      {
        status: "convertido",
        clientId: client._id,
        budgetId: budget._id,
        notes: parsed.data.notes || undefined
      },
      { new: true }
    ).lean();

    console.log("Request updated, clientId:", client._id.toString(), "budgetId:", budget._id?.toString() || "null");

    // Reload client to get latest data
    const clientData = await ClientModel.findById(client._id).lean();

    res.json({
      data: {
        request: updatedRequest,
        client: clientData ? {
          _id: clientData._id,
          name: clientData.name,
          phone: clientData.phone,
          email: clientData.email,
          address: clientData.address,
          addresses: clientData.addresses
        } : null,
        budget: budget ? {
          _id: budget._id,
          seq: budget.seq,
          title: budget.title
        } : null
      }
    });
  } catch (error: any) {
    console.error("POST /api/orcamento-requests/:id/convert-to-budget error", error);
    res.status(500).json({
      error: "Falha ao converter para orçamento",
      detail: error?.message || "Erro interno"
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await connectDB();

    const request = await OrcamentoRequestModel.findById(req.params.id).lean();
    if (!request) {
      return res.status(404).json({ error: "Solicitação não encontrada" });
    }

    if (request.status === "convertido") {
      return res.status(400).json({
        error: "Não é possível excluir uma solicitação convertida"
      });
    }

    await OrcamentoRequestModel.findByIdAndDelete(req.params.id);

    res.json({ message: "Solicitação excluída com sucesso" });
  } catch (error: any) {
    console.error("DELETE /api/orcamento-requests/:id error", error);
    res.status(500).json({
      error: "Falha ao excluir solicitação",
      detail: error?.message || "Erro interno"
    });
  }
});

export default router;




