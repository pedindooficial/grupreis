"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const Client_1 = __importDefault(require("../models/Client"));
const router = (0, express_1.Router)();
// Função auxiliar para formatar endereço completo
function formatAddress(address) {
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
function processAddresses(addresses) {
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
const clientAddressSchema = zod_1.z.object({
    _id: zod_1.z.string().optional(),
    label: zod_1.z.string().optional(),
    address: zod_1.z.string().optional(),
    addressStreet: zod_1.z.string().optional(),
    addressNumber: zod_1.z.string().optional(),
    addressNeighborhood: zod_1.z.string().optional(),
    addressCity: zod_1.z.string().optional(),
    addressState: zod_1.z.string().optional(),
    addressZip: zod_1.z.string().optional(),
    latitude: zod_1.z.number().optional(),
    longitude: zod_1.z.number().optional()
});
const clientSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, "Nome obrigatório"),
    personType: zod_1.z.enum(["cpf", "cnpj"]).optional(),
    docNumber: zod_1.z.string().optional(),
    contact: zod_1.z.string().optional(),
    phone: zod_1.z.string().optional(),
    email: zod_1.z.string().email("E-mail inválido").optional(),
    // Campos legados para compatibilidade
    address: zod_1.z.string().optional(),
    addressStreet: zod_1.z.string().optional(),
    addressNumber: zod_1.z.string().optional(),
    addressNeighborhood: zod_1.z.string().optional(),
    addressCity: zod_1.z.string().optional(),
    addressState: zod_1.z.string().optional(),
    addressZip: zod_1.z.string().optional(),
    // Novo campo: array de endereços
    addresses: zod_1.z.array(clientAddressSchema).optional()
});
router.get("/", async (_req, res) => {
    try {
        await (0, db_1.connectDB)();
        const clients = await Client_1.default.find().sort({ createdAt: -1 }).lean();
        res.json({ data: clients });
    }
    catch (error) {
        console.error("GET /clients error", error);
        res
            .status(500)
            .json({ error: "Falha ao carregar clientes", detail: error?.message });
    }
});
// GET single client by ID
router.get("/:id", async (req, res) => {
    try {
        await (0, db_1.connectDB)();
        const client = await Client_1.default.findById(req.params.id).lean();
        if (!client) {
            return res.status(404).json({ error: "Cliente não encontrado" });
        }
        res.json({ data: client });
    }
    catch (error) {
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
        await (0, db_1.connectDB)();
        const docNumber = parsed.data.docNumber?.trim();
        const personType = parsed.data.personType || "cpf";
        if (docNumber) {
            const exists = await Client_1.default.findOne({ docNumber, personType }).lean();
            if (exists) {
                return res
                    .status(409)
                    .json({ error: "Cliente já cadastrado com este documento." });
            }
        }
        // Processar endereços
        const processedAddresses = processAddresses(parsed.data.addresses);
        const createData = {
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
        const created = await Client_1.default.create(createData);
        res.status(201).json({ data: created });
    }
    catch (error) {
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
        await (0, db_1.connectDB)();
        const docNumber = parsed.data.docNumber?.trim();
        const personType = parsed.data.personType || "cpf";
        // Verificar se outro cliente já tem este documento (exceto o atual)
        if (docNumber) {
            const exists = await Client_1.default.findOne({
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
        const updateData = {
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
        const updated = await Client_1.default.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
        if (!updated) {
            return res.status(404).json({ error: "Cliente não encontrado" });
        }
        res.json({ data: updated });
    }
    catch (error) {
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
        const { address, addressStreet, addressNumber, addressNeighborhood, addressCity, addressState, addressZip, latitude, longitude } = req.body;
        await (0, db_1.connectDB)();
        const client = await Client_1.default.findById(id);
        if (!client) {
            return res.status(404).json({ error: "Cliente não encontrado" });
        }
        // Update main address fields
        if (address)
            client.address = address;
        if (addressStreet)
            client.addressStreet = addressStreet;
        if (addressNumber)
            client.addressNumber = addressNumber;
        if (addressNeighborhood)
            client.addressNeighborhood = addressNeighborhood;
        if (addressCity)
            client.addressCity = addressCity;
        if (addressState)
            client.addressState = addressState;
        if (addressZip)
            client.addressZip = addressZip;
        // Also update in addresses array if exists
        if (client.addresses && client.addresses.length > 0) {
            const mainAddress = client.addresses.find(addr => addr.label === "Endereço Principal");
            if (mainAddress) {
                if (address)
                    mainAddress.address = address;
                if (addressStreet)
                    mainAddress.addressStreet = addressStreet;
                if (addressNumber)
                    mainAddress.addressNumber = addressNumber;
                if (addressNeighborhood)
                    mainAddress.addressNeighborhood = addressNeighborhood;
                if (addressCity)
                    mainAddress.addressCity = addressCity;
                if (addressState)
                    mainAddress.addressState = addressState;
                if (addressZip)
                    mainAddress.addressZip = addressZip;
                if (latitude !== undefined)
                    mainAddress.latitude = latitude;
                if (longitude !== undefined)
                    mainAddress.longitude = longitude;
            }
        }
        await client.save();
        res.json({
            data: client,
            message: "Localização atualizada com sucesso"
        });
    }
    catch (error) {
        console.error(`PUT /clients/${req.params.id}/location error`, error);
        res.status(500).json({
            error: "Falha ao atualizar localização do cliente",
            detail: error?.message || "Erro interno"
        });
    }
});
router.delete("/:id", async (req, res) => {
    try {
        await (0, db_1.connectDB)();
        const deleted = await Client_1.default.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: "Cliente não encontrado" });
        }
        res.json({ ok: true });
    }
    catch (error) {
        console.error("DELETE /clients/:id error", error);
        res.status(500).json({
            error: "Falha ao excluir cliente",
            detail: error?.message || "Erro interno"
        });
    }
});
exports.default = router;
