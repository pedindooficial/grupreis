import { Model, Schema, Types, model, models } from "mongoose";

export interface Maintenance {
  itemId: Types.ObjectId; // Reference to Equipment or Machine
  itemType: "equipment" | "machine";
  itemName?: string; // Denormalized for easier querying
  date: string; // Date when maintenance was performed
  type: string; // Type of maintenance (e.g., "Troca de óleo", "Revisão geral")
  details?: string; // Detailed description
  cost?: number; // Maintenance cost
  vendor?: string; // Who performed the maintenance
  performedBy?: string; // Internal team member who performed it
  nextMaintenanceDate?: string; // When next maintenance is due
  nextMaintenanceType?: string; // Type of next maintenance
  notes?: string; // Additional notes
  createdAt?: Date;
  updatedAt?: Date;
}

const MaintenanceSchema = new Schema<Maintenance>(
  {
    itemId: { type: Schema.Types.ObjectId, required: true, index: true },
    itemType: { type: String, enum: ["equipment", "machine"], required: true },
    itemName: { type: String, trim: true },
    date: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true },
    details: { type: String, trim: true },
    cost: { type: Number, min: 0 },
    vendor: { type: String, trim: true },
    performedBy: { type: String, trim: true },
    nextMaintenanceDate: { type: String, trim: true },
    nextMaintenanceType: { type: String, trim: true },
    notes: { type: String, trim: true }
  },
  { timestamps: true }
);

// Index for efficient queries
MaintenanceSchema.index({ itemId: 1, itemType: 1 });
MaintenanceSchema.index({ date: -1 });

const MaintenanceModel =
  (models.Maintenance as Model<Maintenance>) || model<Maintenance>("Maintenance", MaintenanceSchema);

export default MaintenanceModel;

