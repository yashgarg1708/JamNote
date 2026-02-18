import { useMemo, useState } from "react";
import type { NotebookWithSharing } from "../api/notebooks";

export type SidebarView = "active" | "shared" | "trash";
export type SharedTarget = "shared-notes" | string | null;

function idOf(value: unknown): string {
  if (value && typeof value === "object") {
    const v = value as { _id?: unknown; id?: unknown };
    if (v._id) return String(v._id);
    if (v.id) return String(v.id);
  }
  return value ? String(value) : "";
}

function nameOf(value: unknown): string {
  if (value && typeof value === "object") {
    const v = value as { name?: string; email?: string };
    return v.name?.trim() || v.email?.trim() || "";
  }
  return "";
}

function emailOf(value: unknown): string {
  if (value && typeof value === "object") {
    const v = value as { email?: string };
    return v.email?.trim() || "";
  }
  return "";
}

export default function NotebookList({
  view,
  setView,
  notebooks,
  sharedNotebooks,
  activeNotebookId,
  sharedTarget,
  onSelectNotebook,
  onSelectSharedTarget,
  onCreateNotebook,
  onRenameNotebook,
  onRequestDeleteNotebook,
  onRequestDeleteSharedNotebook,
  onRestoreNotebook,
  onDeleteNotebookForever,
}: {
  view: SidebarView;
  setView: (view: SidebarView) => void;
  notebooks: NotebookWithSharing[];
  sharedNotebooks: NotebookWithSharing[];
  activeNotebookId: string | null;
  sharedTarget: SharedTarget;
  onSelectNotebook: (id: string | null) => void;
  onSelectSharedTarget: (target: SharedTarget) => void;
  onCreateNotebook: (title: string) => void;
  onRenameNotebook: (id: string, title: string) => void;
  onRequestDeleteNotebook: (notebook: NotebookWithSharing) => void;
  onRequestDeleteSharedNotebook: (notebook: NotebookWithSharing) => void;
  onRestoreNotebook: (id: string) => void;
  onDeleteNotebookForever: (id: string) => void;
}) {
  const [createTitle, setCreateTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const owned = useMemo(() => notebooks.filter((nb) => !nb.deletedAt), [notebooks]);
  const trash = useMemo(() => notebooks.filter((nb) => Boolean(nb.deletedAt)), [notebooks]);

  return (
    <aside className="panel panel-pad panel-scroll">
      <div className="segmented">
        <button className={view === "active" ? "active" : ""} onClick={() => setView("active")}>
          📁 Notes
        </button>
        <button className={view === "shared" ? "active" : ""} onClick={() => setView("shared")}>
          🤝 Shared
        </button>
        <button className={view === "trash" ? "active" : ""} onClick={() => setView("trash")}>
          🗑️ Trash
        </button>
      </div>

      {view === "active" && (
        <>
          <div className="inline-row">
            <input
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                const title = createTitle.trim();
                if (!title) return;
                onCreateNotebook(title);
                setCreateTitle("");
              }}
              placeholder="Create notebook"
              style={{ flex: 1 }}
            />
            <button
              className="primary"
              onClick={() => {
                const title = createTitle.trim();
                if (!title) return;
                onCreateNotebook(title);
                setCreateTitle("");
              }}
            >
              Add
            </button>
          </div>

          <button className={activeNotebookId === null ? "active" : ""} onClick={() => onSelectNotebook(null)}>
            All Notes
          </button>

          <div className="section-title">OWNED NOTEBOOKS</div>
          <div className="item-stack">
            {owned.map((nb) => {
              const isEditing = editingId === nb._id;
              const isActive = activeNotebookId === nb._id;

              return (
                <div key={nb._id} className={`item-card ${isActive ? "active" : ""}`}>
                  {isEditing ? (
                    <input
                      value={editingTitle}
                      autoFocus
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onBlur={() => {
                        const title = editingTitle.trim();
                        if (title && title !== nb.title) onRenameNotebook(nb._id, title);
                        setEditingId(null);
                        setEditingTitle("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const title = editingTitle.trim();
                          if (title && title !== nb.title) onRenameNotebook(nb._id, title);
                          setEditingId(null);
                          setEditingTitle("");
                        }
                        if (e.key === "Escape") {
                          setEditingId(null);
                          setEditingTitle("");
                        }
                      }}
                      style={{ flex: 1 }}
                    />
                  ) : (
                    <button
                      className="ghost item-main"
                      onClick={() => onSelectNotebook(nb._id)}
                      onDoubleClick={() => {
                        setEditingId(nb._id);
                        setEditingTitle(nb.title);
                      }}
                    >
                      <div className="item-title">
                        {nb.title}
                        <span className="badge badge-owned">owned</span>
                      </div>
                    </button>
                  )}

                  <button className="danger" onClick={() => onRequestDeleteNotebook(nb)}>
                    Delete
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {view === "shared" && (
        <>
          <div className="section-title">SHARED NOTEBOOKS</div>
          <div className="item-stack">
            {sharedNotebooks.map((nb) => {
              const selected = sharedTarget === nb._id;
              const ownerName = nameOf(nb.owner) || idOf(nb.owner);
              const ownerEmail = emailOf(nb.owner);

              return (
                <div key={nb._id} className={`item-card shared ${selected ? "active" : ""}`}>
                  <button className="ghost item-main" onClick={() => onSelectSharedTarget(nb._id)}>
                    <div className="item-title">
                      {nb.title}
                      <span className="badge badge-shared">shared</span>
                    </div>
                    <div className="item-sub">shared by {ownerName}</div>
                    {ownerEmail && <div className="item-sub">{ownerEmail}</div>}
                  </button>

                  <button className="shared" onClick={() => onRequestDeleteSharedNotebook(nb)}>
                    Remove
                  </button>
                </div>
              );
            })}
            {sharedNotebooks.length === 0 && <div className="item-sub">No shared notebooks.</div>}
          </div>

          <div className="section-title">SHARED NOTES</div>
          <button
            className={sharedTarget === "shared-notes" ? "active" : ""}
            onClick={() => onSelectSharedTarget("shared-notes")}
          >
            🎯 Direct note shares
          </button>
        </>
      )}

      {view === "trash" && (
        <>
          <div className="section-title">TRASH</div>
          <div className="item-stack">
            {trash.map((nb) => (
              <div key={nb._id} className="item-card">
                <div className="item-main">
                  <div className="item-title">{nb.title}</div>
                </div>
                <div className="inline-row">
                  <button onClick={() => onRestoreNotebook(nb._id)}>Restore</button>
                  <button className="danger" onClick={() => onDeleteNotebookForever(nb._id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {trash.length === 0 && <div className="item-sub">Trash is empty.</div>}
          </div>
        </>
      )}
    </aside>
  );
}
