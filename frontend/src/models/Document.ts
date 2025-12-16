import { Types } from "mongoose";

export type DocumentType = "contrato" | "proposta" | "nota_fiscal" | "recibo" | "outro";
export type DocumentStatus = "pendente" | "assinado" | "cancelado" | "arquivado";

export interface Document {
  _id?: Types.ObjectId | string;
  title: string;
  type: DocumentType;
  status: DocumentStatus;
  description?: string;
  clientId?: Types.ObjectId | string | null;
  clientName?: string;
  jobId?: Types.ObjectId | string | null;
  jobTitle?: string;
  fileKey: string; // S3 key
  fileName: string;
  fileSize: number;
  fileType: string; // MIME type
  signedAt?: Date | string;
  expiresAt?: Date | string;
  notes?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

