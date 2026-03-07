import mongoose, { Schema, type InferSchemaType, type Types } from "mongoose";

export type CollaboratorRole = "viewer" | "editor";

const NotebookCollaboratorSchema = new Schema(
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

const NotebookSchema = new Schema(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    collaborators: {
      type: [NotebookCollaboratorSchema],
      default: [],
    },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

NotebookSchema.index({ owner: 1, title: 1 });
NotebookSchema.index({ "collaborators.user": 1 });

export type NotebookCollaborator = {
  user: Types.ObjectId;
  role: CollaboratorRole;
};

export type NotebookDoc = InferSchemaType<typeof NotebookSchema> & {
  _id: Types.ObjectId;
};

export const Notebook = mongoose.model("Notebook", NotebookSchema);
