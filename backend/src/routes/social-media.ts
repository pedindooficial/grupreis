import { Router } from "express";
import { z } from "zod";
import { connectDB } from "../db";
import SocialMediaModel from "../models/SocialMedia";

const router = Router();

const socialMediaSchema = z.object({
  type: z.enum(["image", "video"]),
  url: z.string().min(1, "URL obrigatória"),
  title: z.string().min(1, "Título obrigatório"),
  description: z.string().optional(),
  order: z.number().int().default(0),
  active: z.boolean().default(true)
});

const updateSchema = z.object({
  type: z.enum(["image", "video"]).optional(),
  url: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  order: z.number().int().optional(),
  active: z.boolean().optional()
});

// Get all social media items
router.get("/", async (_req, res) => {
  try {
    await connectDB();
    const items = await SocialMediaModel.find()
      .sort({ order: 1, createdAt: -1 })
      .lean();
    res.json({ data: items });
  } catch (error: any) {
    console.error("GET /api/social-media error", error);
    res.status(500).json({
      error: "Falha ao carregar mídias sociais",
      detail: error?.message || "Erro interno"
    });
  }
});

// Get active social media items (for public API)
router.get("/public", async (_req, res) => {
  try {
    await connectDB();
    const items = await SocialMediaModel.find({ active: true })
      .select("type url title description")
      .sort({ order: 1, createdAt: -1 })
      .lean();
    res.json({ data: items });
  } catch (error: any) {
    console.error("GET /api/social-media/public error", error);
    res.status(500).json({
      error: "Falha ao carregar mídias sociais",
      detail: error?.message || "Erro interno"
    });
  }
});

// Get single social media item
router.get("/:id", async (req, res) => {
  try {
    await connectDB();
    const item = await SocialMediaModel.findById(req.params.id).lean();
    if (!item) {
      return res.status(404).json({ error: "Item não encontrado" });
    }
    res.json({ data: item });
  } catch (error: any) {
    console.error("GET /api/social-media/:id error", error);
    res.status(500).json({
      error: "Falha ao carregar item",
      detail: error?.message || "Erro interno"
    });
  }
});

// Create new social media item
router.post("/", async (req, res) => {
  try {
    const parsed = socialMediaSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
    }

    await connectDB();
    
    // If no order specified, set to max order + 1
    if (parsed.data.order === undefined || parsed.data.order === 0) {
      const maxOrder = await SocialMediaModel.findOne()
        .sort({ order: -1 })
        .select("order")
        .lean();
      parsed.data.order = maxOrder ? (maxOrder.order || 0) + 1 : 1;
    }

    const created = await SocialMediaModel.create(parsed.data);
    res.status(201).json({ data: created });
  } catch (error: any) {
    console.error("POST /api/social-media error", error);
    res.status(500).json({
      error: "Falha ao criar item",
      detail: error?.message || "Erro interno"
    });
  }
});

// Update social media item
router.put("/:id", async (req, res) => {
  try {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
    }

    await connectDB();
    const updated = await SocialMediaModel.findByIdAndUpdate(
      req.params.id,
      parsed.data,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Item não encontrado" });
    }

    res.json({ data: updated });
  } catch (error: any) {
    console.error("PUT /api/social-media/:id error", error);
    res.status(500).json({
      error: "Falha ao atualizar item",
      detail: error?.message || "Erro interno"
    });
  }
});

// Delete social media item
router.delete("/:id", async (req, res) => {
  try {
    await connectDB();
    const deleted = await SocialMediaModel.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Item não encontrado" });
    }
    res.json({ data: { _id: deleted._id } });
  } catch (error: any) {
    console.error("DELETE /api/social-media/:id error", error);
    res.status(500).json({
      error: "Falha ao deletar item",
      detail: error?.message || "Erro interno"
    });
  }
});

// Reorder items
router.post("/reorder", async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: "Items deve ser um array" });
    }

    await connectDB();
    const updates = items.map((item: { _id: string; order: number }) => ({
      updateOne: {
        filter: { _id: item._id },
        update: { order: item.order }
      }
    }));

    await SocialMediaModel.bulkWrite(updates);
    res.json({ data: { success: true } });
  } catch (error: any) {
    console.error("POST /api/social-media/reorder error", error);
    res.status(500).json({
      error: "Falha ao reordenar itens",
      detail: error?.message || "Erro interno"
    });
  }
});

export default router;

