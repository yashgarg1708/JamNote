import { useEffect, useMemo, useState } from "react";
import {
  shareNotebook,
  type NotebookWithSharing,
  type ShareRole,
  unshareNotebook,
} from "../api/notebooks";
import { listNotes, shareNote, type NoteWithSharing, unshareNote } from "../api/notes";
import { getStoredUser } from "../utils/authSession";

function idOf(value: unknown): string {
  if (value && typeof value === "object") {
    const v = value as { _id?: unknown; id?: unknown };
    if (v._id) return String(v._id);
    if (v.id) return String(v.id);
  }
  return value ? String(value) : "";
}

function emailOf(value: unknown): string {
  if (value && typeof value === "object") {
    const v = value as { email?: string };
    return v.email?.trim() ?? "";
  }
  return "";
}

function nameOf(value: unknown): string {
  if (value && typeof value === "object") {
    const v = value as { name?: string; email?: string };
    return v.name?.trim() || v.email?.trim() || "";
  }
  return value ? String(value) : "";
}

function directRoleForUser(note: NoteWithSharing, userId: string): ShareRole | null {
  const collab = (note.collaborators ?? []).find((c) => idOf(c.user) === userId);
  return (collab?.role as ShareRole | undefined) ?? null;
}

type ManagedCollaborator = {
  id: string;
  name: string;
  email: string;
  role: ShareRole;
};

function ManageCollaboratorModal({
  collaborator,
  notebookRole,
  notes,
  loadingNotes,
  busy,
  onClose,
  onChangeNoteRole,
}: {
  collaborator: ManagedCollaborator;
  notebookRole: ShareRole;
  notes: NoteWithSharing[];
  loadingNotes: boolean;
  busy: boolean;
  onClose: () => void;
  onChangeNoteRole: (note: NoteWithSharing, next: ShareRole | "inherit") => Promise<void>;
}) {
  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title-row">
          <h3 style={{ margin: 0 }}>Manage Per-Note Access</h3>
          <button onClick={onClose}>Close</button>
        </div>

        <div className="item-sub">User: {collaborator.name || collaborator.email || collaborator.id}</div>
        {collaborator.email && <div className="item-sub">{collaborator.email}</div>}

        <div className="item-sub">
          Notebook default role: <strong>{notebookRole}</strong>. Set note role to override this default.
        </div>

        {loadingNotes && <div className="item-sub">Loading notebook notes...</div>}
        {!loadingNotes && notes.length === 0 && <div className="item-sub">No notes in this notebook.</div>}

        <div className="item-stack">
          {!loadingNotes &&
            notes.map((note) => {
              const directRole = directRoleForUser(note, collaborator.id);
              const current = directRole ?? "inherit";

              return (
                <div key={note._id} className="item-card">
                  <div className="item-main">
                    <div className="item-title">{note.title}</div>
                    <div className="item-sub">Updated {new Date(note.updatedAt).toLocaleString()}</div>
                  </div>

                  <select
                    value={current}
                    disabled={busy}
                    onChange={async (e) => {
                      const next = e.target.value as ShareRole | "inherit";
                      await onChangeNoteRole(note, next);
                    }}
                  >
                    <option value="inherit">inherit ({notebookRole})</option>
                    <option value="viewer">viewer</option>
                    <option value="editor">editor</option>
                  </select>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

export default function ShareNotebookModal({
  notebook,
  onClose,
  onUpdated,
}: {
  notebook: NotebookWithSharing;
  onClose: () => void;
  onUpdated: (notebook: NotebookWithSharing) => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ShareRole>("viewer");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState<NoteWithSharing[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [managing, setManaging] = useState<ManagedCollaborator | null>(null);

  const me = useMemo(() => getStoredUser(), []);

  const isOwner = idOf(notebook.owner) === idOf(me?.id);
  const collaborators = notebook.collaborators ?? [];

  const refreshNotes = async () => {
    setLoadingNotes(true);
    try {
      const notebookNotes = await listNotes({ notebookId: notebook._id, scope: "all" });
      setNotes(notebookNotes.filter((n) => !n.deletedAt));
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Failed to load notebook notes");
    } finally {
      setLoadingNotes(false);
    }
  };

  useEffect(() => {
    if (!isOwner) return;
    void refreshNotes();
  }, [isOwner, notebook._id]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title-row">
          <h3 style={{ margin: 0 }}>Share Notebook</h3>
          <button onClick={onClose}>Close</button>
        </div>

        <div className="item-sub">Notebook: {notebook.title}</div>
        <div className="item-sub">
          Shared by: {nameOf(notebook.owner)}
          {emailOf(notebook.owner) ? ` (${emailOf(notebook.owner)})` : ""}
        </div>

        {!isOwner && <div className="error-text">Only owner can manage notebook sharing.</div>}

        {isOwner && (
          <div className="inline-row">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user email"
              style={{ flex: 1 }}
            />
            <select value={role} onChange={(e) => setRole(e.target.value as ShareRole)}>
              <option value="viewer">viewer</option>
              <option value="editor">editor</option>
            </select>
            <button
              className="primary"
              disabled={busy}
              onClick={async () => {
                const targetEmail = email.trim().toLowerCase();
                if (!targetEmail) return;
                setError(null);
                setBusy(true);
                try {
                  const updated = await shareNotebook(notebook._id, {
                    email: targetEmail,
                    role,
                  });
                  onUpdated(updated);
                  setEmail("");
                } catch (e: any) {
                  setError(e?.response?.data?.message ?? "Share failed");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Add
            </button>
          </div>
        )}

        <div className="section-title">COLLABORATORS</div>
        <div className="item-stack">
          {collaborators.length === 0 && <div className="item-sub">No collaborators</div>}

          {collaborators.map((c) => {
            const userId = idOf(c.user);
            const userEmail = emailOf(c.user);
            const userName = nameOf(c.user) || userEmail || userId;

            return (
              <div key={userId} className="item-card">
                <div className="item-main">
                  <div className="item-title">{userName}</div>
                  {userEmail && <div className="item-sub">{userEmail}</div>}
                </div>

                {isOwner ? (
                  <div className="inline-row">
                    <select
                      value={c.role}
                      onChange={async (e) => {
                        const nextRole = e.target.value as ShareRole;
                        if (!userEmail) {
                          setError("User email is unavailable");
                          return;
                        }
                        setError(null);
                        setBusy(true);
                        try {
                          const updated = await shareNotebook(notebook._id, {
                            email: userEmail,
                            role: nextRole,
                          });
                          onUpdated(updated);
                        } catch (err: any) {
                          setError(err?.response?.data?.message ?? "Role update failed");
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      <option value="viewer">viewer</option>
                      <option value="editor">editor</option>
                    </select>

                    <button
                      disabled={busy}
                      onClick={async () => {
                        if (!userEmail) {
                          setError("User email is unavailable for note permission management");
                          return;
                        }
                        if (notes.length === 0) await refreshNotes();
                        setManaging({ id: userId, name: userName, email: userEmail, role: c.role });
                      }}
                    >
                      Manage
                    </button>

                    <button
                      className="danger"
                      disabled={busy}
                      onClick={async () => {
                        setError(null);
                        setBusy(true);
                        try {
                          const updated = await unshareNotebook(notebook._id, {
                            collaboratorUserId: userId,
                          });
                          onUpdated(updated);
                          if (managing?.id === userId) setManaging(null);
                        } catch (err: any) {
                          setError(err?.response?.data?.message ?? "Remove failed");
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="badge badge-role">{c.role}</div>
                )}
              </div>
            );
          })}
        </div>

        {error && <div className="error-text">{error}</div>}
      </div>

      {managing && (
        <ManageCollaboratorModal
          collaborator={managing}
          notebookRole={managing.role}
          notes={notes}
          loadingNotes={loadingNotes}
          busy={busy}
          onClose={() => setManaging(null)}
          onChangeNoteRole={async (note, next) => {
            setError(null);
            setBusy(true);
            try {
              if (next === "inherit") {
                await unshareNote(note._id, { collaboratorUserId: managing.id });
              } else {
                await shareNote(note._id, {
                  email: managing.email.toLowerCase(),
                  role: next,
                });
              }
              await refreshNotes();
            } catch (err: any) {
              setError(err?.response?.data?.message ?? "Failed to update note permission");
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
    </div>
  );
}
