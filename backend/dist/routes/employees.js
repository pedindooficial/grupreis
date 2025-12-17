"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const Employee_1 = __importDefault(require("../models/Employee"));
const Team_1 = __importDefault(require("../models/Team"));
const Machine_1 = __importDefault(require("../models/Machine"));
const router = (0, express_1.Router)();
const fileRefSchema = zod_1.z.object({
    name: zod_1.z.string(),
    mime: zod_1.z.string(),
    size: zod_1.z.number(),
    data: zod_1.z.string()
});
const employeeSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, "Nome obrigatório"),
    role: zod_1.z.string().optional(),
    email: zod_1.z.string().email("E-mail inválido").optional(),
    phone: zod_1.z.string().optional(),
    document: zod_1.z.string().optional(),
    docRg: zod_1.z.string().optional(),
    docCnh: zod_1.z.string().optional(),
    docAddressProof: zod_1.z.string().optional(),
    docCv: zod_1.z.string().optional(),
    docRgFile: fileRefSchema.optional(),
    docCnhFile: fileRefSchema.optional(),
    docAddressProofFile: fileRefSchema.optional(),
    docCvFile: fileRefSchema.optional(),
    status: zod_1.z.enum(["ativo", "inativo"]).optional(),
    hireDate: zod_1.z.string().optional(),
    salary: zod_1.z.number().min(0).optional(),
    teamId: zod_1.z.string().optional(),
    teamName: zod_1.z.string().optional(),
    machineId: zod_1.z.string().optional(),
    machineName: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional()
});
router.get("/", async (_req, res) => {
    try {
        await (0, db_1.connectDB)();
        // Usar agregação para projetar apenas os campos necessários na listagem,
        // evitando trafegar os arquivos em base64 (doc*File.data), que são grandes
        // e deixariam a resposta muito lenta mesmo com poucos registros.
        const employees = await Employee_1.default.aggregate([
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
    }
    catch (error) {
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
        await (0, db_1.connectDB)();
        let teamName = parsed.data.teamName;
        if (parsed.data.teamId) {
            const team = await Team_1.default.findById(parsed.data.teamId).lean();
            if (team) {
                teamName = team.name || teamName;
            }
        }
        let machineName = parsed.data.machineName;
        if (parsed.data.machineId) {
            const machine = await Machine_1.default.findById(parsed.data.machineId).lean();
            if (machine) {
                machineName = machine.name || machineName;
            }
        }
        const created = await Employee_1.default.create({
            ...parsed.data,
            teamId: parsed.data.teamId || undefined,
            teamName,
            machineId: parsed.data.machineId || undefined,
            machineName,
            status: parsed.data.status || "ativo"
        });
        res.status(201).json({ data: created });
    }
    catch (error) {
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
        await (0, db_1.connectDB)();
        let teamName = parsed.data.teamName;
        if (parsed.data.teamId) {
            const team = await Team_1.default.findById(parsed.data.teamId).lean();
            if (team) {
                teamName = team.name || teamName;
            }
        }
        let machineName = parsed.data.machineName;
        if (parsed.data.machineId) {
            const machine = await Machine_1.default.findById(parsed.data.machineId).lean();
            if (machine) {
                machineName = machine.name || machineName;
            }
        }
        const updated = await Employee_1.default.findByIdAndUpdate(req.params.id, {
            ...parsed.data,
            teamId: parsed.data.teamId || undefined,
            teamName,
            machineId: parsed.data.machineId || undefined,
            machineName
        }, { new: true, runValidators: true });
        if (!updated) {
            return res.status(404).json({ error: "Funcionário não encontrado" });
        }
        res.json({ data: updated });
    }
    catch (error) {
        console.error("PUT /api/employees/:id error", error);
        res.status(500).json({
            error: "Falha ao atualizar funcionário",
            detail: error?.message || "Erro interno"
        });
    }
});
router.delete("/:id", async (req, res) => {
    try {
        await (0, db_1.connectDB)();
        const deleted = await Employee_1.default.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: "Funcionário não encontrado" });
        }
        res.json({ ok: true });
    }
    catch (error) {
        console.error("DELETE /api/employees/:id error", error);
        res.status(500).json({
            error: "Falha ao excluir funcionário",
            detail: error?.message || "Erro interno"
        });
    }
});
exports.default = router;
