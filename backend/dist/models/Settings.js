"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const SettingsSchema = new mongoose_1.Schema({
    companyName: { type: String, trim: true },
    headquartersAddress: { type: String, trim: true },
    headquartersStreet: { type: String, trim: true },
    headquartersNumber: { type: String, trim: true },
    headquartersNeighborhood: { type: String, trim: true },
    headquartersCity: { type: String, trim: true },
    headquartersState: { type: String, trim: true },
    headquartersZip: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    companySignature: { type: String } // Base64 encoded signature image
}, { timestamps: true });
// Garantir que só existe um documento de configurações
SettingsSchema.index({}, { unique: true });
const SettingsModel = mongoose_1.models.Settings ||
    (0, mongoose_1.model)("Settings", SettingsSchema);
exports.default = SettingsModel;
