import { Types } from "mongoose";

export type SoilType = "argiloso" | "arenoso" | "rochoso" | "misturado" | "outro";
export type MachineAccess = "livre" | "limitado" | "restrito";

export interface PriceVariation {
  diameter: number; // in cm
  soilType: SoilType;
  access: MachineAccess;
  price: number;
  executionTime?: number; // in minutes per meter (tempo de execução médio por metro)
}

export interface Catalog {
  _id?: Types.ObjectId | string;
  name: string;
  description?: string;
  category?: string;
  photos?: string[]; // S3 keys
  priceVariations: PriceVariation[];
  active?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

