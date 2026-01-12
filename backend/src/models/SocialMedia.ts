import { Schema, model, models, Model } from "mongoose";

export interface SocialMediaItem {
  _id?: string;
  type: "image" | "video";
  url: string; // Path in S3 bucket (e.g., "fotos/dergel.jpg" or "videos/demo.mp4")
  title: string;
  description?: string;
  order: number; // For sorting/ordering
  active: boolean;
  clientUpload?: boolean; // True if uploaded by a client from website
  approved?: boolean; // True if approved by admin (only relevant for clientUpload items)
  clientName?: string; // Client name who uploaded (optional)
  clientEmail?: string; // Client email who uploaded (optional)
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
    },
    clientUpload: {
      type: Boolean,
      default: false
    },
    approved: {
      type: Boolean,
      default: false // For client uploads, starts as false (pending approval)
    },
    clientName: {
      type: String,
      trim: true
    },
    clientEmail: {
      type: String,
      trim: true
    }
  },
  { timestamps: true }
);

SocialMediaSchema.index({ order: 1, active: 1 });
SocialMediaSchema.index({ type: 1 });
SocialMediaSchema.index({ clientUpload: 1, approved: 1 }); // For filtering pending approvals

const SocialMediaModel = (models.SocialMedia as Model<SocialMediaItem>) || 
  model<SocialMediaItem>("SocialMedia", SocialMediaSchema);

export default SocialMediaModel;

