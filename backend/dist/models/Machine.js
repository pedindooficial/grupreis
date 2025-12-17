"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const MachineSchema = new mongoose_1.Schema({
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
    operatorId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Employee" },
    operatorName: { type: String, trim: true },
    notes: { type: String, trim: true }
}, { timestamps: true });
MachineSchema.index({ name: 1 }, { unique: false });
MachineSchema.index({ plate: 1 }, { unique: false, sparse: true });
const MachineModel = mongoose_1.models.Machine || (0, mongoose_1.model)("Machine", MachineSchema);
exports.default = MachineModel;
