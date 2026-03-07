import dotenv from "dotenv";
import crypto from "crypto";
import path from "path";

// Use a single root-level .env for the whole project.
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

function reqEnv(key: string) {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env: ${key}`);
  return v;
}

function parseListEnv(key: string) {
  return String(process.env[key] ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function fallbackSecret(label: string, mongoUri: string) {
  return crypto
    .createHash("sha256")
    .update(`${label}:${mongoUri}`)
    .digest("hex");
}

const mongoUri = reqEnv("MONGO_URI");

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: Number(process.env.PORT ?? 8000),
  MONGO_URI: mongoUri,

  JWT_ACCESS_SECRET:
    String(process.env.JWT_ACCESS_SECRET ?? "").trim() ||
    fallbackSecret("access", mongoUri),
  JWT_REFRESH_SECRET:
    String(process.env.JWT_REFRESH_SECRET ?? "").trim() ||
    fallbackSecret("refresh", mongoUri),
  ACCESS_TOKEN_EXPIRES_IN: process.env.ACCESS_TOKEN_EXPIRES_IN ?? "15m",
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN ?? "30d",

  COOKIE_SECURE:
    (process.env.COOKIE_SECURE ?? (process.env.NODE_ENV === "production" ? "true" : "false")) === "true",
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || undefined,

  FRONTEND_URL: normalizeUrl(process.env.FRONTEND_URL ?? ""),
  CORS_ORIGINS: parseListEnv("CORS_ORIGINS"),
  SOCKET_CORS_ORIGINS: parseListEnv("SOCKET_CORS_ORIGINS"),

  RESEND_API_KEY: String(process.env.RESEND_API_KEY ?? "").trim(),
  MAIL_FROM: String(process.env.MAIL_FROM ?? "").trim(),
};
