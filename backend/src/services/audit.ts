import { Request } from "express";
import { connectDB } from "../db";
import AuditModel, { AuditAction, AuditResource } from "../models/Audit";

export interface AuditLogData {
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string;
  resourceName?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  details?: string;
  metadata?: Record<string, any>;
}

/**
 * Log an audit event
 */
export async function logAudit(req: Request, data: AuditLogData): Promise<void> {
  try {
    await connectDB();

    const ipAddress = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";

    await AuditModel.create({
      ...data,
      ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
      userAgent
    });
  } catch (error) {
    // Don't throw - audit logging should not break the main flow
    console.error("Failed to log audit:", error);
  }
}

