import { Router } from "express";
import { z } from "zod";
import { connectDB } from "../db";
import SettingsModel from "../models/Settings";

const router = Router();

const settingsSchema = z.object({
  companyName: z.string().optional(),
  headquartersAddress: z.string().optional(),
  headquartersStreet: z.string().optional(),
  headquartersNumber: z.string().optional(),
  headquartersNeighborhood: z.string().optional(),
  headquartersCity: z.string().optional(),
  headquartersState: z.string().optional(),
  headquartersZip: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("E-mail inválido").optional(),
  companySignature: z.string().optional()
});

router.get("/", async (_req, res) => {
  try {
    await connectDB();
    let settings = await SettingsModel.findOne().lean();

    if (!settings) {
      settings = await SettingsModel.create({});
    }

    res.json({ data: settings });
  } catch (error: any) {
    console.error("GET /settings error", error);
    res.status(500).json({
      error: "Falha ao carregar configurações",
      detail: error?.message || "Erro interno"
    });
  }
});

router.put("/", async (req, res) => {
  try {
    const parsed = settingsSchema.safeParse(req.body);

    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
    }

    await connectDB();

    const settings = await SettingsModel.findOneAndUpdate(
      {},
      parsed.data,
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ data: settings });
  } catch (error: any) {
    console.error("PUT /settings error", error);
    res.status(500).json({
      error: "Falha ao salvar configurações",
      detail: error?.message || "Erro interno"
    });
  }
});

export default router;


