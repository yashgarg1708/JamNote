import bcrypt from "bcrypt";
import type { Request } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { User } from "../models/User";
import crypto from "crypto";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt";
import { env } from "../config/env";
import { isMailerConfigured, sendPasswordResetEmail } from "../utils/mailer";

const SALT_ROUNDS = 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cookieOptions() {
  const secure = env.COOKIE_SECURE;
  const sameSite: "lax" | "none" = secure ? "none" : "lax";
  return {
    httpOnly: true,
    sameSite,
    secure,
    path: "/",
    domain: env.COOKIE_DOMAIN,
  };
}

function normalizeEmail(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function normalizeName(value: unknown) {
  return String(value ?? "").trim();
}

function normalizePassword(value: unknown) {
  return String(value ?? "");
}

function readRefreshToken(req: Request) {
  const fromBody =
    typeof req.body?.refreshToken === "string" ? req.body.refreshToken : "";

  const headerValue = req.headers?.["x-refresh-token"];
  const fromHeader =
    typeof headerValue === "string"
      ? headerValue
      : Array.isArray(headerValue) && typeof headerValue[0] === "string"
        ? headerValue[0]
        : "";

  const fromCookie =
    typeof req.cookies?.refreshToken === "string"
      ? req.cookies.refreshToken
      : "";

  return String(fromBody || fromHeader || fromCookie).trim();
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function resolveFrontendUrl(req: Request) {
  if (env.FRONTEND_URL) return env.FRONTEND_URL;

  const originHeader = req.headers.origin;
  if (typeof originHeader === "string" && originHeader.trim()) {
    return trimTrailingSlash(originHeader.trim());
  }

  const forwardedHost = req.headers["x-forwarded-host"];
  const host =
    (typeof forwardedHost === "string" && forwardedHost.trim()) ||
    req.get("host") ||
    "";

  const forwardedProto = req.headers["x-forwarded-proto"];
  const proto =
    (typeof forwardedProto === "string" && forwardedProto.trim()) ||
    req.protocol ||
    "https";

  if (host) return trimTrailingSlash(`${proto}://${host}`);
  return "http://localhost:5173";
}

// NOTE: You said refresh token feels unnecessary.
// This setup keeps refresh token OPTIONAL for FE + smoother UX.
// FE can ignore refresh and just login again when access expires.

export const register = asyncHandler(async (req, res) => {
  const name = normalizeName(req.body?.name);
  const email = normalizeEmail(req.body?.email);
  const password = normalizePassword(req.body?.password);
  const confirmPassword = normalizePassword(req.body?.confirmPassword);

  if (!name) throw new ApiError(400, "Name is required");
  if (!email || !EMAIL_RE.test(email))
    throw new ApiError(400, "Please provide a valid email");
  if (password.length < 8)
    throw new ApiError(400, "Password must be at least 8 characters");
  if (!confirmPassword) throw new ApiError(400, "Confirm password is required");
  if (password !== confirmPassword)
    throw new ApiError(400, "Passwords do not match");

  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, "Email is already taken");

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ name, email, passwordHash });

  const accessToken = signAccessToken(user._id.toString());
  const refreshToken = signRefreshToken(user._id.toString());
  user.refreshTokenHash = await bcrypt.hash(refreshToken, SALT_ROUNDS);
  await user.save();

  res.cookie("refreshToken", refreshToken, cookieOptions());
  res.status(201).json({
    user: { id: user._id, name: user.name, email: user.email },
    accessToken,
    refreshToken,
  });
});

export const login = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = normalizePassword(req.body?.password);

  if (!email || !EMAIL_RE.test(email))
    throw new ApiError(400, "Please provide a valid email");
  if (!password) throw new ApiError(400, "Password is required");

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(401, "Invalid credentials");

  const ok = await user.comparePassword(password);
  if (!ok) throw new ApiError(401, "Invalid credentials");

  const accessToken = signAccessToken(user._id.toString());
  const refreshToken = signRefreshToken(user._id.toString());
  user.refreshTokenHash = await bcrypt.hash(refreshToken, SALT_ROUNDS);
  await user.save();

  res.cookie("refreshToken", refreshToken, cookieOptions());
  res.json({
    user: { id: user._id, name: user.name, email: user.email },
    accessToken,
    refreshToken,
  });
});

export const refresh = asyncHandler(async (req, res) => {
  const token = readRefreshToken(req);
  if (!token) throw new ApiError(401, "Missing refresh token");

  const payload = verifyRefreshToken(token);
  const user = await User.findById(payload.sub);
  if (!user || !user.refreshTokenHash)
    throw new ApiError(401, "Invalid refresh token");

  const ok = await bcrypt.compare(token, user.refreshTokenHash);
  if (!ok) throw new ApiError(401, "Invalid refresh token");

  const accessToken = signAccessToken(user._id.toString());
  res.json({ accessToken });
});

export const logout = asyncHandler(async (req, res) => {
  const token = readRefreshToken(req);
  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      await User.findByIdAndUpdate(payload.sub, {
        $unset: { refreshTokenHash: 1 },
      });
    } catch {
      // ignore
    }
  }

  res.clearCookie("refreshToken", cookieOptions());
  res.json({ message: "Logged out" });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!email || !EMAIL_RE.test(email))
    throw new ApiError(400, "Please provide a valid email");

  const user = await User.findOne({ email });
  if (!user) {
    // do not reveal if email exists
    return res.json({ message: "If email exists, reset link sent" });
  }

  const resetToken = crypto.randomBytes(32).toString("hex");

  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

  await user.save();

  const frontendUrl = resolveFrontendUrl(req);
  const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

  try {
    if (isMailerConfigured()) {
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl,
      });
    } else {
      console.warn(
        "Mailer not configured. Password reset URL (dev only):",
        resetUrl,
      );
    }
  } catch (err) {
    console.error("Failed to send password reset email:", err);
  }

  res.json({ message: "If email exists, reset link sent" });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const token = String(req.body?.token ?? "").trim();
  const newPassword = normalizePassword(req.body?.newPassword);
  const confirmPassword = normalizePassword(req.body?.confirmPassword);

  if (!token) throw new ApiError(400, "Missing reset token");
  if (newPassword.length < 8)
    throw new ApiError(400, "Password must be at least 8 characters");
  if (!confirmPassword) throw new ApiError(400, "Confirm password is required");
  if (newPassword !== confirmPassword)
    throw new ApiError(400, "Passwords do not match");

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() },
  });

  if (!user) throw new ApiError(400, "Invalid or expired token");

  user.passwordHash = await bcrypt.hash(newPassword, 10);

  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  res.json({ message: "Password reset successful" });
});
