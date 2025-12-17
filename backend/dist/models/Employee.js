"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const FileRefSchema = new mongoose_1.Schema({
    name: { type: String, trim: true },
    mime: { type: String, trim: true },
    size: { type: Number },
    data: { type: String }
}, { _id: false });
const EmployeeSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    role: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    document: { type: String, trim: true },
    docRg: { type: String, trim: true },
    docCnh: { type: String, trim: true },
    docAddressProof: { type: String, trim: true },
    docCv: { type: String, trim: true },
    docRgFile: { type: FileRefSchema },
    docCnhFile: { type: FileRefSchema },
    docAddressProofFile: { type: FileRefSchema },
    docCvFile: { type: FileRefSchema },
    status: { type: String, enum: ["ativo", "inativo"], default: "ativo" },
    hireDate: { type: String, trim: true },
    salary: { type: Number, min: 0 },
    teamId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Team" },
    teamName: { type: String, trim: true },
    machineId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Machine" },
    machineName: { type: String, trim: true },
    notes: { type: String, trim: true }
}, { timestamps: true });
EmployeeSchema.index({ document: 1 }, { unique: false, sparse: true });
EmployeeSchema.index({ name: 1 });
const EmployeeModel = mongoose_1.models.Employee || (0, mongoose_1.model)("Employee", EmployeeSchema);
exports.default = EmployeeModel;
