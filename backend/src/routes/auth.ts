import { Router } from "express";
import { z } from "zod";
import { connectDB } from "../db";
import UserModel from "../models/User";
import { logAudit } from "../services/audit";

const router = Router();

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha obrigatória")
});

router.post("/login", async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
    }

    await connectDB();

    const user = await UserModel.findOne({ email: parsed.data.email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: "Credenciais inválidas." });
    }

    if (!user.active) {
      return res.status(403).json({ error: "Usuário inativo. Entre em contato com o administrador." });
    }

    const isPasswordValid = await (user as any).comparePassword(parsed.data.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Credenciais inválidas." });
    }

        // Return user without password
        const { password: _, ...userWithoutPassword } = user.toObject();
        
        // Log login action
        await logAudit(req, {
          action: "login",
          resource: "other",
          userId: user._id.toString(),
          userEmail: user.email,
          userName: user.name,
          details: `Login realizado: ${user.email}`
        });

        res.json({
          user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role
          }
        });
  } catch (error: any) {
    console.error("POST /api/auth/login error", error);
    res.status(500).json({
      error: "Falha ao autenticar",
      detail: error?.message || "Erro interno"
    });
  }
});

export default router;


