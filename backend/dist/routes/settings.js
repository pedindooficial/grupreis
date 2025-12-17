"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const Settings_1 = __importDefault(require("../models/Settings"));
const router = (0, express_1.Router)();
const settingsSchema = zod_1.z.object({
    companyName: zod_1.z.string().optional(),
    headquartersAddress: zod_1.z.string().optional(),
    headquartersStreet: zod_1.z.string().optional(),
    headquartersNumber: zod_1.z.string().optional(),
    headquartersNeighborhood: zod_1.z.string().optional(),
    headquartersCity: zod_1.z.string().optional(),
    headquartersState: zod_1.z.string().optional(),
    headquartersZip: zod_1.z.string().optional(),
    phone: zod_1.z.string().optional(),
    email: zod_1.z.string().email("E-mail inválido").optional(),
    companySignature: zod_1.z.string().optional()
});
router.get("/", async (_req, res) => {
    try {
        await (0, db_1.connectDB)();
        let settings = await Settings_1.default.findOne().lean();
        if (!settings) {
            settings = await Settings_1.default.create({});
        }
        res.json({ data: settings });
    }
    catch (error) {
        console.error("GET /settings error", error);
        res.status(500).json({
            error: "Falha ao carregar configurações",
            detail: error?.message || "Erro interno"
        });
    }
});
router.put("/", async (req, res) => {
    try {
        const parsed = settingsSchema.safeParse(req.body);
        if (!parsed.success) {
            return res
                .status(400)
                .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
        }
        await (0, db_1.connectDB)();
        const settings = await Settings_1.default.findOneAndUpdate({}, parsed.data, { new: true, upsert: true, runValidators: true });
        res.json({ data: settings });
    }
    catch (error) {
        console.error("PUT /settings error", error);
        res.status(500).json({
            error: "Falha ao salvar configurações",
            detail: error?.message || "Erro interno"
        });
    }
});
exports.default = router;
