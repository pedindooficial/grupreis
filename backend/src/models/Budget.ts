import { Model, Schema, Types, model, models } from "mongoose";
import type { Budget, BudgetService } from "../../../frontend/src/models/Budget";

const BudgetServiceSchema = new Schema<BudgetService>(
  {
    catalogId: { type: Schema.Types.ObjectId, ref: "Catalog" },
    service: { type: String, required: true, trim: true },
    localType: { type: String, trim: true },
    soilType: { type: String, trim: true },
    access: { type: String, trim: true },
    diametro: { type: String, trim: true },
    profundidade: { type: String, trim: true },
    quantidade: { type: String, trim: true },
    categories: { type: [String], default: [] },
    value: { type: Number, min: 0 },
    discountPercent: { type: Number, min: 0, max: 100 },
    discountValue: { type: Number, min: 0 },
    finalValue: { type: Number, min: 0 },
    basePrice: { type: Number, min: 0 },
    executionTime: { type: Number, min: 0 }
  },
  { _id: false }
);

const BudgetSchema = new Schema<Budget>(
  {
    seq: { type: Number },
    title: { type: String, trim: true },
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    clientName: { type: String, trim: true },
    services: { type: [BudgetServiceSchema], required: true },
    value: { type: Number, min: 0 },
    discountPercent: { type: Number, min: 0, max: 100 },
    discountValue: { type: Number, min: 0 },
    finalValue: { type: Number, min: 0 },
    status: {
      type: String,
      enum: ["pendente", "aprovado", "rejeitado", "convertido"],
      default: "pendente"
    },
    notes: { type: String, trim: true },
    validUntil: { type: String, trim: true },
    jobId: { type: Schema.Types.ObjectId, ref: "Job", default: null },
    // Travel/Displacement fields
    travelDistanceKm: { type: Number, min: 0 },
    travelPrice: { type: Number, min: 0 },
    travelDescription: { type: String, trim: true }
  },
  { timestamps: true }
);

BudgetSchema.index({ seq: 1 });
BudgetSchema.index({ clientId: 1 });
BudgetSchema.index({ status: 1 });
BudgetSchema.index({ createdAt: -1 });

const BudgetModel = (models.Budget as Model<Budget>) || model<Budget>("Budget", BudgetSchema);

export default BudgetModel;

