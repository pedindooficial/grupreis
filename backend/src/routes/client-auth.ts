import { Router } from "express";
import { z } from "zod";
import { connectDB } from "../db";
import ClientModel from "../models/Client";
import { generateClientToken } from "../middleware/client-auth";
import { sendPasswordResetEmail } from "../services/email";
import crypto from "crypto";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  phone: z.string().optional(),
  docNumber: z.string().optional(),
  personType: z.enum(["cpf", "cnpj"]).optional()
});

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha obrigatória")
});

const passwordResetRequestSchema = z.object({
  email: z.string().email("Email inválido")
});

const passwordResetConfirmSchema = z.object({
  token: z.string().min(1, "Token é obrigatório"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres")
});

// Register new client
router.post("/register", async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
    }

    await connectDB();

    // Check if client with this email already exists
    const existingClient = await ClientModel.findOne({ 
      email: parsed.data.email.toLowerCase() 
    });

    if (existingClient) {
      return res.status(400).json({ 
        error: "Já existe um cliente cadastrado com este email" 
      });
    }

    // Create new client
    const client = await ClientModel.create({
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      phone: parsed.data.phone,
      docNumber: parsed.data.docNumber,
      personType: parsed.data.personType || "cpf"
    });

    // Generate token
    const token = generateClientToken(client._id.toString(), client.email || "");

    res.status(201).json({
      data: {
        client: {
          id: client._id.toString(),
          name: client.name,
          email: client.email,
          phone: client.phone || null
        },
        token
      }
    });
  } catch (error: any) {
    console.error("POST /api/client-auth/register error", error);
    res.status(500).json({
      error: "Falha ao registrar cliente",
      detail: error?.message || "Erro interno"
    });
  }
});

// Login client
router.post("/login", async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
    }

    await connectDB();

    const client = await ClientModel.findOne({ 
      email: parsed.data.email.toLowerCase() 
    }).select("+password"); // Include password field

    if (!client) {
      return res.status(401).json({ error: "Credenciais inválidas." });
    }

    if (!client.password) {
      return res.status(401).json({ 
        error: "Conta não possui senha cadastrada. Use a opção de redefinição de senha." 
      });
    }

    const isPasswordValid = await (client as any).comparePassword(parsed.data.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Credenciais inválidas." });
    }

    // Generate token
    const token = generateClientToken(client._id.toString(), client.email || "");

    res.json({
      data: {
        client: {
          id: client._id.toString(),
          name: client.name,
          email: client.email,
          phone: client.phone || null
        },
        token
      }
    });
  } catch (error: any) {
    console.error("POST /api/client-auth/login error", error);
    res.status(500).json({
      error: "Falha ao autenticar",
      detail: error?.message || "Erro interno"
    });
  }
});

// Request password reset
router.post("/password-reset", async (req, res) => {
  try {
    console.log("[Password Reset Request] Received request:", { email: req.body?.email });
    
    const parsed = passwordResetRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      console.log("[Password Reset Request] Validation failed:", parsed.error.flatten());
      return res
        .status(400)
        .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
    }

    console.log("[Password Reset Request] Email validated:", parsed.data.email);
    await connectDB();
    console.log("[Password Reset Request] Database connected");

    const emailLower = parsed.data.email.toLowerCase();
    console.log("[Password Reset Request] Looking for client with email:", emailLower);
    
    const client = await ClientModel.findOne({ 
      email: emailLower 
    });

    // Don't reveal if email exists or not (security best practice)
    if (!client) {
      console.log("[Password Reset Request] Client not found for email:", emailLower);
      // Still return success to prevent email enumeration
      return res.json({ 
        data: { message: "Se o email existir, você receberá um link para redefinir sua senha." } 
      });
    }

    console.log("[Password Reset Request] Client found:", { 
      id: client._id.toString(), 
      name: client.name, 
      email: client.email 
    });

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 1); // Token expires in 1 hour
    
    console.log("[Password Reset Request] Generated token:", resetToken.substring(0, 10) + "...");
    console.log("[Password Reset Request] Token expires at:", resetExpires.toISOString());

    const updateResult = await ClientModel.findByIdAndUpdate(client._id, {
      passwordResetToken: resetToken,
      passwordResetExpires: resetExpires
    }, { new: true });

    console.log("[Password Reset Request] Database updated:", { 
      clientId: client._id.toString(),
      updateSuccess: !!updateResult 
    });

    // Send email
    try {
      console.log("[Password Reset Request] Attempting to send email to:", client.email);
      // Get the origin from the request to use the correct frontend URL
      // Prefer origin header, fallback to extracting from referer
      let requestOrigin: string | undefined;
      if (req.headers.origin) {
        requestOrigin = req.headers.origin;
      } else if (req.headers.referer) {
        try {
          const refererUrl = new URL(req.headers.referer);
          requestOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
        } catch (e) {
          // Invalid referer URL, ignore
        }
      }
      console.log("[Password Reset Request] Request origin:", requestOrigin);
      await sendPasswordResetEmail(
        client.email || "",
        resetToken,
        client.name,
        requestOrigin
      );
      console.log("[Password Reset Request] Email sent successfully");
    } catch (emailError: any) {
      console.error("[Password Reset Request] Error sending password reset email:", emailError);
      console.error("[Password Reset Request] Email error details:", {
        message: emailError?.message,
        stack: emailError?.stack
      });
      // Don't fail the request, just log the error
    }

    console.log("[Password Reset Request] Request completed successfully");
    res.json({ 
      data: { message: "Se o email existir, você receberá um link para redefinir sua senha." } 
    });
  } catch (error: any) {
    console.error("[Password Reset Request] POST /api/client-auth/password-reset error", error);
    console.error("[Password Reset Request] Error details:", {
      message: error?.message,
      stack: error?.stack
    });
    res.status(500).json({
      error: "Falha ao processar solicitação",
      detail: error?.message || "Erro interno"
    });
  }
});

// Confirm password reset
router.post("/password-reset/confirm", async (req, res) => {
  try {
    console.log("[Password Reset Confirm] Received request:", { 
      token: req.body?.token ? req.body.token.substring(0, 10) + "..." : "missing",
      hasPassword: !!req.body?.password 
    });
    
    const parsed = passwordResetConfirmSchema.safeParse(req.body);
    if (!parsed.success) {
      console.log("[Password Reset Confirm] Validation failed:", parsed.error.flatten());
      return res
        .status(400)
        .json({ error: "Dados inválidos", issues: parsed.error.flatten() });
    }

    console.log("[Password Reset Confirm] Validation passed");
    await connectDB();
    console.log("[Password Reset Confirm] Database connected");

    const now = new Date();
    console.log("[Password Reset Confirm] Current time:", now.toISOString());
    console.log("[Password Reset Confirm] Looking for client with token:", parsed.data.token.substring(0, 10) + "...");

    const client = await ClientModel.findOne({
      passwordResetToken: parsed.data.token,
      passwordResetExpires: { $gt: now } // Token not expired
    }).select("+passwordResetToken +passwordResetExpires");

    if (!client) {
      console.log("[Password Reset Confirm] Client not found or token expired");
      
      // Check if token exists but expired
      const expiredClient = await ClientModel.findOne({
        passwordResetToken: parsed.data.token
      }).select("+passwordResetToken +passwordResetExpires");
      
      if (expiredClient) {
        console.log("[Password Reset Confirm] Token found but expired:", {
          expiresAt: expiredClient.passwordResetExpires?.toISOString(),
          now: now.toISOString()
        });
      } else {
        console.log("[Password Reset Confirm] Token not found in database");
      }
      
      return res.status(400).json({ 
        error: "Token inválido ou expirado" 
      });
    }

    console.log("[Password Reset Confirm] Client found:", {
      id: client._id.toString(),
      name: client.name,
      email: client.email,
      tokenExpires: client.passwordResetExpires?.toISOString()
    });

    // Update password and clear reset token
    console.log("[Password Reset Confirm] Updating password and clearing reset token");
    client.password = parsed.data.password;
    client.passwordResetToken = undefined;
    client.passwordResetExpires = undefined;
    await client.save();
    console.log("[Password Reset Confirm] Password updated successfully");

    // Generate new token for immediate login
    const token = generateClientToken(client._id.toString(), client.email || "");
    console.log("[Password Reset Confirm] Generated new JWT token for client");

    console.log("[Password Reset Confirm] Request completed successfully");
    res.json({
      data: {
        message: "Senha redefinida com sucesso",
        client: {
          id: client._id.toString(),
          name: client.name,
          email: client.email,
          phone: client.phone || null
        },
        token
      }
    });
  } catch (error: any) {
    console.error("[Password Reset Confirm] POST /api/client-auth/password-reset/confirm error", error);
    console.error("[Password Reset Confirm] Error details:", {
      message: error?.message,
      stack: error?.stack
    });
    res.status(500).json({
      error: "Falha ao redefinir senha",
      detail: error?.message || "Erro interno"
    });
  }
});

export default router;

