import { Model, Schema, Types, model, models } from "mongoose";

export interface Machine {
  name: string;
  plate?: string;
  model?: string;
  year?: number;
  chassi?: string;
  renavam?: string;
  category?: string;
  ownerCompany?: string;
  internalCode?: string;
  fuelType?: string;
  fuelAverage?: number;
  fuelUnit?: string;
  tankCapacityL?: number;
  consumptionKmPerL?: number;
  useType?: "leve" | "medio" | "pesado";
  autonomyEstimated?: number;
  hourmeterStart?: number;
  odometerKm?: number;
  weightKg?: number;
  loadCapacityKg?: number;
  status?: "ativa" | "inativa";
  statusOperational?: "operando" | "manutencao" | "parada" | "inativa";
  lastMaintenance?: string;
  maintenanceType?: "preventiva" | "corretiva";
  maintenanceVendor?: string;
  maintenanceCostAvg?: number;
  requiredLicense?: string;
  mandatoryTraining?: boolean;
  checklistRequired?: boolean;
  lastInspection?: string;
  laudoValidity?: string;
  operatorId?: Types.ObjectId | null;
  operatorName?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const MachineSchema = new Schema<Machine>(
  {
    name: { type: String, required: true, trim: true },
    plate: { type: String, trim: true },
    model: { type: String, trim: true },
    year: { type: Number },
    chassi: { type: String, trim: true },
    renavam: { type: String, trim: true },
    category: { type: String, trim: true },
    ownerCompany: { type: String, trim: true },
    internalCode: { type: String, trim: true },
    fuelType: { type: String, trim: true },
    fuelAverage: { type: Number },
    fuelUnit: { type: String, trim: true, default: "L/h" },
    tankCapacityL: { type: Number },
    consumptionKmPerL: { type: Number },
    useType: { type: String, enum: ["leve", "medio", "pesado"], default: "medio" },
    autonomyEstimated: { type: Number },
    hourmeterStart: { type: Number },
    odometerKm: { type: Number },
    weightKg: { type: Number },
    loadCapacityKg: { type: Number },
    status: { type: String, enum: ["ativa", "inativa"], default: "ativa" },
    statusOperational: {
      type: String,
      enum: ["operando", "manutencao", "parada", "inativa"],
      default: "operando"
    },
    lastMaintenance: { type: String, trim: true },
    maintenanceType: { type: String, enum: ["preventiva", "corretiva"], default: "preventiva" },
    maintenanceVendor: { type: String, trim: true },
    maintenanceCostAvg: { type: Number },
    requiredLicense: { type: String, trim: true },
    mandatoryTraining: { type: Boolean, default: false },
    checklistRequired: { type: Boolean, default: false },
    lastInspection: { type: String, trim: true },
    laudoValidity: { type: String, trim: true },
    operatorId: { type: Schema.Types.ObjectId, ref: "Employee" },
    operatorName: { type: String, trim: true },
    notes: { type: String, trim: true }
  },
  { timestamps: true }
);

MachineSchema.index({ name: 1 }, { unique: false });
MachineSchema.index({ plate: 1 }, { unique: false, sparse: true });

const MachineModel =
  (models.Machine as Model<Machine>) || model<Machine>("Machine", MachineSchema);

export default MachineModel;


