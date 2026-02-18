import { useState } from "react";
import type { NoteWithSharing } from "../api/notes";
import type { SidebarView } from "./NotebookList";

function nameOf(value: unknown): string {
  if (value && typeof value === "object") {
    const v = value as { name?: string; email?: string };
    return v.name?.trim() || v.email?.trim() || "";
  }
  return value ? String(value) : "";
}

function emailOf(value: unknown): string {
  if (value && typeof value === "object") {
    const v = value as { email?: string };
    return v.email?.trim() || "";
  }
  return "";
}

function isShared(note: NoteWithSharing): boolean {
  return note.myRole !== "owner";
}

export default function NoteList({
  notes,
  activeNoteId,
  onSelect,
  onCreate,
  onSearch,
  view,
  onRequestDelete,
  onRestoreNote,
  onDeleteNoteForever,
  canCreate,
}: {
  notes: NoteWithSharing[];
  activeNoteId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onSearch: (q: string) => void;
  view: SidebarView;
  onRequestDelete: (note: NoteWithSharing) => void;
  onRestoreNote: (id: string) => void;
  onDeleteNoteForever: (id: string) => void;
  canCreate: boolean;
}) {
  const [q, setQ] = useState("");

  const pinned = notes.filter((n) => n.pinned && !n.deletedAt);
  const normal = notes.filter((n) => !n.pinned || Boolean(n.deletedAt));

  const renderRow = (note: NoteWithSharing) => {
    const selected = activeNoteId === note._id;
    const shared = isShared(note);

    return (
      <div
        key={note._id}
        className={`item-card ${selected ? "active" : ""} ${shared ? "shared" : ""}`}
      >
        <button className="ghost item-main" onClick={() => onSelect(note._id)} disabled={view === "trash"}>
          <div className="item-title">
            {note.title}
            {shared ? (
              <span className="badge badge-shared">shared</span>
            ) : (
              <span className="badge badge-owned">owned</span>
            )}
            {note.myRole && note.myRole !== "owner" && <span className="badge badge-role">{note.myRole}</span>}
          </div>

          <div className="item-sub">Updated: {new Date(note.updatedAt).toLocaleString()}</div>

          <div className="item-sub">
            Owner: {nameOf(note.owner)}
            {emailOf(note.owner) ? ` · ${emailOf(note.owner)}` : ""}
          </div>
          <div className="item-sub">
            Last edited by: {nameOf(note.lastEditedBy) || nameOf(note.owner)}
            {emailOf(note.lastEditedBy) ? ` · ${emailOf(note.lastEditedBy)}` : ""}
          </div>
        </button>

        {view === "trash" ? (
          <div className="inline-row">
            <button onClick={() => onRestoreNote(note._id)}>Restore</button>
            <button className="danger" onClick={() => onDeleteNoteForever(note._id)}>
              Delete
            </button>
          </div>
        ) : (
          <button className={shared ? "shared" : "danger"} onClick={() => onRequestDelete(note)}>
            {note.myRole === "owner" ? "Delete" : "Remove"}
          </button>
        )}
      </div>
    );
  };

  return (
    <section className="panel panel-pad panel-scroll">
      <div className="inline-row">
        <input
          value={q}
          onChange={(e) => {
            const next = e.target.value;
            setQ(next);
            onSearch(next);
          }}
          placeholder={view === "trash" ? "Search deleted notes..." : "Search notes..."}
          style={{ flex: 1 }}
        />

        {view !== "trash" && (
          <button className="primary" disabled={!canCreate} onClick={onCreate}>
            New
          </button>
        )}
      </div>

      {view !== "trash" && pinned.length > 0 && (
        <>
          <div className="section-title">PINNED</div>
          <div className="item-stack">{pinned.map(renderRow)}</div>
        </>
      )}

      <div className="section-title">{view === "trash" ? "DELETED NOTES" : "NOTES"}</div>
      <div className="item-stack">{normal.map(renderRow)}</div>
    </section>
  );
}
