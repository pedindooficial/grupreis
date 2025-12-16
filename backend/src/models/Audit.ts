import { Model, Schema, model, models } from "mongoose";

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
  createdAt?: Date;
}

const AuditSchema = new Schema<Audit>(
  {
    action: {
      type: String,
      enum: ["create", "update", "delete", "view", "download", "login", "logout", "upload", "other"],
      required: true
    },
    resource: {
      type: String,
      enum: ["document", "user", "client", "job", "employee", "team", "machine", "equipment", "transaction", "cashier", "file", "other"],
      required: true
    },
    resourceId: { type: String, trim: true },
    resourceName: { type: String, trim: true },
    userId: { type: String, trim: true },
    userEmail: { type: String, trim: true },
    userName: { type: String, trim: true },
    details: { type: String, trim: true },
    ipAddress: { type: String, trim: true },
    userAgent: { type: String, trim: true },
    metadata: { type: Schema.Types.Mixed }
  },
  { timestamps: true }
);

AuditSchema.index({ createdAt: -1 });
AuditSchema.index({ userId: 1, createdAt: -1 });
AuditSchema.index({ resource: 1, resourceId: 1 });
AuditSchema.index({ action: 1, createdAt: -1 });

const AuditModel = (models.Audit as Model<Audit>) || model<Audit>("Audit", AuditSchema);

export default AuditModel;

