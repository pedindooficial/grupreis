import { Types } from "mongoose";

export type BudgetStatus = "pendente" | "aprovado" | "rejeitado" | "convertido";

export interface BudgetService {
  catalogId?: Types.ObjectId | string;
  service: string;
  localType?: string;
  soilType?: string;
  access?: string;
  diametro?: string;
  profundidade?: string;
  quantidade?: string;
  categories?: string[];
  value?: number;
  discountPercent?: number;
  discountValue?: number;
  finalValue?: number;
  basePrice?: number; // Price per meter from catalog
  executionTime?: number; // minutes per meter from catalog
}

export interface Budget {
  _id?: string;
  seq?: number;
  title?: string;
  clientId: Types.ObjectId | string;
  clientName?: string;
  services: BudgetService[];
  value?: number;
  discountPercent?: number;
  discountValue?: number;
  finalValue?: number;
  status: BudgetStatus;
  notes?: string;
  validUntil?: string; // Date string
  jobId?: Types.ObjectId | string | null; // If converted to job
  // Travel/Displacement fields
  travelDistanceKm?: number;
  travelPrice?: number;
  travelDescription?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

