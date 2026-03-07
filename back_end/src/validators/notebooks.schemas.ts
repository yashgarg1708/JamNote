import { z } from "zod";

const objectIdRegex = /^[a-f\d]{24}$/i;
const objectIdSchema = z.string().trim().regex(objectIdRegex, "Invalid ObjectId");
const emptyObject = z.object({}).passthrough();

const notebookIdParams = z.object({
  id: objectIdSchema,
});

export const createNotebookSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1),
  }),
  query: emptyObject,
  params: emptyObject,
});

export const listNotebooksSchema = z.object({
  body: emptyObject,
  query: z.object({
    includeDeleted: z.enum(["true", "false"]).optional(),
    scope: z.enum(["owned", "shared"]).optional(),
  }),
  params: emptyObject,
});

export const sharedOverviewSchema = z.object({
  body: emptyObject,
  query: emptyObject,
  params: emptyObject,
});

export const updateNotebookSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1),
  }),
  query: emptyObject,
  params: notebookIdParams,
});

export const notebookIdOnlySchema = z.object({
  body: emptyObject,
  query: emptyObject,
  params: notebookIdParams,
});

export const shareNotebookSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email(),
    role: z.enum(["viewer", "editor"]),
  }),
  query: emptyObject,
  params: notebookIdParams,
});

export const unshareNotebookSchema = z.object({
  body: z.object({
    collaboratorUserId: objectIdSchema,
  }),
  query: emptyObject,
  params: notebookIdParams,
});
