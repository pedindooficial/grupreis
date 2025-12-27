import { Model, Schema, model, models } from "mongoose";

export interface Equipment {
  name: string;
  type?: "equipamento" | "epi" | "ferramenta";
  category?: string;
  patrimony?: string;
  serialNumber?: string;
  status?: "ativo" | "inativo";
  quantity?: number;
  unit?: string;
  assignedTo?: string;
  location?: string;
  nextMaintenance?: string;
  nextMaintenanceType?: string; // e.g., "Troca de óleo", "Revisão geral", "Calibração", etc.
  nextMaintenanceDetails?: string; // Additional details about the maintenance
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const EquipmentSchema = new Schema<Equipment>(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["equipamento", "epi", "ferramenta"], default: "equipamento" },
    category: { type: String, trim: true },
    patrimony: { type: String, trim: true },
    serialNumber: { type: String, trim: true },
    status: { type: String, enum: ["ativo", "inativo"], default: "ativo" },
    quantity: { type: Number, default: 1 },
    unit: { type: String, trim: true, default: "un" },
    assignedTo: { type: String, trim: true },
    location: { type: String, trim: true },
    nextMaintenance: { type: String, trim: true },
    nextMaintenanceType: { type: String, trim: true },
    nextMaintenanceDetails: { type: String, trim: true },
    notes: { type: String, trim: true }
  },
  { timestamps: true }
);

EquipmentSchema.index({ name: 1 }, { unique: false });
EquipmentSchema.index({ patrimony: 1 }, { unique: false, sparse: true });
EquipmentSchema.index({ serialNumber: 1 }, { unique: false, sparse: true });

const EquipmentModel =
  (models.Equipment as Model<Equipment>) || model<Equipment>("Equipment", EquipmentSchema);

export default EquipmentModel;


