import { Model, Schema, Types, model, models } from "mongoose";

export interface Employee {
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  document?: string;
  docRg?: string;
  docCnh?: string;
  docAddressProof?: string;
  docCv?: string;
  docRgFile?: FileRef;
  docCnhFile?: FileRef;
  docAddressProofFile?: FileRef;
  docCvFile?: FileRef;
  status?: "ativo" | "inativo";
  hireDate?: string;
  salary?: number;
  teamId?: Types.ObjectId | null;
  teamName?: string;
  machineId?: Types.ObjectId | null;
  machineName?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FileRef {
  name: string;
  mime: string;
  size: number;
  data: string; // base64
}

const FileRefSchema = new Schema<FileRef>(
  {
    name: { type: String, trim: true },
    mime: { type: String, trim: true },
    size: { type: Number },
    data: { type: String } // base64
  },
  { _id: false }
);

const EmployeeSchema = new Schema<Employee>(
  {
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
    teamId: { type: Schema.Types.ObjectId, ref: "Team" },
    teamName: { type: String, trim: true },
    machineId: { type: Schema.Types.ObjectId, ref: "Machine" },
    machineName: { type: String, trim: true },
    notes: { type: String, trim: true }
  },
  { timestamps: true }
);

EmployeeSchema.index({ document: 1 }, { unique: false, sparse: true });
EmployeeSchema.index({ name: 1 });

const EmployeeModel =
  (models.Employee as Model<Employee>) || model<Employee>("Employee", EmployeeSchema);

export default EmployeeModel;


