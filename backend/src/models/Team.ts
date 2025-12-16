import { Model, Schema, model, models } from "mongoose";
import type { Team } from "../../../../frontend/src/models/Team";

const TeamSchema = new Schema<Team>(
  {
    name: { type: String, required: true, trim: true },
    status: { type: String, enum: ["ativa", "inativa"], default: "ativa" },
    leader: { type: String, trim: true },
    members: { type: [String], default: [] },
    notes: { type: String, trim: true },
    operationToken: { type: String, trim: true },
    operationPass: { type: String, trim: true }
  },
  { timestamps: true }
);

TeamSchema.index({ name: 1 }, { unique: false });

const TeamModel = (models.Team as Model<Team>) || model<Team>("Team", TeamSchema);

export default TeamModel;


