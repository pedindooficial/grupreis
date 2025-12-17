"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const Cashier_1 = __importDefault(require("../models/Cashier"));
const CashTransaction_1 = __importDefault(require("../models/CashTransaction"));
const router = (0, express_1.Router)();
const openCashierSchema = zod_1.z.object({
    openingBalance: zod_1.z.number().min(0).default(0),
    openedBy: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional()
});
const closeCashierSchema = zod_1.z.object({
    closingBalance: zod_1.z.number().min(0).optional(),
    closedBy: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional()
});
// Get current cashier (open or most recent closed)
router.get("/current", async (_req, res) => {
    try {
        await (0, db_1.connectDB)();
        // First, try to find an open cashier
        const openCashier = await Cashier_1.default.findOne({ status: "aberto" })
            .sort({ openedAt: -1 })
            .lean();
        if (openCashier) {
            // Calculate current balance from transactions
            const transactions = await CashTransaction_1.default.find({
                cashierId: openCashier._id
            }).lean();
            const totalEntradas = transactions
                .filter((t) => t.type === "entrada")
                .reduce((sum, t) => sum + (t.amount || 0), 0);
            const totalSaidas = transactions
                .filter((t) => t.type === "saida")
                .reduce((sum, t) => sum + (t.amount || 0), 0);
            const currentBalance = (openCashier.openingBalance || 0) + totalEntradas - totalSaidas;
            return res.json({
                data: {
                    ...openCashier,
                    currentBalance
                }
            });
        }
        // If no open cashier, return the most recent closed one
        const lastClosed = await Cashier_1.default.findOne({ status: "fechado" })
            .sort({ closedAt: -1 })
            .lean();
        res.json({ data: lastClosed || null });
    }
    catch (error) {
        console.error("GET /api/cashiers/current error", error);
        res.status(500).json({
            error: "Falha ao carregar caixa",
            detail: error?.message || "Erro interno"
        });
    }
});
// List all cashiers
router.get("/", async (req, res) => {
    try {
        await (0, db_1.connectDB)();
        const { status } = req.query;
        const query = {};
        if (status && (status === "aberto" || status === "fechado")) {
            query.status = status;
        }
        const cashiers = await Cashier_1.default.find(query)
            .sort({ openedAt: -1 })
            .lean();
        res.json({ data: cashiers });
    }
    catch (error) {
        console.error("GET /api/cashiers error", error);
        res.status(500).json({
            error: "Falha ao carregar caixas",
            detail: error?.message || "Erro interno"
        });
    }
});
// Open a new cashier
router.post("/open", async (req, res) => {
    try {
        const parsed = openCashierSchema.safeParse(req.body);
        if (!parsed.success) {
            return res
                .status(400)
                .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
        }
        await (0, db_1.connectDB)();
        // Check if there's already an open cashier
        const existingOpen = await Cashier_1.default.findOne({ status: "aberto" }).lean();
        if (existingOpen) {
            return res.status(409).json({
                error: "Já existe um caixa aberto. Feche o caixa atual antes de abrir outro."
            });
        }
        const created = await Cashier_1.default.create({
            status: "aberto",
            openingBalance: parsed.data.openingBalance || 0,
            openedBy: parsed.data.openedBy,
            notes: parsed.data.notes,
            openedAt: new Date()
        });
        res.status(201).json({ data: created });
    }
    catch (error) {
        console.error("POST /api/cashiers/open error", error);
        res.status(500).json({
            error: "Falha ao abrir caixa",
            detail: error?.message || "Erro interno"
        });
    }
});
// Close the current cashier
router.post("/close", async (req, res) => {
    try {
        const parsed = closeCashierSchema.safeParse(req.body);
        if (!parsed.success) {
            return res
                .status(400)
                .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
        }
        await (0, db_1.connectDB)();
        const openCashier = await Cashier_1.default.findOne({ status: "aberto" }).lean();
        if (!openCashier) {
            return res.status(404).json({
                error: "Nenhum caixa aberto encontrado"
            });
        }
        // Calculate final balance from transactions
        const transactions = await CashTransaction_1.default.find({
            cashierId: openCashier._id
        }).lean();
        const totalEntradas = transactions
            .filter((t) => t.type === "entrada")
            .reduce((sum, t) => sum + (t.amount || 0), 0);
        const totalSaidas = transactions
            .filter((t) => t.type === "saida")
            .reduce((sum, t) => sum + (t.amount || 0), 0);
        const calculatedBalance = (openCashier.openingBalance || 0) + totalEntradas - totalSaidas;
        const closingBalance = parsed.data.closingBalance ?? calculatedBalance;
        const updated = await Cashier_1.default.findByIdAndUpdate(openCashier._id, {
            status: "fechado",
            closedAt: new Date(),
            closingBalance,
            closedBy: parsed.data.closedBy,
            notes: parsed.data.notes
        }, { new: true });
        res.json({ data: updated });
    }
    catch (error) {
        console.error("POST /api/cashiers/close error", error);
        res.status(500).json({
            error: "Falha ao fechar caixa",
            detail: error?.message || "Erro interno"
        });
    }
});
exports.default = router;
