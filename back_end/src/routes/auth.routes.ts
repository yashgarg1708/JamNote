import { Router } from "express";
import {
  login,
  logout,
  refresh,
  register,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controller";
import { validate } from "../middlewares/validate";
import { rateLimit } from "../middlewares/rateLimit";
import {
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
} from "../validators/auth.schemas";

export const authRouter = Router();

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyPrefix: "auth:register",
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyPrefix: "auth:login",
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  keyPrefix: "auth:forgot-password",
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyPrefix: "auth:reset-password",
});

authRouter.post("/register", registerLimiter, validate(registerSchema), register);
authRouter.post("/login", loginLimiter, validate(loginSchema), login);
authRouter.post("/refresh", validate(refreshSchema), refresh);
authRouter.post("/logout", validate(logoutSchema), logout);
authRouter.post("/forgot-password", forgotPasswordLimiter, validate(forgotPasswordSchema), forgotPassword);
authRouter.post("/reset-password", resetPasswordLimiter, validate(resetPasswordSchema), resetPassword);
