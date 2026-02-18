import { api } from "./axios";
import type { Notebook } from "../types";

export type ShareRole = "viewer" | "editor";

export type NotebookCollaborator = {
  user: { _id: string; email?: string; name?: string } | string;
  role: ShareRole;
};

export type NotebookWithSharing = Notebook & {
  owner?: { _id?: string; id?: string; email?: string; name?: string } | string;
  collaborators?: NotebookCollaborator[];
};

export async function listNotebooks(options?: {
  includeDeleted?: boolean;
  scope?: "owned" | "shared";
}) {
  const includeDeleted = options?.includeDeleted ?? false;
  const scope = options?.scope ?? "owned";
  const sp = new URLSearchParams();
  sp.set("includeDeleted", includeDeleted ? "true" : "false");
  sp.set("scope", scope);

  const res = await api.get(`/notebooks?${sp.toString()}`);
  return res.data as NotebookWithSharing[];
}

export async function listSharedOverview() {
  const res = await api.get("/notebooks/shared-overview");
  return res.data as {
    sharedNotebooks: NotebookWithSharing[];
    sharedNotes: Array<{
      _id: string;
      title: string;
      pinned: boolean;
      notebook: { _id: string; title: string } | string;
      updatedAt: string;
      createdAt: string;
    }>;
  };
}

export async function createNotebook(title: string) {
  const res = await api.post("/notebooks", { title });
  return res.data as NotebookWithSharing;
}

export async function updateNotebook(id: string, title: string) {
  const res = await api.patch(`/notebooks/${id}`, { title });
  return res.data as NotebookWithSharing;
}

export async function trashNotebook(id: string) {
  const res = await api.post(`/notebooks/${id}/trash`);
  return res.data as { message: string; notebook?: NotebookWithSharing; notebookId?: string };
}

export async function restoreNotebook(id: string) {
  const res = await api.post(`/notebooks/${id}/restore`);
  return res.data as NotebookWithSharing;
}

export async function deleteNotebookForever(id: string) {
  const res = await api.delete(`/notebooks/${id}`);
  return res.data as { message: string };
}

export async function shareNotebook(
  notebookId: string,
  payload: { email: string; role: ShareRole },
) {
  const res = await api.post(`/notebooks/${notebookId}/share`, payload);
  return res.data as NotebookWithSharing;
}

export async function unshareNotebook(
  notebookId: string,
  payload: { collaboratorUserId: string },
) {
  const res = await api.post(`/notebooks/${notebookId}/unshare`, payload);
  return res.data as NotebookWithSharing;
}
