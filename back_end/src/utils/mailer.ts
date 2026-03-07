import { env } from "../config/env";

type PasswordResetMailInput = {
  to: string;
  name: string;
  resetUrl: string;
};

type ResendSendResult = {
  id?: string;
  error?: { message?: string };
};

export function isMailerConfigured() {
  return Boolean(env.RESEND_API_KEY && env.MAIL_FROM);
}

export async function sendPasswordResetEmail(input: PasswordResetMailInput) {
  if (!isMailerConfigured()) {
    throw new Error("Mailer is not configured");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.MAIL_FROM,
      to: [input.to],
      subject: "Reset your JamNotes password",
      html: `
        <p>Hi ${input.name || "there"},</p>
        <p>We received a request to reset your JamNotes password.</p>
        <p><a href="${input.resetUrl}">Reset password</a></p>
        <p>This link expires in 15 minutes.</p>
        <p>If you did not request this, you can ignore this email.</p>
      `,
      text: `Hi ${input.name || "there"},
We received a request to reset your JamNotes password.
Reset password: ${input.resetUrl}
This link expires in 15 minutes.
If you did not request this, you can ignore this email.`,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as ResendSendResult;
  if (!response.ok) {
    const detail = payload.error?.message ? `: ${payload.error.message}` : "";
    throw new Error(`Resend request failed (${response.status})${detail}`);
  }
}
