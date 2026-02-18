import { useState } from "react";
import { shareNote, unshareNote } from "../api/notes";

type Role = "viewer" | "editor";

export default function ShareModal({
  note,
  isOwner,
  onClose,
  onUpdated,
}: {
  note: any;
  isOwner: boolean;
  onClose: () => void;
  onUpdated: (updated: any) => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("viewer");
  const [err, setErr] = useState<string | null>(null);

  const collaborators = note?.collaborators ?? [];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 520,
          background: "white",
          padding: 16,
          borderRadius: 12,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 style={{ margin: 0 }}>Share</h3>
          <button onClick={onClose}>X</button>
        </div>

        {!isOwner && (
          <div style={{ marginTop: 10, color: "#b45309" }}>
            Only owner can manage sharing.
          </div>
        )}

        {isOwner && (
          <>
            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user email"
                style={{ flex: 1 }}
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
              >
                <option value="viewer">viewer</option>
                <option value="editor">editor</option>
              </select>
              <button
                onClick={async () => {
                  setErr(null);
                  try {
                    const updated = await shareNote(note._id, { email, role });
                    onUpdated(updated);
                    setEmail("");
                  } catch (e: any) {
                    setErr(e?.response?.data?.message ?? "Share failed");
                  }
                }}
              >
                Add
              </button>
            </div>
            {err && (
              <div style={{ marginTop: 10, color: "crimson" }}>{err}</div>
            )}
          </>
        )}

        <div style={{ marginTop: 14, fontWeight: 700 }}>Collaborators</div>

        <div
          style={{
            marginTop: 8,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {collaborators.length === 0 && (
            <div style={{ color: "#666" }}>No collaborators</div>
          )}

          {collaborators.map((c: any) => {
            const uid = c.user?._id ?? c.user;
            const emailOrId = c.user?.email ?? uid;

            return (
              <div
                key={uid}
                style={{
                  border: "1px solid #eee",
                  borderRadius: 10,
                  padding: 10,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{emailOrId}</div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {/* ✅ Change role inline (owner only) */}
                  {isOwner ? (
                    <select
                      value={c.role as Role}
                      onChange={async (e) => {
                        setErr(null);
                        try {
                          const updated = await shareNote(note._id, {
                            email: c.user?.email, // requires backend populate
                            role: e.target.value as Role,
                          });
                          onUpdated(updated);
                        } catch (e: any) {
                          setErr(
                            e?.response?.data?.message ?? "Role update failed",
                          );
                        }
                      }}
                    >
                      <option value="viewer">viewer</option>
                      <option value="editor">editor</option>
                    </select>
                  ) : (
                    <div style={{ fontSize: 12, color: "#666" }}>
                      role: {c.role}
                    </div>
                  )}

                  {isOwner && (
                    <button
                      onClick={async () => {
                        setErr(null);
                        try {
                          const updated = await unshareNote(note._id, {
                            collaboratorUserId: uid,
                          });
                          onUpdated(updated);
                        } catch (e: any) {
                          setErr(e?.response?.data?.message ?? "Remove failed");
                        }
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {err && <div style={{ marginTop: 10, color: "crimson" }}>{err}</div>}
      </div>
    </div>
  );
}
