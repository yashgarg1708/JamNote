import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { Note } from "../models/Note";
import { Notebook } from "../models/Notebook";
import { User } from "../models/User";
import { AuthedRequest } from "../middlewares/auth";

type ShareRole = "viewer" | "editor";
type EffectiveAccess = "none" | "viewer" | "editor" | "owner";

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

function getRoleFromCollaborators(
  collaborators: Array<{ user: unknown; role: ShareRole }> | undefined,
  userId: string,
): ShareRole | null {
  const found = (collaborators ?? []).find((c) => idOf(c.user) === userId);
  return found?.role ?? null;
}

function resolveEffectiveAccess(
  note: { owner: unknown; collaborators?: Array<{ user: unknown; role: ShareRole }> },
  notebook: { collaborators?: Array<{ user: unknown; role: ShareRole }> } | null,
  userId: string,
): EffectiveAccess {
  if (idOf(note.owner) === userId) return "owner";

  const noteRole = getRoleFromCollaborators(note.collaborators, userId);
  if (noteRole) return noteRole;

  const notebookRole = getRoleFromCollaborators(notebook?.collaborators, userId);
  if (notebookRole) return notebookRole;

  return "none";
}

function canView(access: EffectiveAccess): boolean {
  return access === "owner" || access === "editor" || access === "viewer";
}

function canEdit(access: EffectiveAccess): boolean {
  return access === "owner" || access === "editor";
}

function isValidRole(role: string): role is ShareRole {
  return role === "viewer" || role === "editor";
}

function notebookIdOf(note: { notebook: unknown }): string {
  return idOf(note.notebook);
}

async function loadNoteWithNotebook(id: string) {
  const note = await Note.findById(id)
    .populate("collaborators.user", "email name")
    .populate("owner", "name email")
    .populate("lastEditedBy", "name email");
  if (!note) return { note: null, notebook: null };

  const notebook = await Notebook.findById(idOf(note.notebook)).populate(
    "collaborators.user",
    "email name",
  );

  return { note, notebook };
}

export const createNote = asyncHandler(async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const title = String(req.body?.title ?? "").trim();
  const content = String(req.body?.content ?? "");
  const notebookId = req.body?.notebookId as string | undefined;

  if (!title) throw new ApiError(400, "Title is required");
  if (!notebookId || !mongoose.Types.ObjectId.isValid(notebookId)) {
    throw new ApiError(400, "notebookId is required");
  }

  const notebook = await Notebook.findById(notebookId);
  if (!notebook || notebook.deletedAt) throw new ApiError(400, "Invalid notebookId");

  const access = resolveEffectiveAccess(
    { owner: notebook.owner, collaborators: [] },
    { collaborators: notebook.collaborators as Array<{ user: unknown; role: ShareRole }> },
    userId,
  );

  if (!canEdit(access)) throw new ApiError(403, "No edit access to notebook");

  const note = await Note.create({
    owner: notebook.owner,
    lastEditedBy: userId,
    notebook: notebook._id,
    title,
    content,
  });

  await note.populate("owner", "name email");
  await note.populate("lastEditedBy", "name email");

  res.status(201).json(note);
});

export const listNotes = asyncHandler(async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const notebookId = (req.query.notebookId as string | undefined) ?? undefined;
  const includeDeleted = req.query.includeDeleted === "true";
  const q = String(req.query.q ?? "").trim();
  const scope = String(req.query.scope ?? "all");

  const notebookFilter: Record<string, unknown> = {};
  if (!includeDeleted) notebookFilter.deletedAt = null;
  if (notebookId) {
    if (!mongoose.Types.ObjectId.isValid(notebookId)) throw new ApiError(400, "Invalid notebookId");
    notebookFilter._id = notebookId;
  }

  const notebooks = await Notebook.find(notebookFilter)
    .select("_id owner collaborators deletedAt")
    .lean();

  const accessibleNotebookMap = new Map<string, (typeof notebooks)[number]>();

  for (const notebook of notebooks) {
    const access = resolveEffectiveAccess(
      { owner: notebook.owner, collaborators: [] },
      { collaborators: notebook.collaborators as Array<{ user: unknown; role: ShareRole }> },
      userId,
    );

    if (canView(access)) {
      accessibleNotebookMap.set(String(notebook._id), notebook);
    }
  }

  const noteFilter: Record<string, unknown> = {};
  if (!includeDeleted) noteFilter.deletedAt = null;

  if (notebookId) {
    noteFilter.notebook = notebookId;
  } else {
    noteFilter.$or = [
      { notebook: { $in: Array.from(accessibleNotebookMap.keys()) } },
      { collaborators: { $elemMatch: { user: userId } } },
      { owner: userId },
    ];
  }

  const andClauses: Array<Record<string, unknown>> = [];
  if (noteFilter.$or) {
    andClauses.push({ $or: noteFilter.$or as any });
    delete noteFilter.$or;
  }
  if (q) {
    andClauses.push({
      $or: [
        { title: { $regex: q, $options: "i" } },
        { content: { $regex: q, $options: "i" } },
      ],
    });
  }
  if (andClauses.length > 0) {
    noteFilter.$and = andClauses;
  }

  const notes = await Note.find(noteFilter)
    .sort({ pinned: -1, updatedAt: -1 })
    .select("-content")
    .populate("owner", "name email")
    .populate("lastEditedBy", "name email")
    .populate("notebook", "title owner")
    .lean();

  const missingNotebookIds = Array.from(
    new Set(
      notes
        .map((note) => notebookIdOf(note))
        .filter((id) => !accessibleNotebookMap.has(id)),
    ),
  );

  if (missingNotebookIds.length > 0) {
    const extraNotebooks = await Notebook.find({ _id: { $in: missingNotebookIds } })
      .select("_id owner collaborators deletedAt")
      .lean();

    for (const notebook of extraNotebooks) {
      accessibleNotebookMap.set(String(notebook._id), notebook);
    }
  }

  const filtered = notes
    .map((note) => {
      const notebook = accessibleNotebookMap.get(notebookIdOf(note));
      if (!notebook) return null;
      if (!includeDeleted && notebook.deletedAt) return null;

      const access = resolveEffectiveAccess(
        {
          owner: note.owner,
          collaborators: note.collaborators as Array<{ user: unknown; role: ShareRole }> | undefined,
        },
        {
          collaborators: notebook.collaborators as Array<{ user: unknown; role: ShareRole }>,
        },
        userId,
      );

      if (!canView(access)) return null;

      const isOwner = idOf(note.owner) === userId;
      const isDirectShared =
        !isOwner &&
        (note.collaborators as Array<{ user: unknown; role: ShareRole }>).some((c) => idOf(c.user) === userId);
      const isNotebookShared =
        !isOwner &&
        !isDirectShared &&
        (notebook.collaborators as Array<{ user: unknown; role: ShareRole }>).some(
          (c) => idOf(c.user) === userId,
        );

      return {
        ...note,
        myRole: access,
        isDirectShared,
        isNotebookShared,
      };
    })
    .filter((n): n is NonNullable<typeof n> => Boolean(n))
    .filter((note) => {
      if (scope === "owned") return idOf(note.owner) === userId;
      if (scope === "shared") return idOf(note.owner) !== userId;
      if (scope === "sharedDirect") return note.isDirectShared;
      return true;
    });

  res.json(filtered);
});

export const getNote = asyncHandler(async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const id = String(req.params.id ?? "");

  const { note, notebook } = await loadNoteWithNotebook(id);
  if (!note) throw new ApiError(404, "Note not found");
  if (!notebook || notebook.deletedAt) throw new ApiError(404, "Notebook not found");

  const access = resolveEffectiveAccess(
    { owner: note.owner, collaborators: note.collaborators as any },
    { collaborators: notebook.collaborators as any },
    userId,
  );

  if (!canView(access)) throw new ApiError(403, "No access");

  res.json({ ...note.toObject(), myRole: access });
});

export const updateNote = asyncHandler(async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const id = String(req.params.id ?? "");
  const { title, content, pinned, notebookId } = req.body as {
    title?: string;
    content?: string;
    pinned?: boolean;
    notebookId?: string;
  };

  const { note, notebook } = await loadNoteWithNotebook(id);
  if (!note) throw new ApiError(404, "Note not found");
  if (!notebook || notebook.deletedAt) throw new ApiError(404, "Notebook not found");
  if (note.deletedAt) throw new ApiError(400, "Note is in trash");

  const access = resolveEffectiveAccess(
    { owner: note.owner, collaborators: note.collaborators as any },
    { collaborators: notebook.collaborators as any },
    userId,
  );

  if (!canEdit(access)) throw new ApiError(403, "No edit access");

  if (notebookId !== undefined) {
    if (!mongoose.Types.ObjectId.isValid(notebookId)) throw new ApiError(400, "Invalid notebookId");

    const targetNotebook = await Notebook.findById(notebookId);
    if (!targetNotebook || targetNotebook.deletedAt) throw new ApiError(400, "Invalid notebookId");

    const targetAccess = resolveEffectiveAccess(
      { owner: targetNotebook.owner, collaborators: [] },
      { collaborators: targetNotebook.collaborators as any },
      userId,
    );

    if (!canEdit(targetAccess)) throw new ApiError(403, "No edit access to target notebook");

    note.notebook = targetNotebook._id;
    note.owner = targetNotebook.owner;
  }

  if (title !== undefined) {
    const nextTitle = String(title).trim();
    if (!nextTitle) throw new ApiError(400, "Title is required");
    note.title = nextTitle;
  }

  if (content !== undefined) note.content = String(content);
  if (pinned !== undefined) note.pinned = Boolean(pinned);
  note.lastEditedBy = userId as any;

  await note.save();
  await note.populate("collaborators.user", "email name");
  await note.populate("owner", "name email");
  await note.populate("lastEditedBy", "name email");

  res.json(note);
});

export const softDeleteNote = asyncHandler(async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const id = String(req.params.id ?? "");

  const { note, notebook } = await loadNoteWithNotebook(id);
  if (!note) throw new ApiError(404, "Note not found");
  if (!notebook || notebook.deletedAt) throw new ApiError(404, "Notebook not found");

  const access = resolveEffectiveAccess(
    { owner: note.owner, collaborators: note.collaborators as any },
    { collaborators: notebook.collaborators as any },
    userId,
  );

  if (!canView(access)) throw new ApiError(403, "No access");

  if (access === "owner") {
    note.deletedAt = new Date();
    note.lastEditedBy = userId as any;
    await note.save();
    return res.json(note);
  }

  const hadDirectShare = note.collaborators.some((c: any) => idOf(c.user) === userId);
  if (!hadDirectShare) {
    throw new ApiError(
      400,
      "This note access is inherited from notebook sharing. Remove the shared notebook instead.",
    );
  }

  note.collaborators = note.collaborators.filter((c: any) => idOf(c.user) !== userId) as any;
  await note.save();

  return res.json({ message: "Removed from shared note", noteId: id });
});

export const restoreNote = asyncHandler(async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const id = String(req.params.id ?? "");

  const note = await Note.findOne({ _id: id, owner: userId });
  if (!note) throw new ApiError(404, "Note not found");

  note.deletedAt = null;
  note.lastEditedBy = userId as any;
  await note.save();

  res.json(note);
});

export const deleteNoteForever = asyncHandler(async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const id = String(req.params.id ?? "");

  const note = await Note.findOne({ _id: id, owner: userId });
  if (!note) throw new ApiError(404, "Note not found");

  await Note.deleteOne({ _id: id, owner: userId });
  res.json({ message: "Deleted permanently" });
});

export const addCollaborator = asyncHandler(async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const { id } = req.params;
  const { email, role } = req.body as ShareInput;

  if (!email?.trim()) throw new ApiError(400, "Email is required");
  if (!isValidRole(role)) throw new ApiError(400, "Invalid role");

  const note = await Note.findById(id);
  if (!note) throw new ApiError(404, "Note not found");
  if (idOf(note.owner) !== userId) throw new ApiError(403, "Only owner can share");
  if (note.deletedAt) throw new ApiError(400, "Note is in trash");

  const notebook = await Notebook.findById(note.notebook);
  if (!notebook || notebook.deletedAt) throw new ApiError(400, "Invalid notebook");

  const target = await User.findOne({ email: email.trim().toLowerCase() });
  if (!target) throw new ApiError(404, "User not found");
  if (idOf(target._id) === userId) throw new ApiError(400, "Owner already has full access");

  const targetId = idOf(target._id);
  const existing = note.collaborators.find((c: any) => idOf(c.user) === targetId);

  if (existing) existing.role = role;
  else note.collaborators.push({ user: target._id, role } as any);

  await note.save();
  await note.populate("collaborators.user", "email name");
  await note.populate("owner", "name email");
  await note.populate("lastEditedBy", "name email");

  res.json(note);
});

export const removeCollaborator = asyncHandler(async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const { id } = req.params;
  const { collaboratorUserId } = req.body as UnshareInput;

  if (!collaboratorUserId || !mongoose.Types.ObjectId.isValid(collaboratorUserId)) {
    throw new ApiError(400, "Invalid collaboratorUserId");
  }

  const note = await Note.findById(id);
  if (!note) throw new ApiError(404, "Note not found");
  if (idOf(note.owner) !== userId) throw new ApiError(403, "Only owner can unshare");

  note.collaborators = note.collaborators.filter((c: any) => idOf(c.user) !== collaboratorUserId) as any;

  await note.save();
  await note.populate("collaborators.user", "email name");
  await note.populate("owner", "name email");
  await note.populate("lastEditedBy", "name email");

  res.json(note);
});
