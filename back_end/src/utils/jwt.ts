// src/utils/jwt.ts
import * as jwt from "jsonwebtoken";
import type { JwtPayload, SignOptions } from "jsonwebtoken";
import type { StringValue } from "ms";

import { env } from "../config/env";

export type AppJwtPayload = {
  sub: string;
};

/* ---------- Options ---------- */

const accessOpts: SignOptions = {
  // env values like "15m", "1h", "30d"
  expiresIn: env.ACCESS_TOKEN_EXPIRES_IN as StringValue,
};

const refreshOpts: SignOptions = {
  expiresIn: env.REFRESH_TOKEN_EXPIRES_IN as StringValue,
};

/* ---------- Sign ---------- */

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_ACCESS_SECRET, accessOpts);
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_REFRESH_SECRET, refreshOpts);
}

/* ---------- Verify ---------- */

function verifyToken(token: string, secret: string): AppJwtPayload {
  const decoded = jwt.verify(token, secret);

  // verify() can return: string | JwtPayload
  if (typeof decoded === "string") throw new Error("Invalid token");

  const payload = decoded as JwtPayload;

  // sub can be string | undefined depending on how token was created
  if (typeof payload.sub !== "string" || !payload.sub) {
    throw new Error("Invalid token");
  }

  return { sub: payload.sub };
}

export function verifyAccessToken(token: string): AppJwtPayload {
  return verifyToken(token, env.JWT_ACCESS_SECRET);
}

export function verifyRefreshToken(token: string): AppJwtPayload {
  return verifyToken(token, env.JWT_REFRESH_SECRET);
}
