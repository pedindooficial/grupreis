"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAudit = logAudit;
const db_1 = require("../db");
const Audit_1 = __importDefault(require("../models/Audit"));
/**
 * Log an audit event
 */
async function logAudit(req, data) {
    try {
        await (0, db_1.connectDB)();
        const ipAddress = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
        const userAgent = req.headers["user-agent"] || "unknown";
        await Audit_1.default.create({
            ...data,
            ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
            userAgent
        });
    }
    catch (error) {
        // Don't throw - audit logging should not break the main flow
        console.error("Failed to log audit:", error);
    }
}
