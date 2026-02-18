import { api } from "./axios";
import type { User } from "../types";

export async function registerApi(payload: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}) {
  const res = await api.post("/auth/register", payload);
  return res.data as { user: User; accessToken: string; refreshToken: string };
}

export async function loginApi(payload: { email: string; password: string }) {
  const res = await api.post("/auth/login", payload);
  return res.data as { user: User; accessToken: string; refreshToken: string };
}

export async function logoutApi(refreshToken: string) {
  await api.post("/auth/logout", { refreshToken });
}

export async function forgotPasswordApi(email: string) {
  const res = await api.post("/auth/forgot-password", { email });
  return res.data as { message: string };
}

export async function resetPasswordApi(payload: {
  token: string;
  newPassword: string;
  confirmPassword: string;
}) {
  const res = await api.post("/auth/reset-password", payload);
  return res.data as { message: string };
}
