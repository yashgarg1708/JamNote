import { z } from "zod";

const emptyObject = z.object({}).passthrough();

const emailSchema = z.string().trim().toLowerCase().email();

export const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(60),
    email: emailSchema,
    password: z.string().min(8),
    confirmPassword: z.string().min(1),
  }),
  query: emptyObject,
  params: emptyObject,
});

export const loginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z.string().min(1),
  }),
  query: emptyObject,
  params: emptyObject,
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().trim().min(1).optional(),
  }),
  query: emptyObject,
  params: emptyObject,
});

export const logoutSchema = z.object({
  body: z.object({
    refreshToken: z.string().trim().min(1).optional(),
  }),
  query: emptyObject,
  params: emptyObject,
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: emailSchema,
  }),
  query: emptyObject,
  params: emptyObject,
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().trim().min(1),
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(1),
  }),
  query: emptyObject,
  params: emptyObject,
});
