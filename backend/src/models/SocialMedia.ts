import { Schema, model, models, Model } from "mongoose";

export interface SocialMediaItem {
  _id?: string;
  type: "image" | "video";
  url: string; // Path in S3 bucket (e.g., "fotos/dergel.jpg" or "videos/demo.mp4")
  title: string;
  description?: string;
  order: number; // For sorting/ordering
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const SocialMediaSchema = new Schema<SocialMediaItem>(
  {
    type: {
      type: String,
      enum: ["image", "video"],
      required: true
    },
    url: {
      type: String,
      required: true,
      trim: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ""
    },
    order: {
      type: Number,
      default: 0
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

SocialMediaSchema.index({ order: 1, active: 1 });
SocialMediaSchema.index({ type: 1 });

const SocialMediaModel = (models.SocialMedia as Model<SocialMediaItem>) || 
  model<SocialMediaItem>("SocialMedia", SocialMediaSchema);

export default SocialMediaModel;

