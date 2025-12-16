import { Model, Schema, Types, model, models } from "mongoose";
import type { Document, DocumentType, DocumentStatus } from "../../../../frontend/src/models/Document";

const DocumentSchema = new Schema<Document>(
  {
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["contrato", "proposta", "nota_fiscal", "recibo", "outro"],
      required: true
    },
    status: {
      type: String,
      enum: ["pendente", "assinado", "cancelado", "arquivado"],
      default: "pendente"
    },
    description: { type: String, trim: true },
    clientId: { type: Schema.Types.ObjectId, ref: "Client" },
    clientName: { type: String, trim: true },
    jobId: { type: Schema.Types.ObjectId, ref: "Job" },
    jobTitle: { type: String, trim: true },
    fileKey: { type: String, required: true, trim: true },
    fileName: { type: String, required: true, trim: true },
    fileSize: { type: Number, required: true, min: 0 },
    fileType: { type: String, required: true, trim: true },
    signedAt: { type: Date },
    expiresAt: { type: Date },
    notes: { type: String, trim: true }
  },
  { timestamps: true }
);

DocumentSchema.index({ clientId: 1 });
DocumentSchema.index({ jobId: 1 });
DocumentSchema.index({ type: 1, status: 1 });
DocumentSchema.index({ createdAt: -1 });

const DocumentModel =
  (models.Document as Model<Document>) || model<Document>("Document", DocumentSchema);

export default DocumentModel;

