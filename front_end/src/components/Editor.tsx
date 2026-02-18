import { useEffect, useMemo, useState } from "react";
import type { NoteWithSharing } from "../api/notes";
import type { NotebookWithSharing } from "../api/notebooks";
import { getNote, updateNote } from "../api/notes";
import { socket, connectSocket } from "../socket/socket";
import ShareNotebookModal from "./ShareNotebookModal";
import ShareNoteModal from "./ShareNoteModal";
import { getStoredUser } from "../utils/authSession";

function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
  let t: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

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
  return value ? String(value) : "";
}

function emailOf(value: unknown): string {
  if (value && typeof value === "object") {
    const v = value as { email?: string };
    return v.email?.trim() || "";
  }
  return "";
}

function notebookIdOf(note: NoteWithSharing): string {
  if (!note.notebook) return "";
  if (typeof note.notebook === "string") return note.notebook;
  return note.notebook._id ?? "";
}

export default function Editor({
  noteId,
  notebook,
  onLocalTitleChange,
  onSaved,
  onRequestDelete,
  onNotebookUpdated,
}: {
  noteId: string;
  notebook: NotebookWithSharing | null;
  onLocalTitleChange: (title: string) => void;
  onSaved: (note: NoteWithSharing) => void;
  onRequestDelete: (noteId: string) => void;
  onNotebookUpdated: (notebook: NotebookWithSharing) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [fullNote, setFullNote] = useState<NoteWithSharing | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pinned, setPinned] = useState(false);
  const [showShareNote, setShowShareNote] = useState(false);
  const [showShareNotebook, setShowShareNotebook] = useState(false);

  const me = getStoredUser();

  const myRole = fullNote?.myRole ?? "none";
  const canEdit = myRole === "owner" || myRole === "editor";
  const isOwner = myRole === "owner";

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      const note = await getNote(noteId);
      if (!mounted) return;

      setFullNote(note);
      setTitle(note.title);
      setContent(note.content ?? "");
      setPinned(note.pinned);
      setLoading(false);
    })();

    connectSocket();
    socket.emit("join-note", noteId);

    socket.off("receive-edit");
    socket.on("receive-edit", (nextContent: string) => {
      setContent(nextContent);
    });

    return () => {
      mounted = false;
      socket.off("receive-edit");
      socket.disconnect();
    };
  }, [noteId]);

  const autosave = useMemo(
    () =>
      debounce(async (next: { title: string; content: string; pinned: boolean }) => {
        if (!canEdit) return;
        const saved = await updateNote(noteId, next);
        setFullNote((prev) => ({ ...(prev ?? saved), ...saved }));
        onSaved(saved);
      }, 450),
    [canEdit, noteId, onSaved],
  );

  if (loading || !fullNote) {
    return (
      <section className="panel panel-pad">
        <div className="empty-state">Loading note...</div>
      </section>
    );
  }

  const fullNotebookId = notebookIdOf(fullNote);
  const activeNotebook = notebook && notebook._id === fullNotebookId ? notebook : null;
  const canShareNotebook = activeNotebook ? idOf(activeNotebook.owner) === idOf(me?.id) : false;

  return (
    <section className="panel panel-pad">
      <div className="editor-wrap">
        <div className="editor-toolbar">
          <input
            value={title}
            readOnly={!canEdit}
            onChange={(e) => {
              const next = e.target.value;
              setTitle(next);
              onLocalTitleChange(next);
              autosave({ title: next, content, pinned });
            }}
            style={{ flex: 1, fontSize: 18, fontWeight: 700 }}
            placeholder="Title"
          />

          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="checkbox"
              disabled={!canEdit}
              checked={pinned}
              onChange={(e) => {
                const next = e.target.checked;
                setPinned(next);
                autosave({ title, content, pinned: next });
              }}
            />
            Pin
          </label>

          <button disabled={!isOwner} onClick={() => setShowShareNote(true)}>
            Share Note
          </button>

          <button disabled={!canShareNotebook} onClick={() => setShowShareNotebook(true)}>
            Share Notebook
          </button>

          <button className={isOwner ? "danger" : "shared"} onClick={() => onRequestDelete(noteId)}>
            {isOwner ? "Delete" : "Remove"}
          </button>
        </div>

        <textarea
          className="editor-area"
          value={content}
          readOnly={!canEdit}
          onChange={(e) => {
            const next = e.target.value;
            setContent(next);
            if (!canEdit) return;
            socket.emit("edit-note", { noteId, content: next });
            autosave({ title, content: next, pinned });
          }}
          placeholder="Start writing your note..."
        />

        <div className="editor-meta">
          <span>Role: {myRole}</span>
          <span>
            Owner: {nameOf(fullNote.owner)}
            {emailOf(fullNote.owner) ? ` (${emailOf(fullNote.owner)})` : ""}
          </span>
          <span>
            Last edited by: {nameOf(fullNote.lastEditedBy) || nameOf(fullNote.owner)}
            {emailOf(fullNote.lastEditedBy) ? ` (${emailOf(fullNote.lastEditedBy)})` : ""}
          </span>
          <span>Last edited at: {new Date(fullNote.updatedAt).toLocaleString()}</span>
        </div>
      </div>

      {showShareNote && (
        <ShareNoteModal
          note={fullNote}
          onClose={() => setShowShareNote(false)}
          onUpdated={(updated) => {
            setFullNote((prev) => ({ ...(prev ?? updated), ...updated }));
            onSaved(updated);
          }}
        />
      )}

      {showShareNotebook && activeNotebook && (
        <ShareNotebookModal
          notebook={activeNotebook}
          onClose={() => setShowShareNotebook(false)}
          onUpdated={(updated) => {
            onNotebookUpdated(updated);
          }}
        />
      )}
    </section>
  );
}
