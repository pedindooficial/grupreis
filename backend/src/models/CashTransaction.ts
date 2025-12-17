import { Model, Schema, model, models } from "mongoose";
import type {
  CashTransaction,
  TransactionType,
  PaymentMethod
} from "../../../../frontend/src/models/CashTransaction";

const CashTransactionSchema = new Schema<CashTransaction>(
  {
    type: {
      type: String,
      enum: ["entrada", "saida"],
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    date: {
      type: String,
      required: true,
      trim: true
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      default: null
    },
    clientName: {
      type: String,
      trim: true
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      default: null
    },
    jobTitle: {
      type: String,
      trim: true
    },
    paymentMethod: {
      type: String,
      enum: ["dinheiro", "pix", "transferencia", "cartao", "cheque", "outro"],
      required: true,
      default: "dinheiro"
    },
    category: {
      type: String,
      trim: true
    },
    notes: {
      type: String,
      trim: true
    },
    receiptFileKey: {
      type: String,
      trim: true
    },
    cashierId: {
      type: Schema.Types.ObjectId,
      ref: "Cashier",
      default: null
    }
  },
  { timestamps: true }
);

CashTransactionSchema.index({ date: -1 });
CashTransactionSchema.index({ type: 1, date: -1 });
CashTransactionSchema.index({ clientId: 1 });
CashTransactionSchema.index({ jobId: 1 });
CashTransactionSchema.index({ cashierId: 1 });
// Unique index to prevent duplicate transactions for the same job (only for entrada type)
CashTransactionSchema.index(
  { jobId: 1, type: 1 },
  { unique: true, partialFilterExpression: { type: "entrada", jobId: { $exists: true, $ne: null } } }
);

const CashTransactionModel =
  (models.CashTransaction as Model<CashTransaction>) ||
  model<CashTransaction>("CashTransaction", CashTransactionSchema);

export default CashTransactionModel;


