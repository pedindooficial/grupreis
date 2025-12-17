"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const BudgetServiceSchema = new mongoose_1.Schema({
    catalogId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Catalog" },
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
}, { _id: false });
const BudgetSchema = new mongoose_1.Schema({
    seq: { type: Number },
    title: { type: String, trim: true },
    clientId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Client", required: true },
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
    jobId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Job", default: null },
    // Travel/Displacement fields
    selectedAddress: { type: String, trim: true }, // Address used for distance calculation
    travelDistanceKm: { type: Number, min: 0 },
    travelPrice: { type: Number, min: 0 },
    travelDescription: { type: String, trim: true }
}, { timestamps: true });
BudgetSchema.index({ seq: 1 });
BudgetSchema.index({ clientId: 1 });
BudgetSchema.index({ status: 1 });
BudgetSchema.index({ createdAt: -1 });
const BudgetModel = mongoose_1.models.Budget || (0, mongoose_1.model)("Budget", BudgetSchema);
exports.default = BudgetModel;
