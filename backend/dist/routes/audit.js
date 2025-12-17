"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const Audit_1 = __importDefault(require("../models/Audit"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All audit routes require authentication and admin role
router.use(auth_1.authenticate);
router.use(auth_1.requireAdmin);
// GET /api/audit - List audit logs
router.get("/", async (req, res) => {
    try {
        await (0, db_1.connectDB)();
        const { resource, action, userId, startDate, endDate, limit = "100" } = req.query;
        const filter = {};
        if (resource)
            filter.resource = resource;
        if (action)
            filter.action = action;
        if (userId)
            filter.userId = userId;
        // Date range filter
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) {
                filter.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                filter.createdAt.$lte = new Date(endDate);
            }
        }
        const limitNum = parseInt(limit, 10);
        const audits = await Audit_1.default.find(filter)
            .sort({ createdAt: -1 })
            .limit(limitNum > 0 && limitNum <= 1000 ? limitNum : 100)
            .lean();
        res.json({ data: audits });
    }
    catch (error) {
        console.error("GET /api/audit error", error);
        res.status(500).json({
            error: "Falha ao carregar logs de auditoria",
            detail: error?.message || "Erro interno"
        });
    }
});
// GET /api/audit/stats - Get audit statistics
router.get("/stats", async (req, res) => {
    try {
        await (0, db_1.connectDB)();
        const stats = await Audit_1.default.aggregate([
            {
                $group: {
                    _id: "$action",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);
        const resourceStats = await Audit_1.default.aggregate([
            {
                $group: {
                    _id: "$resource",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);
        res.json({
            data: {
                byAction: stats,
                byResource: resourceStats
            }
        });
    }
    catch (error) {
        console.error("GET /api/audit/stats error", error);
        res.status(500).json({
            error: "Falha ao carregar estatísticas",
            detail: error?.message || "Erro interno"
        });
    }
});
exports.default = router;
