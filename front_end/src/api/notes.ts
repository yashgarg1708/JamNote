import { api } from "./axios";
import type { Note } from "../types";

export type ShareRole = "viewer" | "editor";

export type NoteCollaborator = {
  user: { _id: string; email?: string; name?: string } | string;
  role: ShareRole;
};

export type UserLite = {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
};

export type NoteWithSharing = Omit<Note, "notebook"> & {
  owner?: UserLite | string;
  lastEditedBy?: UserLite | string | null;
  notebook?: { _id: string; title?: string; owner?: UserLite | string } | string | null;
  collaborators?: NoteCollaborator[];
  myRole?: "none" | "viewer" | "editor" | "owner";
  isDirectShared?: boolean;
  isNotebookShared?: boolean;
};

export async function listNotes(params: {
  notebookId?: string;
  q?: string;
  includeDeleted?: boolean;
  scope?: "all" | "owned" | "shared" | "sharedDirect";
}) {
  const sp = new URLSearchParams();
  if (params.notebookId) sp.set("notebookId", params.notebookId);
  if (params.q) sp.set("q", params.q);
  if (params.includeDeleted) sp.set("includeDeleted", "true");
  if (params.scope) sp.set("scope", params.scope);

  const res = await api.get(`/notes?${sp.toString()}`);
  return res.data as NoteWithSharing[];
}

export async function getNote(id: string) {
  const res = await api.get(`/notes/${id}`);
  return res.data as NoteWithSharing;
}

export async function createNote(payload: {
  title: string;
  content?: string;
  notebookId: string;
}) {
  const res = await api.post("/notes", payload);
  return res.data as NoteWithSharing;
}

export async function updateNote(
  id: string,
  payload: Partial<Pick<Note, "title" | "content" | "pinned">> & {
    notebookId?: string;
  },
) {
  const res = await api.patch(`/notes/${id}`, payload);
  return res.data as NoteWithSharing;
}

export async function trashNote(id: string) {
  const res = await api.post(`/notes/${id}/trash`);
  return res.data as NoteWithSharing | { message: string; noteId: string };
}

export async function restoreNote(id: string) {
  const res = await api.post(`/notes/${id}/restore`);
  return res.data as NoteWithSharing;
}

export async function deleteNoteForever(id: string) {
  const res = await api.delete(`/notes/${id}`);
  return res.data as { message: string };
}

export async function shareNote(
  noteId: string,
  payload: { email: string; role: ShareRole },
) {
  const res = await api.post(`/notes/${noteId}/share`, payload);
  return res.data as NoteWithSharing;
}

export async function unshareNote(
  noteId: string,
  payload: { collaboratorUserId: string },
) {
  const res = await api.post(`/notes/${noteId}/unshare`, payload);
  return res.data as NoteWithSharing;
}
