import mongoose, { Schema, type InferSchemaType, type Types } from "mongoose";

export type CollaboratorRole = "viewer" | "editor";

const NoteCollaboratorSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: {
      type: String,
      enum: ["viewer", "editor"],
      required: true,
      default: "viewer",
    },
  },
  { _id: false },
);

const NoteSchema = new Schema(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    lastEditedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    notebook: {
      type: Schema.Types.ObjectId,
      ref: "Notebook",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    content: { type: String, default: "" },
    pinned: { type: Boolean, default: false },
    collaborators: {
      type: [NoteCollaboratorSchema],
      default: [],
    },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

NoteSchema.index({ owner: 1, notebook: 1, updatedAt: -1 });
NoteSchema.index({ notebook: 1, pinned: -1, updatedAt: -1 });
NoteSchema.index({ "collaborators.user": 1 });

export type NoteCollaborator = {
  user: Types.ObjectId;
  role: CollaboratorRole;
};

export type NoteDoc = InferSchemaType<typeof NoteSchema> & {
  _id: Types.ObjectId;
};

export const Note = mongoose.model("Note", NoteSchema);
