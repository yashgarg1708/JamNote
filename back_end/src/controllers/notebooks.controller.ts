import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { Notebook } from "../models/Notebook";
import { Note } from "../models/Note";
import { User } from "../models/User";
import { AuthedRequest } from "../middlewares/auth";

type ShareRole = "viewer" | "editor";

type ShareInput = {
  email: string;
  role: ShareRole;
};

type UnshareInput = {
  collaboratorUserId: string;
};

function idOf(value: unknown): string {
  if (value && typeof value === "object" && "_id" in (value as Record<string, unknown>)) {
    const maybeId = (value as { _id?: unknown })._id;
    return maybeId ? String(maybeId) : "";
  }
  return value ? String(value) : "";
}

function isValidRole(role: string): role is ShareRole {
  return role === "viewer" || role === "editor";
}

export const createNotebook = asyncHandler(async (req: AuthedRequest, res) => {
  const owner = req.userId!;
  const title = String(req.body?.title ?? "").trim();

  if (!title) throw new ApiError(400, "Title is required");

  const notebook = await Notebook.create({ owner, title });
  await notebook.populate("owner", "email name");
  res.status(201).json(notebook);
});

export const listNotebooks = asyncHandler(async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const includeDeleted = req.query.includeDeleted === "true";
  const scope = String(req.query.scope ?? "owned");

  if (scope === "shared") {
    const sharedNotebooks = await Notebook.find({
      owner: { $ne: userId },
      collaborators: { $elemMatch: { user: userId } },
      deletedAt: null,
    })
      .sort({ createdAt: -1 })
      .populate("owner", "email name")
      .lean();

    return res.json(sharedNotebooks);
  }

  const filter: Record<string, unknown> = { owner: userId };
  if (!includeDeleted) filter.deletedAt = null;

  const notebooks = await Notebook.find(filter)
    .sort({ createdAt: -1 })
    .populate("owner", "email name")
    .populate("collaborators.user", "email name")
    .lean();
  res.json(notebooks);
});

export const listSharedOverview = asyncHandler(async (req: AuthedRequest, res) => {
  const userId = req.userId!;

  const [sharedNotebooks, sharedNotes] = await Promise.all([
    Notebook.find({
      owner: { $ne: userId },
      collaborators: { $elemMatch: { user: userId } },
      deletedAt: null,
    })
      .sort({ createdAt: -1 })
      .populate("owner", "email name")
      .lean(),
    Note.find({
      owner: { $ne: userId },
      collaborators: { $elemMatch: { user: userId } },
      deletedAt: null,
    })
      .sort({ createdAt: -1 })
      .populate({ path: "notebook", select: "title deletedAt owner" })
      .select("_id title pinned notebook updatedAt createdAt")
      .lean(),
  ]);

  const directSharedNotes = sharedNotes.filter((note) => {
    const notebook = note.notebook as { deletedAt?: Date | null; owner?: mongoose.Types.ObjectId } | null;
    if (!notebook) return false;
    if (notebook.deletedAt) return false;
    return idOf(notebook.owner) !== userId;
  });

  res.json({ sharedNotebooks, sharedNotes: directSharedNotes });
});

export const updateNotebook = asyncHandler(async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const { id } = req.params;
  const title = String(req.body?.title ?? "").trim();

  if (!title) throw new ApiError(400, "Title is required");

  const notebook = await Notebook.findById(id);
  if (!notebook) throw new ApiError(404, "Notebook not found");

  const isOwner = idOf(notebook.owner) === userId;
  const canEdit = isOwner || notebook.collaborators.some((c: any) => idOf(c.user) === userId && c.role === "editor");

  if (!canEdit) throw new ApiError(403, "No edit access");
  if (notebook.deletedAt) throw new ApiError(400, "Notebook is in trash");

  notebook.title = title;
  await notebook.save();

  res.json(notebook);
});

export const softDeleteNotebook = asyncHandler(async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const { id } = req.params;

  const notebook = await Notebook.findById(id);
  if (!notebook) throw new ApiError(404, "Notebook not found");

  const isOwner = idOf(notebook.owner) === userId;

  if (isOwner) {
    if (!notebook.deletedAt) {
      notebook.deletedAt = new Date();
      await notebook.save();
      await Note.updateMany(
        { notebook: notebook._id, deletedAt: null, owner: notebook.owner },
        { $set: { deletedAt: notebook.deletedAt } },
      );
    }
    return res.json({ message: "Moved to trash", notebook });
  }

  notebook.collaborators = notebook.collaborators.filter((c: any) => idOf(c.user) !== userId) as any;
  await notebook.save();

  res.json({ message: "Removed from shared notebook", notebookId: id });
});

export const restoreNotebook = asyncHandler(async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const { id } = req.params;

  const notebook = await Notebook.findOne({ _id: id, owner: userId });
  if (!notebook) throw new ApiError(404, "Notebook not found");

  notebook.deletedAt = null;
  await notebook.save();

  await Note.updateMany(
    { notebook: notebook._id, owner: notebook.owner },
    { $set: { deletedAt: null } },
  );

  res.json(notebook);
});

export const deleteNotebookForever = asyncHandler(async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const { id } = req.params;

  const notebook = await Notebook.findById(id);
  if (!notebook) throw new ApiError(404, "Notebook not found");

  if (idOf(notebook.owner) !== userId) throw new ApiError(403, "Only owner can delete permanently");

  await Note.deleteMany({ notebook: notebook._id, owner: notebook.owner });
  await Notebook.deleteOne({ _id: notebook._id });

  res.json({ message: "Deleted permanently" });
});

export const addNotebookCollaborator = asyncHandler(async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const { id } = req.params;
  const { email, role } = req.body as ShareInput;

  if (!email?.trim()) throw new ApiError(400, "Email is required");
  if (!isValidRole(role)) throw new ApiError(400, "Invalid role");

  const notebook = await Notebook.findById(id);
  if (!notebook) throw new ApiError(404, "Notebook not found");
  if (idOf(notebook.owner) !== userId) throw new ApiError(403, "Only owner can share");
  if (notebook.deletedAt) throw new ApiError(400, "Notebook is in trash");

  const target = await User.findOne({ email: email.trim().toLowerCase() });
  if (!target) throw new ApiError(404, "User not found");

  if (idOf(target._id) === userId) throw new ApiError(400, "Owner already has full access");

  const existing = notebook.collaborators.find((c: any) => idOf(c.user) === idOf(target._id));
  if (existing) {
    existing.role = role;
  } else {
    notebook.collaborators.push({ user: target._id, role } as any);
  }

  await notebook.save();
  await notebook.populate([
    { path: "owner", select: "email name" },
    { path: "collaborators.user", select: "email name" },
  ]);

  res.json(notebook);
});

export const removeNotebookCollaborator = asyncHandler(async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const { id } = req.params;
  const { collaboratorUserId } = req.body as UnshareInput;

  if (!collaboratorUserId || !mongoose.Types.ObjectId.isValid(collaboratorUserId)) {
    throw new ApiError(400, "Invalid collaboratorUserId");
  }

  const notebook = await Notebook.findById(id);
  if (!notebook) throw new ApiError(404, "Notebook not found");

  if (idOf(notebook.owner) !== userId) throw new ApiError(403, "Only owner can unshare");

  notebook.collaborators = notebook.collaborators.filter(
    (c: any) => idOf(c.user) !== collaboratorUserId,
  ) as any;

  await notebook.save();
  await notebook.populate([
    { path: "owner", select: "email name" },
    { path: "collaborators.user", select: "email name" },
  ]);

  res.json(notebook);
});
