"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const EquipmentSchema = new mongoose_1.Schema({
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
}, { timestamps: true });
EquipmentSchema.index({ name: 1 }, { unique: false });
EquipmentSchema.index({ patrimony: 1 }, { unique: false, sparse: true });
EquipmentSchema.index({ serialNumber: 1 }, { unique: false, sparse: true });
const EquipmentModel = mongoose_1.models.Equipment || (0, mongoose_1.model)("Equipment", EquipmentSchema);
exports.default = EquipmentModel;
