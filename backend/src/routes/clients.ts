import { Router } from "express";
import { z } from "zod";
import { connectDB } from "../db";
import ClientModel from "../models/Client";

const router = Router();

const clientSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  personType: z.enum(["cpf", "cnpj"]).optional(),
  docNumber: z.string().optional(),
  contact: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("E-mail inválido").optional(),
  address: z.string().optional(),
  addressStreet: z.string().optional(),
  addressNumber: z.string().optional(),
  addressNeighborhood: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().optional(),
  addressZip: z.string().optional()
});

router.get("/", async (_req, res) => {
  try {
    await connectDB();
    const clients = await ClientModel.find().sort({ createdAt: -1 }).lean();
    res.json({ data: clients });
  } catch (error: any) {
    console.error("GET /clients error", error);
    res
      .status(500)
      .json({ error: "Falha ao carregar clientes", detail: error?.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const parsed = clientSchema.safeParse(req.body);

    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
    }

    await connectDB();
    const docNumber = parsed.data.docNumber?.trim();
    const personType = parsed.data.personType || "cpf";

    if (docNumber) {
      const exists = await ClientModel.findOne({ docNumber, personType }).lean();
      if (exists) {
        return res
          .status(409)
          .json({ error: "Cliente já cadastrado com este documento." });
      }
    }

    const created = await ClientModel.create({
      ...parsed.data,
      personType,
      docNumber
    });

    res.status(201).json({ data: created });
  } catch (error: any) {
    console.error("POST /clients error", error);
    res
      .status(500)
      .json({ error: "Falha ao salvar cliente", detail: error?.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const parsed = clientSchema.safeParse(req.body);

    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
    }

    await connectDB();

    const docNumber = parsed.data.docNumber?.trim();
    const personType = parsed.data.personType || "cpf";

    // Verificar se outro cliente já tem este documento (exceto o atual)
    if (docNumber) {
      const exists = await ClientModel.findOne({
        docNumber,
        personType,
        _id: { $ne: req.params.id }
      }).lean();
      if (exists) {
        return res
          .status(409)
          .json({ error: "Cliente já cadastrado com este documento." });
      }
    }

    const updated = await ClientModel.findByIdAndUpdate(
      req.params.id,
      {
        ...parsed.data,
        personType,
        docNumber
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Cliente não encontrado" });
    }

    res.json({ data: updated });
  } catch (error: any) {
    console.error("PUT /clients/:id error", error);
    res.status(500).json({
      error: "Falha ao atualizar cliente",
      detail: error?.message || "Erro interno"
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await connectDB();

    const deleted = await ClientModel.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Cliente não encontrado" });
    }

    res.json({ ok: true });
  } catch (error: any) {
    console.error("DELETE /clients/:id error", error);
    res.status(500).json({
      error: "Falha ao excluir cliente",
      detail: error?.message || "Erro interno"
    });
  }
});

export default router;


