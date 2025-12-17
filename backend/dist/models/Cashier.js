"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const CashierSchema = new mongoose_1.Schema({
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
}, { timestamps: true });
CashierSchema.index({ status: 1 });
CashierSchema.index({ openedAt: -1 });
const CashierModel = mongoose_1.models.Cashier || (0, mongoose_1.model)("Cashier", CashierSchema);
exports.default = CashierModel;
