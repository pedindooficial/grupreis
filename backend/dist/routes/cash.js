"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const CashTransaction_1 = __importDefault(require("../models/CashTransaction"));
const Cashier_1 = __importDefault(require("../models/Cashier"));
const Client_1 = __importDefault(require("../models/Client"));
const Job_1 = __importDefault(require("../models/Job"));
const router = (0, express_1.Router)();
const transactionSchema = zod_1.z.object({
    type: zod_1.z.enum(["entrada", "saida"]),
    amount: zod_1.z.number().positive("Valor deve ser maior que zero"),
    description: zod_1.z.string().min(1, "Descrição obrigatória"),
    date: zod_1.z.string().min(1, "Data obrigatória"),
    clientId: zod_1.z.string().optional().nullable(),
    clientName: zod_1.z.string().optional(),
    jobId: zod_1.z.string().optional().nullable(),
    jobTitle: zod_1.z.string().optional(),
    paymentMethod: zod_1.z.enum(["dinheiro", "pix", "transferencia", "cartao", "cheque", "outro"]),
    category: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional()
});
router.get("/", async (req, res) => {
    try {
        await (0, db_1.connectDB)();
        const { date, type, clientId } = req.query;
        const matchStage = {};
        if (date)
            matchStage.date = date;
        if (type && (type === "entrada" || type === "saida"))
            matchStage.type = type;
        if (clientId)
            matchStage.clientId = clientId;
        const pipeline = [];
        if (Object.keys(matchStage).length > 0) {
            pipeline.push({ $match: matchStage });
        }
        pipeline.push({ $sort: { date: -1, createdAt: -1 } }, {
            $project: {
                type: 1,
                amount: 1,
                description: 1,
                date: 1,
                clientId: 1,
                clientName: 1,
                jobId: 1,
                jobTitle: 1,
                paymentMethod: 1,
                category: 1,
                notes: 1,
                cashierId: 1,
                createdAt: 1,
                updatedAt: 1
            }
        });
        const transactions = await CashTransaction_1.default.aggregate(pipeline);
        res.json({ data: transactions });
    }
    catch (error) {
        console.error("GET /api/cash error", error);
        res.status(500).json({
            error: "Falha ao carregar transações",
            detail: error?.message || "Erro interno"
        });
    }
});
router.post("/", async (req, res) => {
    try {
        const parsed = transactionSchema.safeParse(req.body);
        if (!parsed.success) {
            return res
                .status(400)
                .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
        }
        await (0, db_1.connectDB)();
        // Check if there's an open cashier
        const openCashier = await Cashier_1.default.findOne({ status: "aberto" }).lean();
        if (!openCashier) {
            return res.status(400).json({
                error: "Nenhum caixa aberto. Abra um caixa antes de registrar transações."
            });
        }
        let clientName = parsed.data.clientName?.trim();
        let jobTitle = parsed.data.jobTitle?.trim();
        let clientId = parsed.data.clientId || null;
        let jobId = parsed.data.jobId || null;
        if (clientId) {
            const client = await Client_1.default.findById(clientId).lean();
            if (client) {
                clientName = client.name || clientName;
            }
        }
        if (jobId) {
            // Check if a transaction already exists for this job
            const existingTransaction = await CashTransaction_1.default.findOne({
                jobId: jobId,
                type: "entrada"
            }).lean();
            if (existingTransaction) {
                return res.status(409).json({
                    error: "Já existe uma transação registrada para esta OS",
                    detail: "Cada Order de Serviço pode ter apenas uma transação de recebimento"
                });
            }
            const job = await Job_1.default.findById(jobId).lean();
            if (job) {
                jobTitle = job.title || jobTitle;
                if (!clientId && job.clientId) {
                    clientId = job.clientId.toString();
                    const client = await Client_1.default.findById(job.clientId).lean();
                    if (client) {
                        clientName = client.name || clientName;
                    }
                }
            }
        }
        const created = await CashTransaction_1.default.create({
            ...parsed.data,
            clientId: clientId || undefined,
            clientName,
            jobId: jobId || undefined,
            jobTitle,
            cashierId: openCashier._id
        });
        res.status(201).json({ data: created });
    }
    catch (error) {
        console.error("POST /api/cash error", error);
        res.status(500).json({
            error: "Falha ao salvar transação",
            detail: error?.message || "Erro interno"
        });
    }
});
router.delete("/:id", async (req, res) => {
    try {
        await (0, db_1.connectDB)();
        const deleted = await CashTransaction_1.default.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: "Transação não encontrada" });
        }
        res.json({ ok: true });
    }
    catch (error) {
        console.error("DELETE /api/cash/:id error", error);
        res.status(500).json({
            error: "Falha ao excluir transação",
            detail: error?.message || "Erro interno"
        });
    }
});
exports.default = router;
