import { Router } from "express";
import { z } from "zod";
import { connectDB } from "../db";
import ClientModel from "../models/Client";

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
    .join(" | ");
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

router.get("/", async (_req, res) => {
  try {
    await connectDB();
    const clients = await ClientModel.find().sort({ createdAt: -1 }).lean();
    res.json({ data: clients });
  } catch (error: any) {
    console.error("GET /clients error", error);
    res
      .status(500)
      .json({ error: "Falha ao carregar clientes", detail: error?.message });
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
    
    const created = await ClientModel.create({
      ...parsed.data,
      personType,
      docNumber,
      addresses: processedAddresses.length > 0 ? processedAddresses : undefined
    });

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


