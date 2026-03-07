import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import {
  addCollaborator,
  createNote,
  deleteNoteForever,
  getNote,
  listNotes,
  removeCollaborator,
  restoreNote,
  softDeleteNote,
  updateNote,
} from "../controllers/notes.controller";
import { validate } from "../middlewares/validate";
import {
  createNoteSchema,
  getNoteSchema,
  listNotesSchema,
  noteIdOnlySchema,
  shareNoteSchema,
  unshareNoteSchema,
  updateNoteSchema,
} from "../validators/notes.schemas";

export const notesRouter = Router();

notesRouter.use(requireAuth);

notesRouter.post("/", validate(createNoteSchema), createNote);
notesRouter.get("/", validate(listNotesSchema), listNotes);
notesRouter.get("/:id", validate(getNoteSchema), getNote);
notesRouter.patch("/:id", validate(updateNoteSchema), updateNote);

notesRouter.post("/:id/trash", validate(noteIdOnlySchema), softDeleteNote);
notesRouter.post("/:id/restore", validate(noteIdOnlySchema), restoreNote);
notesRouter.delete("/:id", validate(noteIdOnlySchema), deleteNoteForever);

notesRouter.post("/:id/share", validate(shareNoteSchema), addCollaborator);
notesRouter.post("/:id/unshare", validate(unshareNoteSchema), removeCollaborator);
