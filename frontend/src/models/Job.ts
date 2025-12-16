import { Model, Schema, Types, model, models } from "mongoose";

type JobStatus = "pendente" | "em_execucao" | "concluida" | "cancelada";

export interface JobService {
  catalogId?: Types.ObjectId | string;
  service: string;
  localType?: string;
  soilType?: string;
  access?: string;
  sptInfo?: string;
  sptFileName?: string;
  categories?: string[];
  diametro?: string;
  profundidade?: string;
  quantidade?: string;
  observacoes?: string;
  value?: number;
  discountPercent?: number;
  discountValue?: number;
  finalValue?: number;
  executionTime?: number; // minutes per meter from catalog
}

export interface Job {
  title: string;
  seq?: number;
  clientId?: Types.ObjectId | null;
  clientName?: string;
  site?: string;
  team?: string;
  status: JobStatus;
  plannedDate?: string;
  estimatedDuration?: number; // Total estimated duration in minutes
  startedAt?: string;
  finishedAt?: string;
  notes?: string;
  value?: number;
  discountPercent?: number;
  discountValue?: number;
  finalValue?: number;
  cancellationReason?: string;
  received?: boolean;
  receivedAt?: Date;
  receipt?: string;
  receiptFileKey?: string;
  clientSignature?: string; // Base64 encoded signature image
  clientSignedAt?: Date;
  services: JobService[];
  createdAt?: Date;
  updatedAt?: Date;
}

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
    finalValue: { type: Number, min: 0 }
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
    cancellationReason: { type: String, trim: true },
    received: { type: Boolean, default: false },
    receivedAt: { type: Date },
    receipt: { type: String, trim: true },
    receiptFileKey: { type: String, trim: true },
    services: { type: [JobServiceSchema], required: true }
  },
  { timestamps: true }
);

JobSchema.index({ seq: 1 }, { unique: false });
JobSchema.index({ clientId: 1, status: 1 });

const JobModel = (models.Job as Model<Job>) || model<Job>("Job", JobSchema);

export default JobModel;


