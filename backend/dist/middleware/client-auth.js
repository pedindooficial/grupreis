"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateClient = authenticateClient;
exports.generateClientToken = generateClientToken;
const db_1 = require("../db");
const Client_1 = __importDefault(require("../models/Client"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "change-this-secret-in-production";
/**
 * Middleware to authenticate client from JWT token
 */
async function authenticateClient(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({ error: "Token de autenticação não fornecido" });
            return;
        }
        const token = authHeader.substring(7); // Remove "Bearer " prefix
        try {
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            await (0, db_1.connectDB)();
            const client = await Client_1.default.findById(decoded.clientId)
                .select("name email")
                .lean();
            if (!client) {
                res.status(401).json({ error: "Cliente não encontrado" });
                return;
            }
            req.client = {
                id: client._id.toString(),
                email: client.email || "",
                name: client.name
            };
            next();
        }
        catch (jwtError) {
            if (jwtError.name === "TokenExpiredError") {
                res.status(401).json({ error: "Token expirado" });
            }
            else if (jwtError.name === "JsonWebTokenError") {
                res.status(401).json({ error: "Token inválido" });
            }
            else {
                throw jwtError;
            }
        }
    }
    catch (error) {
        console.error("Client authentication error", error);
        res.status(500).json({ error: "Erro de autenticação", detail: error?.message });
    }
}
/**
 * Generate JWT token for client
 */
function generateClientToken(clientId, email) {
    return jsonwebtoken_1.default.sign({ clientId, email }, JWT_SECRET, { expiresIn: "30d" } // Token expires in 30 days
    );
}
