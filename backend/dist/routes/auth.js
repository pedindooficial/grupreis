"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const User_1 = __importDefault(require("../models/User"));
const audit_1 = require("../services/audit");
const router = (0, express_1.Router)();
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email("Email inválido"),
    password: zod_1.z.string().min(1, "Senha obrigatória")
});
router.post("/login", async (req, res) => {
    try {
        const parsed = loginSchema.safeParse(req.body);
        if (!parsed.success) {
            return res
                .status(400)
                .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
        }
        await (0, db_1.connectDB)();
        const user = await User_1.default.findOne({ email: parsed.data.email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ error: "Credenciais inválidas." });
        }
        if (!user.active) {
            return res.status(403).json({ error: "Usuário inativo. Entre em contato com o administrador." });
        }
        const isPasswordValid = await user.comparePassword(parsed.data.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Credenciais inválidas." });
        }
        // Return user without password
        const { password: _, ...userWithoutPassword } = user.toObject();
        // Log login action
        await (0, audit_1.logAudit)(req, {
            action: "login",
            resource: "other",
            userId: user._id.toString(),
            userEmail: user.email,
            userName: user.name,
            details: `Login realizado: ${user.email}`
        });
        res.json({
            user: {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    }
    catch (error) {
        console.error("POST /api/auth/login error", error);
        res.status(500).json({
            error: "Falha ao autenticar",
            detail: error?.message || "Erro interno"
        });
    }
});
exports.default = router;
