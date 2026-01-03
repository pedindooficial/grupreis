import { Model, Schema, model, models } from "mongoose";

export type OrcamentoRequestStatus = "pendente" | "em_contato" | "convertido" | "descartado";

export interface OrcamentoRequestService {
  serviceType: string; // 'estacas', 'fossa', 'sumidouro', 'drenagem', 'postes', 'outro'
  serviceTypeOther?: string; // If serviceType is 'outro'
  serviceId?: string; // Catalog service ID (if selected from catalog)
  serviceName?: string; // Catalog service name (for display)
  diameter?: string;
  depth?: string;
  depthOther?: string; // If depth is 'outro'
  quantity?: string;
  quantityOther?: string; // If quantity is 'outro'
}

export interface OrcamentoRequest {
  _id?: string;
  seq?: number;
  // Client data
  name: string;
  phone: string;
  email?: string;
  address?: string;
  latitude?: number; // Latitude for precise location
  longitude?: number; // Longitude for precise location
  locationType?: string; // 'residencial', 'comercial', 'industrial', 'rural'
  soilType?: string; // 'terra_comum', 'argiloso', 'arenoso', 'rochoso', 'nao_sei'
  access?: string; // 'facil', 'medio', 'dificil'
  deadline?: string; // 'urgente', '30_dias', 'mais_30'
  sptDiagnostic?: string; // SPT/Diagnóstico do Solo text
  // Services
  services: OrcamentoRequestService[];
  // Status and metadata
  status?: OrcamentoRequestStatus;
  notes?: string;
  // Conversion tracking
  clientId?: Schema.Types.ObjectId | string | null; // If converted to client
  budgetId?: Schema.Types.ObjectId | string | null; // If converted to budget
  jobId?: Schema.Types.ObjectId | string | null; // If converted to job
  // Source tracking
  source?: string; // 'website', 'whatsapp', 'email'
  createdAt?: Date;
  updatedAt?: Date;
}

const OrcamentoRequestServiceSchema = new Schema<OrcamentoRequestService>(
  {
    serviceType: { type: String, required: true, trim: true },
    serviceTypeOther: { type: String, trim: true },
    serviceId: { type: String, trim: true }, // Catalog service ID
    serviceName: { type: String, trim: true }, // Catalog service name
    diameter: { type: String, trim: true },
    depth: { type: String, trim: true },
    depthOther: { type: String, trim: true },
    quantity: { type: String, trim: true },
    quantityOther: { type: String, trim: true }
  },
  { _id: false }
);

const OrcamentoRequestSchema = new Schema<OrcamentoRequest>(
  {
    seq: { type: Number },
    // Client data
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    address: { type: String, trim: true },
    latitude: { type: Number }, // Latitude for precise location
    longitude: { type: Number }, // Longitude for precise location
    locationType: { type: String, trim: true },
    soilType: { type: String, trim: true },
    access: { type: String, trim: true },
    deadline: { type: String, trim: true },
    sptDiagnostic: { type: String, trim: true },
    // Services
    services: { type: [OrcamentoRequestServiceSchema], required: true, default: [] },
    // Status and metadata
    status: {
      type: String,
      enum: ["pendente", "em_contato", "convertido", "descartado"],
      default: "pendente"
    },
    notes: { type: String, trim: true },
    // Conversion tracking
    clientId: { type: Schema.Types.ObjectId, ref: "Client", default: null },
    budgetId: { type: Schema.Types.ObjectId, ref: "Budget", default: null },
    jobId: { type: Schema.Types.ObjectId, ref: "Job", default: null },
    // Source tracking
    source: { type: String, trim: true, default: "website" }
  },
  { timestamps: true }
);

OrcamentoRequestSchema.index({ seq: 1 });
OrcamentoRequestSchema.index({ status: 1 });
OrcamentoRequestSchema.index({ createdAt: -1 });
OrcamentoRequestSchema.index({ phone: 1 });
OrcamentoRequestSchema.index({ email: 1 });
// Geospatial index for location queries (2dsphere index for lat/lng)
OrcamentoRequestSchema.index({ longitude: 1, latitude: 1 });

const OrcamentoRequestModel =
  (models.OrcamentoRequest as Model<OrcamentoRequest>) ||
  model<OrcamentoRequest>("OrcamentoRequest", OrcamentoRequestSchema);

export default OrcamentoRequestModel;

