export type MyRole = "owner" | "editor" | "viewer" | "none";

const idOf = (x: any) => (x?._id ?? x)?.toString();

export function getMyRole(note: any, myUserId: string): MyRole {
  if (!note || !myUserId) return "none";

  if (idOf(note.owner) === myUserId) return "owner";

  const c = (note.collaborators ?? []).find(
    (c: any) => idOf(c.user) === myUserId,
  );
  return c?.role ?? "none";
}
