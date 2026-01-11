import { Request, Response, NextFunction } from "express";
import { connectDB } from "../db";
import ClientModel from "../models/Client";
import jwt from "jsonwebtoken";

// Extend Express Request to include client
declare global {
  namespace Express {
    interface Request {
      client?: {
        id: string;
        email: string;
        name: string;
      };
    }
  }
}

export interface ClientAuthRequest extends Request {
  client?: {
    id: string;
    email: string;
    name: string;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "change-this-secret-in-production";

/**
 * Middleware to authenticate client from JWT token
 */
export async function authenticateClient(
  req: ClientAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Token de autenticação não fornecido" });
      return;
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { clientId: string; email: string };
      
      await connectDB();
      
      const client = await ClientModel.findById(decoded.clientId)
        .select("name email")
        .lean();

      if (!client) {
        res.status(401).json({ error: "Cliente não encontrado" });
        return;
      }

      req.client = {
        id: client._id.toString(),
        email: client.email || "",
        name: client.name
      };

      next();
    } catch (jwtError: any) {
      if (jwtError.name === "TokenExpiredError") {
        res.status(401).json({ error: "Token expirado" });
      } else if (jwtError.name === "JsonWebTokenError") {
        res.status(401).json({ error: "Token inválido" });
      } else {
        throw jwtError;
      }
    }
  } catch (error: any) {
    console.error("Client authentication error", error);
    res.status(500).json({ error: "Erro de autenticação", detail: error?.message });
  }
}

/**
 * Generate JWT token for client
 */
export function generateClientToken(clientId: string, email: string): string {
  return jwt.sign(
    { clientId, email },
    JWT_SECRET,
    { expiresIn: "30d" } // Token expires in 30 days
  );
}

