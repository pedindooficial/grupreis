"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const TeamSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    status: { type: String, enum: ["ativa", "inativa"], default: "ativa" },
    leader: { type: String, trim: true },
    members: { type: [String], default: [] },
    notes: { type: String, trim: true },
    operationToken: { type: String, trim: true }, // Legacy - for old links
    operationPass: { type: String, trim: true }
}, { timestamps: true });
TeamSchema.index({ name: 1 }, { unique: false });
const TeamModel = mongoose_1.models.Team || (0, mongoose_1.model)("Team", TeamSchema);
exports.default = TeamModel;
