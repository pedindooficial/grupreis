"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const Client_1 = __importDefault(require("../models/Client"));
const Budget_1 = __importDefault(require("../models/Budget"));
const client_auth_1 = require("../middleware/client-auth");
const router = (0, express_1.Router)();
// All routes require client authentication
router.use(client_auth_1.authenticateClient);
// Get client's own data
router.get("/me", async (req, res) => {
    try {
        if (!req.client) {
            return res.status(401).json({ error: "Não autenticado" });
        }
        await (0, db_1.connectDB)();
        const client = await Client_1.default.findById(req.client.id)
            .select("-password -passwordResetToken -passwordResetExpires")
            .lean();
        if (!client) {
            return res.status(404).json({ error: "Cliente não encontrado" });
        }
        res.json({ data: client });
    }
    catch (error) {
        console.error("GET /api/client-protected/me error", error);
        res.status(500).json({
            error: "Falha ao carregar dados do cliente",
            detail: error?.message || "Erro interno"
        });
    }
});
// Get client's budgets
router.get("/budgets", async (req, res) => {
    try {
        if (!req.client) {
            return res.status(401).json({ error: "Não autenticado" });
        }
        await (0, db_1.connectDB)();
        const budgets = await Budget_1.default.find({ clientId: req.client.id })
            .sort({ createdAt: -1 })
            .lean();
        res.json({ data: budgets });
    }
    catch (error) {
        console.error("GET /api/client-protected/budgets error", error);
        res.status(500).json({
            error: "Falha ao carregar orçamentos",
            detail: error?.message || "Erro interno"
        });
    }
});
// Get single budget
router.get("/budgets/:id", async (req, res) => {
    try {
        if (!req.client) {
            return res.status(401).json({ error: "Não autenticado" });
        }
        await (0, db_1.connectDB)();
        const budget = await Budget_1.default.findOne({
            _id: req.params.id,
            clientId: req.client.id
        }).lean();
        if (!budget) {
            return res.status(404).json({ error: "Orçamento não encontrado" });
        }
        res.json({ data: budget });
    }
    catch (error) {
        console.error("GET /api/client-protected/budgets/:id error", error);
        res.status(500).json({
            error: "Falha ao carregar orçamento",
            detail: error?.message || "Erro interno"
        });
    }
});
// Get client's addresses
router.get("/addresses", async (req, res) => {
    try {
        if (!req.client) {
            return res.status(401).json({ error: "Não autenticado" });
        }
        await (0, db_1.connectDB)();
        const client = await Client_1.default.findById(req.client.id)
            .select("addresses")
            .lean();
        if (!client) {
            return res.status(404).json({ error: "Cliente não encontrado" });
        }
        res.json({ data: client.addresses || [] });
    }
    catch (error) {
        console.error("GET /api/client-protected/addresses error", error);
        res.status(500).json({
            error: "Falha ao carregar endereços",
            detail: error?.message || "Erro interno"
        });
    }
});
// Add new address
const addAddressSchema = zod_1.z.object({
    label: zod_1.z.string().min(1, "Rótulo é obrigatório"),
    address: zod_1.z.string().min(1, "Endereço é obrigatório"),
    addressStreet: zod_1.z.string().optional(),
    addressNumber: zod_1.z.string().optional(),
    addressNeighborhood: zod_1.z.string().optional(),
    addressCity: zod_1.z.string().optional(),
    addressState: zod_1.z.string().optional(),
    addressZip: zod_1.z.string().optional(),
    latitude: zod_1.z.number().optional(),
    longitude: zod_1.z.number().optional()
});
router.post("/addresses", async (req, res) => {
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
        await (0, db_1.connectDB)();
        const client = await Client_1.default.findById(req.client.id);
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
    }
    catch (error) {
        console.error("POST /api/client-protected/addresses error", error);
        res.status(500).json({
            error: "Falha ao adicionar endereço",
            detail: error?.message || "Erro interno"
        });
    }
});
// Update address
const updateAddressSchema = zod_1.z.object({
    label: zod_1.z.string().min(1).optional(),
    address: zod_1.z.string().min(1).optional(),
    addressStreet: zod_1.z.string().optional(),
    addressNumber: zod_1.z.string().optional(),
    addressNeighborhood: zod_1.z.string().optional(),
    addressCity: zod_1.z.string().optional(),
    addressState: zod_1.z.string().optional(),
    addressZip: zod_1.z.string().optional(),
    latitude: zod_1.z.number().optional(),
    longitude: zod_1.z.number().optional()
});
router.put("/addresses/:addressId", async (req, res) => {
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
        await (0, db_1.connectDB)();
        const client = await Client_1.default.findById(req.client.id);
        if (!client) {
            return res.status(404).json({ error: "Cliente não encontrado" });
        }
        if (!client.addresses) {
            return res.status(404).json({ error: "Endereço não encontrado" });
        }
        const addressIndex = client.addresses.findIndex((addr) => addr._id?.toString() === req.params.addressId);
        if (addressIndex === -1) {
            return res.status(404).json({ error: "Endereço não encontrado" });
        }
        // Update address fields
        Object.assign(client.addresses[addressIndex], parsed.data);
        await client.save();
        res.json({ data: client.addresses[addressIndex] });
    }
    catch (error) {
        console.error("PUT /api/client-protected/addresses/:addressId error", error);
        res.status(500).json({
            error: "Falha ao atualizar endereço",
            detail: error?.message || "Erro interno"
        });
    }
});
// Delete address
router.delete("/addresses/:addressId", async (req, res) => {
    try {
        if (!req.client) {
            return res.status(401).json({ error: "Não autenticado" });
        }
        await (0, db_1.connectDB)();
        const client = await Client_1.default.findById(req.client.id);
        if (!client) {
            return res.status(404).json({ error: "Cliente não encontrado" });
        }
        if (!client.addresses) {
            return res.status(404).json({ error: "Endereço não encontrado" });
        }
        const addressIndex = client.addresses.findIndex((addr) => addr._id?.toString() === req.params.addressId);
        if (addressIndex === -1) {
            return res.status(404).json({ error: "Endereço não encontrado" });
        }
        client.addresses.splice(addressIndex, 1);
        await client.save();
        res.json({ data: { _id: req.params.addressId } });
    }
    catch (error) {
        console.error("DELETE /api/client-protected/addresses/:addressId error", error);
        res.status(500).json({
            error: "Falha ao deletar endereço",
            detail: error?.message || "Erro interno"
        });
    }
});
exports.default = router;
