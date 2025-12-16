import { Router } from "express";
import { z } from "zod";
import { connectDB } from "../db";
import EmployeeModel from "../models/Employee";
import TeamModel from "../models/Team";
import MachineModel from "../models/Machine";

const router = Router();

const fileRefSchema = z.object({
  name: z.string(),
  mime: z.string(),
  size: z.number(),
  data: z.string()
});

const employeeSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  role: z.string().optional(),
  email: z.string().email("E-mail inválido").optional(),
  phone: z.string().optional(),
  document: z.string().optional(),
  docRg: z.string().optional(),
  docCnh: z.string().optional(),
  docAddressProof: z.string().optional(),
  docCv: z.string().optional(),
  docRgFile: fileRefSchema.optional(),
  docCnhFile: fileRefSchema.optional(),
  docAddressProofFile: fileRefSchema.optional(),
  docCvFile: fileRefSchema.optional(),
  status: z.enum(["ativo", "inativo"]).optional(),
  hireDate: z.string().optional(),
  salary: z.number().min(0).optional(),
  teamId: z.string().optional(),
  teamName: z.string().optional(),
  machineId: z.string().optional(),
  machineName: z.string().optional(),
  notes: z.string().optional()
});

router.get("/", async (_req, res) => {
  try {
    await connectDB();

    // Usar agregação para projetar apenas os campos necessários na listagem,
    // evitando trafegar os arquivos em base64 (doc*File.data), que são grandes
    // e deixariam a resposta muito lenta mesmo com poucos registros.
    const employees = await EmployeeModel.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $project: {
          name: 1,
          role: 1,
          email: 1,
          phone: 1,
          document: 1,
          status: 1,
          hireDate: 1,
          salary: 1,
          teamId: 1,
          teamName: 1,
          machineId: 1,
          machineName: 1,
          notes: 1,
          createdAt: 1,
          updatedAt: 1,
          // Metadados dos arquivos, mas sem o conteúdo base64 pesado
          "docRgFile.name": 1,
          "docRgFile.mime": 1,
          "docRgFile.size": 1,
          "docCnhFile.name": 1,
          "docCnhFile.mime": 1,
          "docCnhFile.size": 1,
          "docAddressProofFile.name": 1,
          "docAddressProofFile.mime": 1,
          "docAddressProofFile.size": 1,
          "docCvFile.name": 1,
          "docCvFile.mime": 1,
          "docCvFile.size": 1
        }
      }
    ]);

    res.json({ data: employees });
  } catch (error: any) {
    console.error("GET /api/employees error", error);
    res.status(500).json({
      error: "Falha ao carregar funcionários",
      detail: error?.message || "Erro interno"
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const parsed = employeeSchema.safeParse(req.body);

    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
    }

    await connectDB();

    let teamName = parsed.data.teamName;
    if (parsed.data.teamId) {
      const team = await TeamModel.findById(parsed.data.teamId).lean();
      if (team) {
        teamName = team.name || teamName;
      }
    }

    let machineName = parsed.data.machineName;
    if (parsed.data.machineId) {
      const machine = await MachineModel.findById(parsed.data.machineId).lean();
      if (machine) {
        machineName = machine.name || machineName;
      }
    }

    const created = await EmployeeModel.create({
      ...parsed.data,
      teamId: parsed.data.teamId || undefined,
      teamName,
      machineId: parsed.data.machineId || undefined,
      machineName,
      status: parsed.data.status || "ativo"
    });

    res.status(201).json({ data: created });
  } catch (error: any) {
    console.error("POST /api/employees error", error);
    res.status(500).json({
      error: "Falha ao salvar funcionário",
      detail: error?.message || "Erro interno"
    });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const parsed = employeeSchema.safeParse(req.body);

    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
    }

    await connectDB();

    let teamName = parsed.data.teamName;
    if (parsed.data.teamId) {
      const team = await TeamModel.findById(parsed.data.teamId).lean();
      if (team) {
        teamName = team.name || teamName;
      }
    }

    let machineName = parsed.data.machineName;
    if (parsed.data.machineId) {
      const machine = await MachineModel.findById(parsed.data.machineId).lean();
      if (machine) {
        machineName = machine.name || machineName;
      }
    }

    const updated = await EmployeeModel.findByIdAndUpdate(
      req.params.id,
      {
        ...parsed.data,
        teamId: parsed.data.teamId || undefined,
        teamName,
        machineId: parsed.data.machineId || undefined,
        machineName
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Funcionário não encontrado" });
    }

    res.json({ data: updated });
  } catch (error: any) {
    console.error("PUT /api/employees/:id error", error);
    res.status(500).json({
      error: "Falha ao atualizar funcionário",
      detail: error?.message || "Erro interno"
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await connectDB();

    const deleted = await EmployeeModel.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Funcionário não encontrado" });
    }

    res.json({ ok: true });
  } catch (error: any) {
    console.error("DELETE /api/employees/:id error", error);
    res.status(500).json({
      error: "Falha ao excluir funcionário",
      detail: error?.message || "Erro interno"
    });
  }
});

export default router;

