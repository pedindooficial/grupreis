"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const MaintenanceSchema = new mongoose_1.Schema({
    itemId: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
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
}, { timestamps: true });
// Index for efficient queries
MaintenanceSchema.index({ itemId: 1, itemType: 1 });
MaintenanceSchema.index({ date: -1 });
const MaintenanceModel = mongoose_1.models.Maintenance || (0, mongoose_1.model)("Maintenance", MaintenanceSchema);
exports.default = MaintenanceModel;
