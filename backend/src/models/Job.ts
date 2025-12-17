import { Model, Schema, Types, model, models } from "mongoose";
import type { Job, JobService } from "../../../../frontend/src/models/Job";

const JobServiceSchema = new Schema<JobService>(
  {
    catalogId: { type: Schema.Types.ObjectId, ref: "Catalog" },
    service: { type: String, required: true, trim: true },
    localType: { type: String, trim: true },
    soilType: { type: String, trim: true },
    access: { type: String, trim: true },
    sptInfo: { type: String, trim: true },
    sptFileName: { type: String, trim: true },
    categories: { type: [String], default: [] },
    diametro: { type: String, trim: true },
    profundidade: { type: String, trim: true },
    quantidade: { type: String, trim: true },
    observacoes: { type: String, trim: true },
    value: { type: Number, min: 0 },
    discountPercent: { type: Number, min: 0, max: 100 },
    discountValue: { type: Number, min: 0 },
    finalValue: { type: Number, min: 0 },
    executionTime: { type: Number, min: 0 } // minutes per meter from catalog
  },
  { _id: false }
);

const JobSchema = new Schema<Job>(
  {
    title: { type: String, required: true, trim: true },
    seq: { type: Number },
    clientId: { type: Schema.Types.ObjectId, ref: "Client" },
    clientName: { type: String, trim: true },
    site: { type: String, trim: true },
    team: { type: String, trim: true },
    status: {
      type: String,
      enum: ["pendente", "em_execucao", "concluida", "cancelada"],
      default: "pendente"
    },
    plannedDate: { type: String, trim: true },
    estimatedDuration: { type: Number, min: 0 }, // Total estimated duration in minutes
    startedAt: { type: String, trim: true },
    finishedAt: { type: String, trim: true },
    notes: { type: String, trim: true },
    value: { type: Number, min: 0 },
    discountPercent: { type: Number, min: 0, max: 100 },
    discountValue: { type: Number, min: 0 },
    finalValue: { type: Number, min: 0 },
    // Travel/Displacement fields
    selectedAddress: { type: String, trim: true }, // Address used for distance calculation
    travelDistanceKm: { type: Number, min: 0 },
    travelPrice: { type: Number, min: 0 },
    travelDescription: { type: String, trim: true },
    cancellationReason: { type: String, trim: true },
    received: { type: Boolean, default: false },
    receivedAt: { type: Date },
    receipt: { type: String, trim: true },
    receiptFileKey: { type: String, trim: true },
    clientSignature: { type: String }, // Base64 encoded signature image
    clientSignedAt: { type: Date },
    services: { type: [JobServiceSchema], required: true }
  },
  { timestamps: true }
);

JobSchema.index({ seq: 1 }, { unique: false });
JobSchema.index({ clientId: 1, status: 1 });

const JobModel = (models.Job as Model<Job>) || model<Job>("Job", JobSchema);

export default JobModel;


