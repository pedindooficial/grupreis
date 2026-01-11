"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const Client_1 = __importDefault(require("../models/Client"));
const client_auth_1 = require("../middleware/client-auth");
const email_1 = require("../services/email");
const crypto_1 = __importDefault(require("crypto"));
const router = (0, express_1.Router)();
const registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Nome é obrigatório"),
    email: zod_1.z.string().email("Email inválido"),
    password: zod_1.z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
    phone: zod_1.z.string().optional(),
    docNumber: zod_1.z.string().optional(),
    personType: zod_1.z.enum(["cpf", "cnpj"]).optional()
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email("Email inválido"),
    password: zod_1.z.string().min(1, "Senha obrigatória")
});
const passwordResetRequestSchema = zod_1.z.object({
    email: zod_1.z.string().email("Email inválido")
});
const passwordResetConfirmSchema = zod_1.z.object({
    token: zod_1.z.string().min(1, "Token é obrigatório"),
    password: zod_1.z.string().min(6, "Senha deve ter no mínimo 6 caracteres")
});
// Register new client
router.post("/register", async (req, res) => {
    try {
        const parsed = registerSchema.safeParse(req.body);
        if (!parsed.success) {
            return res
                .status(400)
                .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
        }
        await (0, db_1.connectDB)();
        // Check if client with this email already exists
        const existingClient = await Client_1.default.findOne({
            email: parsed.data.email.toLowerCase()
        });
        if (existingClient) {
            return res.status(400).json({
                error: "Já existe um cliente cadastrado com este email"
            });
        }
        // Create new client
        const client = await Client_1.default.create({
            name: parsed.data.name,
            email: parsed.data.email.toLowerCase(),
            password: parsed.data.password,
            phone: parsed.data.phone,
            docNumber: parsed.data.docNumber,
            personType: parsed.data.personType || "cpf"
        });
        // Generate token
        const token = (0, client_auth_1.generateClientToken)(client._id.toString(), client.email || "");
        res.status(201).json({
            data: {
                client: {
                    id: client._id.toString(),
                    name: client.name,
                    email: client.email
                },
                token
            }
        });
    }
    catch (error) {
        console.error("POST /api/client-auth/register error", error);
        res.status(500).json({
            error: "Falha ao registrar cliente",
            detail: error?.message || "Erro interno"
        });
    }
});
// Login client
router.post("/login", async (req, res) => {
    try {
        const parsed = loginSchema.safeParse(req.body);
        if (!parsed.success) {
            return res
                .status(400)
                .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
        }
        await (0, db_1.connectDB)();
        const client = await Client_1.default.findOne({
            email: parsed.data.email.toLowerCase()
        }).select("+password"); // Include password field
        if (!client) {
            return res.status(401).json({ error: "Credenciais inválidas." });
        }
        if (!client.password) {
            return res.status(401).json({
                error: "Conta não possui senha cadastrada. Use a opção de redefinição de senha."
            });
        }
        const isPasswordValid = await client.comparePassword(parsed.data.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Credenciais inválidas." });
        }
        // Generate token
        const token = (0, client_auth_1.generateClientToken)(client._id.toString(), client.email || "");
        res.json({
            data: {
                client: {
                    id: client._id.toString(),
                    name: client.name,
                    email: client.email
                },
                token
            }
        });
    }
    catch (error) {
        console.error("POST /api/client-auth/login error", error);
        res.status(500).json({
            error: "Falha ao autenticar",
            detail: error?.message || "Erro interno"
        });
    }
});
// Request password reset
router.post("/password-reset", async (req, res) => {
    try {
        const parsed = passwordResetRequestSchema.safeParse(req.body);
        if (!parsed.success) {
            return res
                .status(400)
                .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
        }
        await (0, db_1.connectDB)();
        const client = await Client_1.default.findOne({
            email: parsed.data.email.toLowerCase()
        });
        // Don't reveal if email exists or not (security best practice)
        if (!client) {
            // Still return success to prevent email enumeration
            return res.json({
                data: { message: "Se o email existir, você receberá um link para redefinir sua senha." }
            });
        }
        // Generate reset token
        const resetToken = crypto_1.default.randomBytes(32).toString("hex");
        const resetExpires = new Date();
        resetExpires.setHours(resetExpires.getHours() + 1); // Token expires in 1 hour
        await Client_1.default.findByIdAndUpdate(client._id, {
            passwordResetToken: resetToken,
            passwordResetExpires: resetExpires
        });
        // Send email
        try {
            await (0, email_1.sendPasswordResetEmail)(client.email || "", resetToken, client.name);
        }
        catch (emailError) {
            console.error("Error sending password reset email:", emailError);
            // Don't fail the request, just log the error
        }
        res.json({
            data: { message: "Se o email existir, você receberá um link para redefinir sua senha." }
        });
    }
    catch (error) {
        console.error("POST /api/client-auth/password-reset error", error);
        res.status(500).json({
            error: "Falha ao processar solicitação",
            detail: error?.message || "Erro interno"
        });
    }
});
// Confirm password reset
router.post("/password-reset/confirm", async (req, res) => {
    try {
        const parsed = passwordResetConfirmSchema.safeParse(req.body);
        if (!parsed.success) {
            return res
                .status(400)
                .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
        }
        await (0, db_1.connectDB)();
        const client = await Client_1.default.findOne({
            passwordResetToken: parsed.data.token,
            passwordResetExpires: { $gt: new Date() } // Token not expired
        }).select("+passwordResetToken +passwordResetExpires");
        if (!client) {
            return res.status(400).json({
                error: "Token inválido ou expirado"
            });
        }
        // Update password and clear reset token
        client.password = parsed.data.password;
        client.passwordResetToken = undefined;
        client.passwordResetExpires = undefined;
        await client.save();
        // Generate new token for immediate login
        const token = (0, client_auth_1.generateClientToken)(client._id.toString(), client.email || "");
        res.json({
            data: {
                message: "Senha redefinida com sucesso",
                client: {
                    id: client._id.toString(),
                    name: client.name,
                    email: client.email
                },
                token
            }
        });
    }
    catch (error) {
        console.error("POST /api/client-auth/password-reset/confirm error", error);
        res.status(500).json({
            error: "Falha ao redefinir senha",
            detail: error?.message || "Erro interno"
        });
    }
});
exports.default = router;
