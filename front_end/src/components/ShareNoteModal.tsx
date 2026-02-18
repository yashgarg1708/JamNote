import { useState } from "react";
import { shareNote, type NoteWithSharing, type ShareRole, unshareNote } from "../api/notes";
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

export default function ShareNoteModal({
  note,
  onClose,
  onUpdated,
}: {
  note: NoteWithSharing;
  onClose: () => void;
  onUpdated: (note: NoteWithSharing) => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ShareRole>("viewer");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const me = getStoredUser();
  const isOwner = idOf(note.owner) === idOf(me?.id);

  const collaborators = note.collaborators ?? [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title-row">
          <h3 style={{ margin: 0 }}>Share Note</h3>
          <button onClick={onClose}>Close</button>
        </div>

        <div className="item-sub">Note: {note.title}</div>
        <div className="item-sub">
          Shared by: {nameOf(note.owner)}
          {emailOf(note.owner) ? ` (${emailOf(note.owner)})` : ""}
        </div>

        {!isOwner && <div className="error-text">Only owner can manage note sharing.</div>}

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
                  const updated = await shareNote(note._id, {
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

        <div className="section-title">DIRECT COLLABORATORS</div>
        <div className="item-stack">
          {collaborators.length === 0 && <div className="item-sub">No direct collaborators</div>}

          {collaborators.map((c) => {
            const userId = idOf(c.user);
            const userEmail = emailOf(c.user) || userId;

            return (
              <div key={userId} className="item-card">
                <div className="item-main">
                  <div className="item-title">{nameOf(c.user) || userEmail}</div>
                  {userEmail && <div className="item-sub">{userEmail}</div>}
                </div>

                {isOwner ? (
                  <div className="inline-row">
                    <select
                      value={c.role}
                      onChange={async (e) => {
                        const nextRole = e.target.value as ShareRole;
                        setError(null);
                        setBusy(true);
                        try {
                          const updated = await shareNote(note._id, {
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
                      className="danger"
                      disabled={busy}
                      onClick={async () => {
                        setError(null);
                        setBusy(true);
                        try {
                          const updated = await unshareNote(note._id, {
                            collaboratorUserId: userId,
                          });
                          onUpdated(updated);
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
    </div>
  );
}
