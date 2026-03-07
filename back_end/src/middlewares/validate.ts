import { Request, Response, NextFunction } from "express";
import { ZodType } from "zod";
import { ApiError } from "../utils/ApiError";

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
    req.body = data.body as Request["body"];
    req.query = data.query as Request["query"];
    req.params = data.params as Request["params"];
    next();
  };
