"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.requireAdmin = requireAdmin;
const db_1 = require("../db");
const User_1 = __importDefault(require("../models/User"));
/**
 * Middleware to authenticate user from session/token
 * For now, we'll use a simple approach with email in headers
 * In production, use JWT tokens
 */
async function authenticate(req, res, next) {
    try {
        // For now, we'll check if user email is in headers (from frontend session)
        // In production, implement JWT token authentication
        const userEmail = req.headers["x-user-email"];
        const userId = req.headers["x-user-id"];
        if (!userEmail && !userId) {
            res.status(401).json({ error: "Não autenticado" });
            return;
        }
        await (0, db_1.connectDB)();
        const user = userId
            ? await User_1.default.findById(userId).lean()
            : await User_1.default.findOne({ email: userEmail.toLowerCase() }).lean();
        if (!user || !user.active) {
            res.status(401).json({ error: "Usuário não encontrado ou inativo" });
            return;
        }
        req.user = {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role
        };
        next();
    }
    catch (error) {
        console.error("Authentication error", error);
        res.status(500).json({ error: "Erro de autenticação", detail: error?.message });
    }
}
/**
 * Middleware to require admin role
 */
function requireAdmin(req, res, next) {
    if (!req.user) {
        res.status(401).json({ error: "Não autenticado" });
        return;
    }
    if (req.user.role !== "admin") {
        res.status(403).json({ error: "Acesso negado. Apenas administradores podem acessar este recurso." });
        return;
    }
    next();
}
