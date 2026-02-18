import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import NotebookList, {
  type SharedTarget,
  type SidebarView,
} from "../components/NotebookList";
import NoteList from "../components/NoteList";
import Editor from "../components/Editor";

import {
  createNotebook,
  deleteNotebookForever,
  listNotebooks,
  restoreNotebook,
  trashNotebook,
  updateNotebook,
  type NotebookWithSharing,
} from "../api/notebooks";

import {
  createNote,
  deleteNoteForever,
  listNotes,
  restoreNote,
  trashNote,
  type NoteWithSharing,
} from "../api/notes";

function notebookIdOf(note: NoteWithSharing): string {
  if (!note.notebook) return "";
  if (typeof note.notebook === "string") return note.notebook;
  return note.notebook._id ?? "";
}

type ConfirmDialog = {
  title: string;
  message: string;
  confirmText: string;
  confirmClass?: string;
  onConfirm: () => Promise<void>;
};

export default function AppHome() {
  const [view, setView] = useState<SidebarView>("active");

  const [ownedNotebooks, setOwnedNotebooks] = useState<NotebookWithSharing[]>([]);
  const [sharedNotebooks, setSharedNotebooks] = useState<NotebookWithSharing[]>([]);

  const [notes, setNotes] = useState<NoteWithSharing[]>([]);
  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(null);
  const [sharedTarget, setSharedTarget] = useState<SharedTarget>("shared-notes");
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const selectedNotebookForEditor = useMemo(() => {
    if (!activeNoteId) return null;
    const note = notes.find((n) => n._id === activeNoteId);
    if (!note) return null;

    const notebookId = notebookIdOf(note);
    return (
      ownedNotebooks.find((nb) => nb._id === notebookId) ??
      sharedNotebooks.find((nb) => nb._id === notebookId) ??
      null
    );
  }, [activeNoteId, notes, ownedNotebooks, sharedNotebooks]);

  const openConfirm = (dialog: ConfirmDialog) => setConfirmDialog(dialog);

  const executeConfirm = async () => {
    if (!confirmDialog) return;
    setConfirmBusy(true);
    try {
      await confirmDialog.onConfirm();
      setConfirmDialog(null);
    } finally {
      setConfirmBusy(false);
    }
  };

  const load = async () => {
    const includeDeleted = view === "trash";

    const [owned, shared] = await Promise.all([
      listNotebooks({ includeDeleted, scope: "owned" }),
      listNotebooks({ includeDeleted: false, scope: "shared" }),
    ]);

    setOwnedNotebooks(owned);
    setSharedNotebooks(shared);

    const notebookId =
      view === "active"
        ? activeNotebookId ?? undefined
        : view === "shared" && sharedTarget && sharedTarget !== "shared-notes"
          ? sharedTarget
          : undefined;

    const scope =
      view === "trash"
        ? "owned"
        : view === "shared"
          ? sharedTarget === "shared-notes"
            ? "sharedDirect"
            : "shared"
          : "all";

    const fetchedNotes = await listNotes({
      notebookId,
      q: search,
      includeDeleted,
      scope,
    });

    const visible =
      view === "trash"
        ? fetchedNotes.filter((n) => Boolean(n.deletedAt))
        : fetchedNotes.filter((n) => !n.deletedAt);

    setNotes(visible);

    if (view === "trash") {
      setActiveNoteId(null);
      return;
    }

    if (activeNoteId && !visible.some((n) => n._id === activeNoteId)) {
      setActiveNoteId(visible[0]?._id ?? null);
    }

    if (!activeNoteId && visible[0]) {
      setActiveNoteId(visible[0]._id);
    }
  };

  useEffect(() => {
    void load();
  }, [activeNotebookId, sharedTarget, search, view]);

  const onCreateNotebook = async (title: string) => {
    await createNotebook(title);
    await load();
  };

  const onRenameNotebook = async (id: string, title: string) => {
    await updateNotebook(id, title);
    await load();
  };

  const onCreateNote = async () => {
    const targetNotebookId =
      view === "active"
        ? activeNotebookId ?? ownedNotebooks.find((nb) => !nb.deletedAt)?._id
        : sharedTarget && sharedTarget !== "shared-notes"
          ? sharedTarget
          : null;

    if (!targetNotebookId) return;

    const created = await createNote({
      title: "Untitled",
      content: "",
      notebookId: targetNotebookId,
    });

    setNotes((prev) => [created, ...prev]);
    setActiveNoteId(created._id);
  };

  const onRequestDeleteNotebook = (notebook: NotebookWithSharing) => {
    openConfirm({
      title: "Move notebook to trash?",
      message: `Notebook "${notebook.title}" and its notes will be moved to trash for the owner.`,
      confirmText: "Move to Trash",
      confirmClass: "danger",
      onConfirm: async () => {
        await trashNotebook(notebook._id);
        if (activeNotebookId === notebook._id) setActiveNotebookId(null);
        await load();
      },
    });
  };

  const onRequestDeleteSharedNotebook = (notebook: NotebookWithSharing) => {
    openConfirm({
      title: "Remove shared notebook?",
      message: `You will lose access to "${notebook.title}" and all notes in it.`,
      confirmText: "Remove Notebook",
      confirmClass: "shared",
      onConfirm: async () => {
        await trashNotebook(notebook._id);
        if (activeNotebookId === notebook._id || sharedTarget === notebook._id) {
          setActiveNotebookId(null);
          setSharedTarget("shared-notes");
        }
        await load();
      },
    });
  };

  const onRestoreNotebook = async (id: string) => {
    await restoreNotebook(id);
    await load();
  };

  const onDeleteNotebookForever = async (id: string) => {
    await deleteNotebookForever(id);
    if (activeNotebookId === id) setActiveNotebookId(null);
    await load();
  };

  const onRequestDeleteNote = (note: NoteWithSharing) => {
    const nbId = notebookIdOf(note);

    if (note.myRole !== "owner" && note.isNotebookShared && nbId) {
      openConfirm({
        title: "Note belongs to a shared notebook",
        message:
          "You cannot remove this note individually because access comes from a shared notebook. Remove the whole shared notebook instead?",
        confirmText: "Remove Shared Notebook",
        confirmClass: "shared",
        onConfirm: async () => {
          await trashNotebook(nbId);
          if (activeNotebookId === nbId || sharedTarget === nbId) {
            setActiveNotebookId(null);
            setSharedTarget("shared-notes");
          }
          setActiveNoteId(null);
          await load();
        },
      });
      return;
    }

    const ownerDelete = note.myRole === "owner";
    openConfirm({
      title: ownerDelete ? "Delete note?" : "Remove shared note?",
      message: ownerDelete
        ? "This note will be moved to trash."
        : "You will be removed from this shared note.",
      confirmText: ownerDelete ? "Delete Note" : "Remove Note",
      confirmClass: ownerDelete ? "danger" : "shared",
      onConfirm: async () => {
        await trashNote(note._id);
        if (activeNoteId === note._id) setActiveNoteId(null);
        await load();
      },
    });
  };

  const onRequestDeleteById = (noteId: string) => {
    const note = notes.find((n) => n._id === noteId);
    if (!note) {
      openConfirm({
        title: "Delete note?",
        message: "This note will be moved to trash.",
        confirmText: "Delete Note",
        confirmClass: "danger",
        onConfirm: async () => {
          await trashNote(noteId);
          if (activeNoteId === noteId) setActiveNoteId(null);
          await load();
        },
      });
      return;
    }
    onRequestDeleteNote(note);
  };

  const onRestoreNote = async (id: string) => {
    await restoreNote(id);
    await load();
  };

  const onDeleteNoteForever = async (id: string) => {
    await deleteNoteForever(id);
    if (activeNoteId === id) setActiveNoteId(null);
    await load();
  };

  const canCreateNote = useMemo(() => {
    if (view === "trash") return false;
    if (view === "shared" && sharedTarget === "shared-notes") return false;
    return true;
  }, [sharedTarget, view]);

  return (
    <Layout>
      <main className="workspace">
        <NotebookList
          view={view}
          setView={(next) => {
            setView(next);
            setActiveNoteId(null);
            setActiveNotebookId(null);
            if (next === "shared") setSharedTarget("shared-notes");
          }}
          notebooks={ownedNotebooks}
          sharedNotebooks={sharedNotebooks}
          activeNotebookId={activeNotebookId}
          sharedTarget={sharedTarget}
          onSelectNotebook={(id) => {
            setActiveNotebookId(id);
            setActiveNoteId(null);
          }}
          onSelectSharedTarget={(target) => {
            setSharedTarget(target);
            setActiveNoteId(null);
          }}
          onCreateNotebook={onCreateNotebook}
          onRenameNotebook={onRenameNotebook}
          onRequestDeleteNotebook={onRequestDeleteNotebook}
          onRequestDeleteSharedNotebook={onRequestDeleteSharedNotebook}
          onRestoreNotebook={onRestoreNotebook}
          onDeleteNotebookForever={onDeleteNotebookForever}
        />

        <NoteList
          notes={notes}
          activeNoteId={activeNoteId}
          onSelect={(id) => setActiveNoteId(id)}
          onCreate={onCreateNote}
          onSearch={(q) => setSearch(q)}
          view={view}
          onRequestDelete={onRequestDeleteNote}
          onRestoreNote={onRestoreNote}
          onDeleteNoteForever={onDeleteNoteForever}
          canCreate={canCreateNote}
        />

        {view === "trash" ? (
          <section className="panel panel-pad">
            <div className="empty-state">
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Recently Deleted</div>
                <div>Trash is owner-only. Shared users cannot view owner trash.</div>
              </div>
            </div>
          </section>
        ) : activeNoteId ? (
          <Editor
            noteId={activeNoteId}
            notebook={selectedNotebookForEditor}
            onRequestDelete={onRequestDeleteById}
            onLocalTitleChange={(title) => {
              setNotes((prev) => prev.map((n) => (n._id === activeNoteId ? { ...n, title } : n)));
            }}
            onSaved={(saved) => {
              setNotes((prev) => prev.map((n) => (n._id === saved._id ? { ...n, ...saved } : n)));
            }}
            onNotebookUpdated={(updatedNotebook) => {
              setOwnedNotebooks((prev) =>
                prev.map((nb) => (nb._id === updatedNotebook._id ? updatedNotebook : nb)),
              );
              setSharedNotebooks((prev) =>
                prev.map((nb) => (nb._id === updatedNotebook._id ? updatedNotebook : nb)),
              );
            }}
          />
        ) : (
          <section className="panel panel-pad">
            <div className="empty-state">
              {view === "shared" && sharedTarget === "shared-notes"
                ? "Shared Notes is a virtual section. Select a note to view."
                : "Create or select a note to start."}
            </div>
          </section>
        )}
      </main>

      {confirmDialog && (
        <div className="modal-overlay" onClick={() => (!confirmBusy ? setConfirmDialog(null) : null)}>
          <div className="modal-card confirm-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title-row">
              <h3 style={{ margin: 0 }}>{confirmDialog.title}</h3>
              <button disabled={confirmBusy} onClick={() => setConfirmDialog(null)}>
                Close
              </button>
            </div>

            <div className="confirm-text">{confirmDialog.message}</div>

            <div className="actions-row">
              <button disabled={confirmBusy} onClick={() => setConfirmDialog(null)}>
                Cancel
              </button>
              <button
                className={confirmDialog.confirmClass || "primary"}
                disabled={confirmBusy}
                onClick={() => void executeConfirm()}
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
