import { Router } from "express";
import { z } from "zod";
import { connectDB } from "../db";
import CatalogModel from "../models/Catalog";
import { authenticate, requireAdmin, AuthRequest } from "../middleware/auth";
import { logAudit } from "../services/audit";

const router = Router();

// Public route: GET service names (no auth required)
router.get("/public/services", async (req, res) => {
  try {
    await connectDB();
    
    // Get only active catalog items with their names
    const catalogItems = await CatalogModel.find({ active: true })
      .select("name category active")
      .sort({ name: 1 })
      .lean();
    
    // Extract unique service names
    const serviceNames = catalogItems.map((item) => ({
      name: item.name,
      category: item.category || undefined,
      id: item._id?.toString()
    }));
    
    res.json({
      data: serviceNames,
      count: serviceNames.length
    });
  } catch (error: any) {
    console.error("GET /api/catalog/public/services error", error);
    res.status(500).json({
      error: "Falha ao carregar serviços",
      detail: error?.message || "Erro interno"
    });
  }
});

// All other catalog routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

const priceVariationSchema = z.object({
  diameter: z.number().min(0, "Diâmetro deve ser positivo"),
  soilType: z.enum(["argiloso", "arenoso", "rochoso", "misturado", "outro"]),
  access: z.enum(["livre", "limitado", "restrito"]),
  price: z.number().min(0, "Preço deve ser positivo"),
  executionTime: z.number().min(0, "Tempo de execução deve ser positivo").optional()
});

const catalogSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  description: z.string().optional(),
  category: z.string().optional(),
  photos: z.array(z.string()).optional(),
  priceVariations: z
    .array(priceVariationSchema)
    .min(1, "Pelo menos uma variação de preço é obrigatória"),
  active: z.boolean().optional()
});

const updateCatalogSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  photos: z.array(z.string()).optional(),
  priceVariations: z.array(priceVariationSchema).min(1).optional(),
  active: z.boolean().optional()
});

// GET /api/catalog - List all catalog items
router.get("/", async (req, res) => {
  try {
    await connectDB();
    const { search, category, active } = req.query;

    const filter: any = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } }
      ];
    }
    if (category && category !== "all") {
      filter.category = category;
    }
    if (active !== undefined) {
      filter.active = active === "true";
    }

    const items = await CatalogModel.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ data: items });
  } catch (error: any) {
    console.error("GET /api/catalog error", error);
    res.status(500).json({
      error: "Falha ao carregar catálogo",
      detail: error?.message || "Erro interno"
    });
  }
});

// GET /api/catalog/:id - Get single catalog item
router.get("/:id", async (req, res) => {
  try {
    await connectDB();
    const item = await CatalogModel.findById(req.params.id).lean();
    if (!item) {
      return res.status(404).json({ error: "Item do catálogo não encontrado" });
    }
    res.json({ data: item });
  } catch (error: any) {
    console.error("GET /api/catalog/:id error", error);
    res.status(500).json({
      error: "Falha ao carregar item do catálogo",
      detail: error?.message || "Erro interno"
    });
  }
});

// POST /api/catalog - Create new catalog item
router.post("/", async (req: AuthRequest, res) => {
  try {
    const parsed = catalogSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
    }

    await connectDB();

    const item = await CatalogModel.create({
      ...parsed.data,
      active: parsed.data.active !== undefined ? parsed.data.active : true
    });

    // Log create action
    if (req.user) {
      await logAudit(req, {
        action: "create",
        resource: "other",
        resourceId: item._id.toString(),
        resourceName: item.name,
        userId: req.user.id,
        userEmail: req.user.email,
        userName: req.user.name,
        details: `Item de catálogo criado: ${item.name}`
      });
    }

    res.status(201).json({ data: item });
  } catch (error: any) {
    console.error("POST /api/catalog error", error);
    res.status(500).json({
      error: "Falha ao criar item do catálogo",
      detail: error?.message || "Erro interno"
    });
  }
});

// PUT /api/catalog/:id - Update catalog item
router.put("/:id", async (req: AuthRequest, res) => {
  try {
    const parsed = updateCatalogSchema.safeParse(req.body);
    if (!parsed.success) {
      console.error("Validation error:", parsed.error.errors);
      return res
        .status(400)
        .json({ 
          error: "Dados inválidos", 
          issues: parsed.error.flatten(),
          details: parsed.error.errors
        });
    }

    await connectDB();

    const originalItem = await CatalogModel.findById(req.params.id).lean();
    if (!originalItem) {
      return res.status(404).json({ error: "Item do catálogo não encontrado" });
    }

    const updated = await CatalogModel.findByIdAndUpdate(
      req.params.id,
      parsed.data,
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({ error: "Item do catálogo não encontrado" });
    }

    // Log update action
    if (req.user) {
      await logAudit(req, {
        action: "update",
        resource: "other",
        resourceId: updated._id.toString(),
        resourceName: updated.name,
        userId: req.user.id,
        userEmail: req.user.email,
        userName: req.user.name,
        details: `Item de catálogo atualizado: ${updated.name}`
      });
    }

    res.json({ data: updated });
  } catch (error: any) {
    console.error("PUT /api/catalog/:id error", error);
    res.status(500).json({
      error: "Falha ao atualizar item do catálogo",
      detail: error?.message || "Erro interno"
    });
  }
});

// DELETE /api/catalog/:id - Delete catalog item
router.delete("/:id", async (req: AuthRequest, res) => {
  try {
    await connectDB();

    const item = await CatalogModel.findById(req.params.id).lean();
    if (!item) {
      return res.status(404).json({ error: "Item do catálogo não encontrado" });
    }

    await CatalogModel.findByIdAndDelete(req.params.id);

    // Log delete action
    if (req.user) {
      await logAudit(req, {
        action: "delete",
        resource: "other",
        resourceId: item._id?.toString(),
        resourceName: item.name,
        userId: req.user.id,
        userEmail: req.user.email,
        userName: req.user.name,
        details: `Item de catálogo excluído: ${item.name}`
      });
    }

    res.json({ ok: true, message: "Item do catálogo excluído com sucesso" });
  } catch (error: any) {
    console.error("DELETE /api/catalog/:id error", error);
    res.status(500).json({
      error: "Falha ao excluir item do catálogo",
      detail: error?.message || "Erro interno"
    });
  }
});

export default router;

