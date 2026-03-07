import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";
import { verifyAccessToken } from "../utils/jwt";

export type AuthedRequest = Request & { userId?: string };

export function requireAuth(
  req: AuthedRequest,
  _res: Response,
  next: NextFunction,
) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) throw new ApiError(401, "Missing access token");

  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.sub;
    next();
  } catch {
    throw new ApiError(401, "Invalid/expired access token");
  }
}
