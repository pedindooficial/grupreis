import { Types } from "mongoose";

export type AuditAction = 
  | "create" 
  | "update" 
  | "delete" 
  | "view" 
  | "download" 
  | "login" 
  | "logout"
  | "upload"
  | "other";

export type AuditResource = 
  | "document" 
  | "user" 
  | "client" 
  | "job" 
  | "employee" 
  | "team" 
  | "machine" 
  | "equipment" 
  | "transaction" 
  | "cashier"
  | "file"
  | "other";

export interface Audit {
  _id?: Types.ObjectId | string;
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string;
  resourceName?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  createdAt?: Date | string;
}

