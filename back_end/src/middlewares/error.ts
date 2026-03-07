import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";

export function notFound(req: Request, res: Response) {
  res
    .status(404)
    .json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  const status = err instanceof ApiError ? err.statusCode : 500;

  const payload: any = {
    message: err?.message || "Something went wrong",
  };

  if (err instanceof ApiError && err.details) payload.details = err.details;

  // mongoose duplicate key
  if (err?.code === 11000) {
    const hasEmail = Boolean(err?.keyPattern?.email || err?.keyValue?.email);
    return res.status(409).json({
      message: hasEmail ? "Email is already taken" : "Duplicate key",
      details: err.keyValue,
    });
  }

  if (process.env.NODE_ENV !== "production" && status === 500) {
    payload.stack = err?.stack;
  }

  res.status(status).json(payload);
}
