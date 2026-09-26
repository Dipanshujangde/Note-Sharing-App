import mongoose, { Schema, model, models } from "mongoose";

export interface IUser {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string; // unique, lowercased
  passwordHash: string;
  createdAt: Date;
}

const userSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export const User = models.User || model<IUser>("User", userSchema);
