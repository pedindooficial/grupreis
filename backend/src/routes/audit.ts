import { Router } from "express";
import { connectDB } from "../db";
import AuditModel from "../models/Audit";
import { authenticate, requireAdmin } from "../middleware/auth";

const router = Router();

// All audit routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// GET /api/audit - List audit logs
router.get("/", async (req, res) => {
  try {
    await connectDB();
    const { resource, action, userId, startDate, endDate, limit = "100" } = req.query;

    const filter: any = {};
    if (resource) filter.resource = resource;
    if (action) filter.action = action;
    if (userId) filter.userId = userId;

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate as string);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate as string);
      }
    }

    const limitNum = parseInt(limit as string, 10);
    const audits = await AuditModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(limitNum > 0 && limitNum <= 1000 ? limitNum : 100)
      .lean();

    res.json({ data: audits });
  } catch (error: any) {
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
    await connectDB();

    const stats = await AuditModel.aggregate([
      {
        $group: {
          _id: "$action",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const resourceStats = await AuditModel.aggregate([
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
  } catch (error: any) {
    console.error("GET /api/audit/stats error", error);
    res.status(500).json({
      error: "Falha ao carregar estatísticas",
      detail: error?.message || "Erro interno"
    });
  }
});

export default router;
