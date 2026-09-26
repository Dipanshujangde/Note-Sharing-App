import mongoose, { Schema, model, models } from "mongoose";

export interface INote {
  _id: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  title: string;
  content: string;
  createdAt: Date;
}

const noteSchema = new Schema<INote>({
  ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  content: { type: String, required: true, maxlength: 10000 },
  createdAt: { type: Date, default: Date.now }
});

export const Note = models.Note || model<INote>("Note", noteSchema);
