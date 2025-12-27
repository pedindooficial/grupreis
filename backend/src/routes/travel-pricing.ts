import { Router } from "express";
import { z } from "zod";
import { connectDB } from "../db";
import TravelPricingModel from "../models/TravelPricing";

const router = Router();

const travelPricingSchema = z.object({
  upToKm: z.number().min(0).optional().nullable().or(z.literal(null)),
  pricePerKm: z.number().min(0).optional().nullable(),
  fixedPrice: z.number().min(0).optional().nullable(),
  type: z.enum(["per_km", "fixed"]),
  description: z.string().min(1, "Descrição é obrigatória"),
  roundTrip: z.boolean().default(true),
  order: z.number().default(0),
  isDefault: z.boolean().default(false)
});

// GET all travel pricing rules
router.get("/", async (req, res) => {
  try {
    await connectDB();
    const pricings = await TravelPricingModel.find().sort({ order: 1 }).lean();
    res.json({ data: pricings });
  } catch (error: any) {
    console.error("GET /api/travel-pricing error", error);
    res.status(500).json({ error: "Falha ao buscar preços de deslocamento", detail: error.message });
  }
});

// GET single travel pricing
router.get("/:id", async (req, res) => {
  try {
    await connectDB();
    const pricing = await TravelPricingModel.findById(req.params.id).lean();
    if (!pricing) {
      return res.status(404).json({ error: "Preço não encontrado" });
    }
    res.json({ data: pricing });
  } catch (error: any) {
    console.error("GET /api/travel-pricing/:id error", error);
    res.status(500).json({ error: "Falha ao buscar preço", detail: error.message });
  }
});

// POST create new travel pricing
router.post("/", async (req, res) => {
  try {
    const parsed = travelPricingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Dados inválidos", issues: parsed.error.flatten() });
    }

    // Validation: if type is per_km, pricePerKm must be set
    if (parsed.data.type === "per_km" && !parsed.data.pricePerKm) {
      return res.status(400).json({ error: "Preço por km é obrigatório para tipo 'por km'" });
    }

    // Validation: if type is fixed, fixedPrice must be set
    if (parsed.data.type === "fixed" && !parsed.data.fixedPrice) {
      return res.status(400).json({ error: "Preço fixo é obrigatório para tipo 'fixo'" });
    }

    await connectDB();
    
    // If setting as default, unset other defaults
    if (parsed.data.isDefault) {
      await TravelPricingModel.updateMany({ isDefault: true }, { $set: { isDefault: false } });
    }
    
    const newPricing = await TravelPricingModel.create(parsed.data);
    res.status(201).json({ data: newPricing });
  } catch (error: any) {
    console.error("POST /api/travel-pricing error", error);
    res.status(500).json({ error: "Falha ao criar preço", detail: error.message });
  }
});

// PUT update travel pricing
router.put("/:id", async (req, res) => {
  try {
    const parsed = travelPricingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Dados inválidos", issues: parsed.error.flatten() });
    }

    // Validation: if type is per_km, pricePerKm must be set
    if (parsed.data.type === "per_km" && !parsed.data.pricePerKm) {
      return res.status(400).json({ error: "Preço por km é obrigatório para tipo 'por km'" });
    }

    // Validation: if type is fixed, fixedPrice must be set
    if (parsed.data.type === "fixed" && !parsed.data.fixedPrice) {
      return res.status(400).json({ error: "Preço fixo é obrigatório para tipo 'fixo'" });
    }

    await connectDB();
    
    // If setting as default, unset other defaults (except the current one)
    if (parsed.data.isDefault) {
      await TravelPricingModel.updateMany(
        { _id: { $ne: req.params.id }, isDefault: true },
        { $set: { isDefault: false } }
      );
    }
    
    const updatedPricing = await TravelPricingModel.findByIdAndUpdate(
      req.params.id,
      parsed.data,
      { new: true, runValidators: true }
    ).lean();

    if (!updatedPricing) {
      return res.status(404).json({ error: "Preço não encontrado" });
    }

    res.json({ data: updatedPricing });
  } catch (error: any) {
    console.error("PUT /api/travel-pricing/:id error", error);
    res.status(500).json({ error: "Falha ao atualizar preço", detail: error.message });
  }
});

// DELETE travel pricing
router.delete("/:id", async (req, res) => {
  try {
    await connectDB();
    const deleted = await TravelPricingModel.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Preço não encontrado" });
    }
    res.status(204).send();
  } catch (error: any) {
    console.error("DELETE /api/travel-pricing/:id error", error);
    res.status(500).json({ error: "Falha ao excluir preço", detail: error.message });
  }
});

export default router;

