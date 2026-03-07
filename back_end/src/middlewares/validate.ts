import { Request, Response, NextFunction } from "express";
import { ZodType } from "zod";
import { ApiError } from "../utils/ApiError";

function replaceObjectValues(target: unknown, source: unknown) {
  if (!target || typeof target !== "object") return;

  const targetRecord = target as Record<string, unknown>;
  for (const key of Object.keys(targetRecord)) {
    delete targetRecord[key];
  }

  if (source && typeof source === "object") {
    Object.assign(targetRecord, source as Record<string, unknown>);
  }
}

export const validate =
  (schema: ZodType<{ body: unknown; query: unknown; params: unknown }>) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse({
      body: req.body ?? {},
      query: req.query ?? {},
      params: req.params ?? {},
    });

    if (!parsed.success) {
      throw new ApiError(400, "Validation error", parsed.error.flatten());
    }

    const data = parsed.data;
    (req as any).validated = data;
    replaceObjectValues(req.body, data.body);
    replaceObjectValues(req.query, data.query);
    replaceObjectValues(req.params, data.params);
    next();
  };
