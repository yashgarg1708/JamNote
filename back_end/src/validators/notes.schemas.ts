import { z } from "zod";

const objectIdRegex = /^[a-f\d]{24}$/i;
const objectIdSchema = z.string().trim().regex(objectIdRegex, "Invalid ObjectId");
const emptyObject = z.object({}).passthrough();

const noteIdParams = z.object({
  id: objectIdSchema,
});

export const createNoteSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1),
    content: z.string().optional(),
    notebookId: objectIdSchema,
  }),
  query: emptyObject,
  params: emptyObject,
});

export const listNotesSchema = z.object({
  body: emptyObject,
  query: z.object({
    notebookId: objectIdSchema.optional(),
    q: z.string().trim().optional(),
    includeDeleted: z.enum(["true", "false"]).optional(),
    scope: z.enum(["all", "owned", "shared", "sharedDirect"]).optional(),
  }),
  params: emptyObject,
});

export const getNoteSchema = z.object({
  body: emptyObject,
  query: emptyObject,
  params: noteIdParams,
});

export const updateNoteSchema = z.object({
  body: z
    .object({
      title: z.string().trim().min(1).optional(),
      content: z.string().optional(),
      pinned: z.boolean().optional(),
      notebookId: objectIdSchema.optional(),
    })
    .refine((body) => Object.values(body).some((value) => value !== undefined), {
      message: "At least one field is required",
    }),
  query: emptyObject,
  params: noteIdParams,
});

export const noteIdOnlySchema = z.object({
  body: emptyObject,
  query: emptyObject,
  params: noteIdParams,
});

export const shareNoteSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email(),
    role: z.enum(["viewer", "editor"]),
  }),
  query: emptyObject,
  params: noteIdParams,
});

export const unshareNoteSchema = z.object({
  body: z.object({
    collaboratorUserId: objectIdSchema,
  }),
  query: emptyObject,
  params: noteIdParams,
});
