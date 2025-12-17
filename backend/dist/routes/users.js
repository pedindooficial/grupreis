"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const User_1 = __importDefault(require("../models/User"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const createUserSchema = zod_1.z.object({
    email: zod_1.z.string().email("Email inválido"),
    password: zod_1.z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
    name: zod_1.z.string().min(1, "Nome obrigatório"),
    role: zod_1.z.enum(["admin", "user"]).optional(),
    active: zod_1.z.boolean().optional()
});
const updateUserSchema = zod_1.z.object({
    email: zod_1.z.string().email("Email inválido").optional(),
    password: zod_1.z.string().min(6, "Senha deve ter no mínimo 6 caracteres").optional(),
    name: zod_1.z.string().min(1, "Nome obrigatório").optional(),
    role: zod_1.z.enum(["admin", "user"]).optional(),
    active: zod_1.z.boolean().optional()
});
// All user routes require authentication and admin role
router.use(auth_1.authenticate);
router.use(auth_1.requireAdmin);
// GET /api/users - List all users
router.get("/", async (req, res) => {
    try {
        await (0, db_1.connectDB)();
        const users = await User_1.default.find()
            .select("-password") // Exclude password
            .sort({ createdAt: -1 })
            .lean();
        res.json({ data: users });
    }
    catch (error) {
        console.error("GET /api/users error", error);
        res.status(500).json({
            error: "Falha ao carregar usuários",
            detail: error?.message || "Erro interno"
        });
    }
});
// GET /api/users/:id - Get single user
router.get("/:id", async (req, res) => {
    try {
        await (0, db_1.connectDB)();
        const user = await User_1.default.findById(req.params.id).select("-password").lean();
        if (!user) {
            return res.status(404).json({ error: "Usuário não encontrado" });
        }
        res.json({ data: user });
    }
    catch (error) {
        console.error("GET /api/users/:id error", error);
        res.status(500).json({
            error: "Falha ao carregar usuário",
            detail: error?.message || "Erro interno"
        });
    }
});
// POST /api/users - Create new user
router.post("/", async (req, res) => {
    try {
        const parsed = createUserSchema.safeParse(req.body);
        if (!parsed.success) {
            return res
                .status(400)
                .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
        }
        await (0, db_1.connectDB)();
        // Check if email already exists
        const existingUser = await User_1.default.findOne({ email: parsed.data.email.toLowerCase() }).lean();
        if (existingUser) {
            return res.status(409).json({ error: "Email já cadastrado" });
        }
        const user = await User_1.default.create({
            email: parsed.data.email.toLowerCase(),
            password: parsed.data.password,
            name: parsed.data.name.trim(),
            role: parsed.data.role || "user",
            active: parsed.data.active !== undefined ? parsed.data.active : true
        });
        const { password: _, ...userWithoutPassword } = user.toObject();
        res.status(201).json({ data: userWithoutPassword });
    }
    catch (error) {
        console.error("POST /api/users error", error);
        res.status(500).json({
            error: "Falha ao criar usuário",
            detail: error?.message || "Erro interno"
        });
    }
});
// PUT /api/users/:id - Update user
router.put("/:id", async (req, res) => {
    try {
        const parsed = updateUserSchema.safeParse(req.body);
        if (!parsed.success) {
            return res
                .status(400)
                .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
        }
        await (0, db_1.connectDB)();
        // Check if email already exists (if changing email)
        if (parsed.data.email) {
            const existingUser = await User_1.default.findOne({
                email: parsed.data.email.toLowerCase(),
                _id: { $ne: req.params.id }
            }).lean();
            if (existingUser) {
                return res.status(409).json({ error: "Email já cadastrado" });
            }
        }
        const updateData = { ...parsed.data };
        if (updateData.email) {
            updateData.email = updateData.email.toLowerCase();
        }
        if (updateData.name) {
            updateData.name = updateData.name.trim();
        }
        // If password is provided, it will be hashed by the pre-save hook
        const updated = await User_1.default.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
            runValidators: true
        })
            .select("-password")
            .lean();
        if (!updated) {
            return res.status(404).json({ error: "Usuário não encontrado" });
        }
        res.json({ data: updated });
    }
    catch (error) {
        console.error("PUT /api/users/:id error", error);
        res.status(500).json({
            error: "Falha ao atualizar usuário",
            detail: error?.message || "Erro interno"
        });
    }
});
// DELETE /api/users/:id - Delete user
router.delete("/:id", async (req, res) => {
    try {
        await (0, db_1.connectDB)();
        // Prevent deleting yourself
        if (req.params.id === req.user?.id) {
            return res.status(400).json({ error: "Você não pode excluir seu próprio usuário" });
        }
        const user = await User_1.default.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ error: "Usuário não encontrado" });
        }
        res.json({ ok: true, message: "Usuário excluído com sucesso" });
    }
    catch (error) {
        console.error("DELETE /api/users/:id error", error);
        res.status(500).json({
            error: "Falha ao excluir usuário",
            detail: error?.message || "Erro interno"
        });
    }
});
exports.default = router;
