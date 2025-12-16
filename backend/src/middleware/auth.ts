import { Request, Response, NextFunction } from "express";
import { connectDB } from "../db";
import UserModel from "../models/User";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: "admin" | "user";
      };
    }
  }
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: "admin" | "user";
  };
}

/**
 * Middleware to authenticate user from session/token
 * For now, we'll use a simple approach with email in headers
 * In production, use JWT tokens
 */
export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // For now, we'll check if user email is in headers (from frontend session)
    // In production, implement JWT token authentication
    const userEmail = req.headers["x-user-email"] as string;
    const userId = req.headers["x-user-id"] as string;

    if (!userEmail && !userId) {
      res.status(401).json({ error: "Não autenticado" });
      return;
    }

    await connectDB();

    const user = userId
      ? await UserModel.findById(userId).lean()
      : await UserModel.findOne({ email: userEmail.toLowerCase() }).lean();

    if (!user || !user.active) {
      res.status(401).json({ error: "Usuário não encontrado ou inativo" });
      return;
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role
    };

    next();
  } catch (error: any) {
    console.error("Authentication error", error);
    res.status(500).json({ error: "Erro de autenticação", detail: error?.message });
  }
}

/**
 * Middleware to require admin role
 */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  if (req.user.role !== "admin") {
    res.status(403).json({ error: "Acesso negado. Apenas administradores podem acessar este recurso." });
    return;
  }

  next();
}

