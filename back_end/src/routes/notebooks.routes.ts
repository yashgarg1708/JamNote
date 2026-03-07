import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import {
  addNotebookCollaborator,
  createNotebook,
  deleteNotebookForever,
  listNotebooks,
  listSharedOverview,
  removeNotebookCollaborator,
  restoreNotebook,
  softDeleteNotebook,
  updateNotebook,
} from "../controllers/notebooks.controller";
import { validate } from "../middlewares/validate";
import {
  createNotebookSchema,
  listNotebooksSchema,
  notebookIdOnlySchema,
  shareNotebookSchema,
  sharedOverviewSchema,
  unshareNotebookSchema,
  updateNotebookSchema,
} from "../validators/notebooks.schemas";

export const notebooksRouter = Router();

notebooksRouter.use(requireAuth);

notebooksRouter.post("/", validate(createNotebookSchema), createNotebook);
notebooksRouter.get("/", validate(listNotebooksSchema), listNotebooks);
notebooksRouter.get("/shared-overview", validate(sharedOverviewSchema), listSharedOverview);
notebooksRouter.patch("/:id", validate(updateNotebookSchema), updateNotebook);

notebooksRouter.post("/:id/trash", validate(notebookIdOnlySchema), softDeleteNotebook);
notebooksRouter.post("/:id/restore", validate(notebookIdOnlySchema), restoreNotebook);
notebooksRouter.delete("/:id", validate(notebookIdOnlySchema), deleteNotebookForever);

notebooksRouter.post("/:id/share", validate(shareNotebookSchema), addNotebookCollaborator);
notebooksRouter.post("/:id/unshare", validate(unshareNotebookSchema), removeNotebookCollaborator);
