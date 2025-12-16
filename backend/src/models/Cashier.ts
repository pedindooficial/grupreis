import { Model, Schema, model, models } from "mongoose";
import type { Cashier, CashierStatus } from "../../../../frontend/src/models/Cashier";

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

