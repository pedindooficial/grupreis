import { Types } from "mongoose";

export type UserRole = "admin" | "user";

export interface User {
  _id?: Types.ObjectId | string;
  email: string;
  password?: string; // Only for creation, never returned in API
  name: string;
  role: UserRole;
  active?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

