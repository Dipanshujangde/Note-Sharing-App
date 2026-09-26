import mongoose, { Schema, model, models } from "mongoose";

export type ShareType = "one_time" | "time_based";
export type AccessType = "public" | "password";

export interface IShare {
  _id: mongoose.Types.ObjectId;
  noteId: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  token: string;            // unguessable, goes in URL
  shareType: ShareType;
  accessType: AccessType;
  passwordHash?: string;    // only for accessType=password
  expiryAt?: Date;          // required when shareType=time_based
  usedAt?: Date;            // set on first successful access (one_time)
  revokedAt?: Date;         // set when owner force-invalidates
  viewCount: number;
  attempts: number;         // failed password attempts
  lockedUntil?: Date;       // brute-force lockout
  createdAt: Date;
}

const shareSchema = new Schema<IShare>({
  noteId: { type: Schema.Types.ObjectId, ref: "Note", required: true, index: true },
  ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  token: { type: String, required: true, unique: true, index: true },
  shareType: { type: String, enum: ["one_time", "time_based"], required: true },
  accessType: { type: String, enum: ["public", "password"], required: true },
  passwordHash: { type: String },
  expiryAt: { type: Date },
  usedAt: { type: Date },
  revokedAt: { type: Date },
  viewCount: { type: Number, default: 0 },
  attempts: { type: Number, default: 0 },
  lockedUntil: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

// Helpful compound indexes
shareSchema.index({ token: 1, revokedAt: 1 });
shareSchema.index({ expiryAt: 1 });

export const Share = models.Share || model<IShare>("Share", shareSchema);
