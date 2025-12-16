import { Model, Schema, Types, model, models } from "mongoose";

export type CashierStatus = "aberto" | "fechado";

export interface Cashier {
  status: CashierStatus;
  openedAt: Date;
  closedAt?: Date;
  openingBalance: number; // Saldo inicial ao abrir
  closingBalance?: number; // Saldo ao fechar
  openedBy?: string; // Nome do usuário que abriu
  closedBy?: string; // Nome do usuário que fechou
  notes?: string; // Observações ao abrir/fechar
  createdAt?: Date;
  updatedAt?: Date;
}

const CashierSchema = new Schema<Cashier>(
  {
    status: {
      type: String,
      enum: ["aberto", "fechado"],
      required: true,
      default: "fechado"
    },
    openedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    closedAt: {
      type: Date
    },
    openingBalance: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    closingBalance: {
      type: Number,
      min: 0
    },
    openedBy: {
      type: String,
      trim: true
    },
    closedBy: {
      type: String,
      trim: true
    },
    notes: {
      type: String,
      trim: true
    }
  },
  { timestamps: true }
);

CashierSchema.index({ status: 1 });
CashierSchema.index({ openedAt: -1 });

const CashierModel =
  (models.Cashier as Model<Cashier>) || model<Cashier>("Cashier", CashierSchema);

export default CashierModel;

