import http from "http";
import { Server } from "socket.io";
import { verifyAccessToken } from "./utils/jwt";
import { Note } from "./models/Note";
import { Notebook } from "./models/Notebook";
import { env } from "./config/env";

function idOf(u: any) {
  return (u?._id ?? u)?.toString();
}

type ShareRole = "viewer" | "editor";
type EffectiveAccess = "none" | "viewer" | "editor" | "owner";

function getRoleFromCollaborators(
  collaborators: Array<{ user: unknown; role: ShareRole }> | undefined,
  userId: string,
): ShareRole | null {
  const found = (collaborators ?? []).find((c) => idOf(c.user) === userId);
  return found?.role ?? null;
}

function resolveEffectiveAccess(
  note: { owner: unknown; collaborators?: Array<{ user: unknown; role: ShareRole }> },
  notebook: { collaborators?: Array<{ user: unknown; role: ShareRole }> } | null,
  userId: string,
): EffectiveAccess {
  if (idOf(note.owner) === userId) return "owner";

  const noteRole = getRoleFromCollaborators(note.collaborators, userId);
  if (noteRole) return noteRole;

  const notebookRole = getRoleFromCollaborators(notebook?.collaborators, userId);
  if (notebookRole) return notebookRole;

  return "none";
}

function canView(access: EffectiveAccess) {
  return access === "owner" || access === "editor" || access === "viewer";
}

function canEdit(access: EffectiveAccess) {
  return access === "owner" || access === "editor";
}

async function loadNoteWithNotebook(noteId: string) {
  const note = await Note.findById(noteId).select(
    "owner notebook collaborators deletedAt",
  );
  if (!note) return { note: null, notebook: null };

  const notebook = await Notebook.findById(idOf(note.notebook)).select(
    "collaborators deletedAt",
  );

  return { note, notebook };
}

export function initSocket(httpServer: http.Server) {
  const socketOrigins =
    env.SOCKET_CORS_ORIGINS.length > 0 ? env.SOCKET_CORS_ORIGINS : env.CORS_ORIGINS;

  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (socketOrigins.length === 0) return callback(null, true);
        if (socketOrigins.includes(origin)) return callback(null, true);
        return callback(new Error("Not allowed by socket CORS"), false);
      },
      credentials: true,
    },
  });

  // 1) SOCKET AUTH (JWT)
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("No token"));
    try {
      const payload = verifyAccessToken(token);
      (socket as any).userId = payload.sub;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = (socket as any).userId as string;

    // 2) JOIN NOTE (authorize view)
    socket.on("join-note", async (noteId: string) => {
      const { note, notebook } = await loadNoteWithNotebook(noteId);
      if (!note || !notebook || note.deletedAt || notebook.deletedAt) return;

      const access = resolveEffectiveAccess(
        { owner: note.owner, collaborators: note.collaborators as any },
        { collaborators: notebook.collaborators as any },
        userId,
      );

      if (!canView(access)) return;
      socket.join(noteId);
    });

    // 3) EDIT NOTE (authorize edit)
    socket.on(
      "edit-note",
      async ({ noteId, content }: { noteId: string; content: string }) => {
        const { note, notebook } = await loadNoteWithNotebook(noteId);
        if (!note || !notebook || note.deletedAt || notebook.deletedAt) return;

        const access = resolveEffectiveAccess(
          { owner: note.owner, collaborators: note.collaborators as any },
          { collaborators: notebook.collaborators as any },
          userId,
        );

        if (!canEdit(access)) return; // viewers blocked
        socket.to(noteId).emit("receive-edit", content);
      },
    );
  });

  return io;
}
