import { Model, Schema, model, models } from "mongoose";

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
  name: string;
  description?: string;
  category?: string;
  photos?: string[]; // S3 keys
  priceVariations: PriceVariation[];
  active?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const PriceVariationSchema = new Schema<PriceVariation>(
  {
    diameter: { type: Number, required: true, min: 0 },
    soilType: {
      type: String,
      enum: ["argiloso", "arenoso", "rochoso", "misturado", "outro"],
      required: true
    },
    access: {
      type: String,
      enum: ["livre", "limitado", "restrito"],
      required: true
    },
    price: { type: Number, required: true, min: 0 },
    executionTime: { type: Number, min: 0 } // minutes per meter
  },
  { _id: false }
);

const CatalogSchema = new Schema<Catalog>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: { type: String, trim: true },
    photos: [{ type: String, trim: true }],
    priceVariations: {
      type: [PriceVariationSchema],
      required: true,
      validate: {
        validator: (variations: PriceVariation[]) => variations.length > 0,
        message: "Pelo menos uma variação de preço é obrigatória"
      }
    },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// Index for searching
CatalogSchema.index({ name: "text", description: "text", category: "text" });
CatalogSchema.index({ active: 1 });
CatalogSchema.index({ category: 1 });

const CatalogModel = (models.Catalog as Model<Catalog>) || model<Catalog>("Catalog", CatalogSchema);

export default CatalogModel;

