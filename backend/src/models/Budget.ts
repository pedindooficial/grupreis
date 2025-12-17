import { Model, Schema, Types, model, models } from "mongoose";

export type BudgetStatus = "pendente" | "aprovado" | "rejeitado" | "convertido";

export interface BudgetService {
  catalogId?: Types.ObjectId | string;
  service: string;
  localType?: string;
  soilType?: string;
  access?: string;
  diametro?: string;
  profundidade?: string;
  quantidade?: string;
  categories?: string[];
  value?: number;
  discountPercent?: number;
  discountValue?: number;
  finalValue?: number;
  basePrice?: number;
  executionTime?: number;
}

export interface Budget {
  _id?: string;
  seq?: number;
  title?: string;
  clientId: Types.ObjectId | string;
  clientName?: string;
  services: BudgetService[];
  value?: number;
  discountPercent?: number;
  discountValue?: number;
  finalValue?: number;
  status?: BudgetStatus;
  notes?: string;
  validUntil?: string;
  jobId?: Types.ObjectId | string | null;
  selectedAddress?: string;
  travelDistanceKm?: number;
  travelPrice?: number;
  travelDescription?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

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
    selectedAddress: { type: String, trim: true }, // Address used for distance calculation
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

