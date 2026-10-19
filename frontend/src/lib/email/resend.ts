import { getEnvVar } from "@/lib/env";
import { safeBase } from "./server-env";

// Plain server module (policy D). Callers are the policy-checked handlers in handlers.ts and the admin-key test
// route. It never logs a recipient, a key or a response body.

export const APP_URL = getEnvVar("VITE_APP_URL") || "https://lengdon.com";

export type MailerConfig = { baseUrl: string; apiKey: string };

export type OutboundEmail = {
  to: string | string[];
  subject: string;
  html: string;
  /** Plain-text alternative. Every app email sends one. */
  text: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
};

export async function sendEmailWith(
  cfg: MailerConfig,
  { to, subject, html, text, replyTo, tags }: OutboundEmail,
  fetchImpl: typeof fetch = fetch,
): Promise<{ id: string } | null> {
  if (!cfg.apiKey) {
    console.error("[Resend] API key not set; email skipped");
    return null;
  }

  const res = await fetchImpl(`${cfg.baseUrl}/emails`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Lengdon <hello@lengdon.com>",
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
      reply_to: replyTo || "hello@lengdon.com",
      tags: tags || [],
    }),
  });

  if (!res.ok) {
    console.error("[Resend] send failed, status", res.status);
    return null;
  }

  try {
    return (await res.json()) as { id: string };
  } catch {
    return null;
  }
}

export async function sendEmail(
  msg: OutboundEmail,
): Promise<{ id: string } | null> {
  const cfEnv = (globalThis as any).__cf_env || {};
  const apiKey =
    cfEnv.RESEND_API_KEY ||
    (typeof process !== "undefined" ? process.env?.RESEND_API_KEY : "") ||
    "";
  const baseUrl = safeBase(
    getEnvVar("RESEND_API_BASE"),
    "https://api.resend.com",
  );
  return sendEmailWith({ baseUrl, apiKey }, msg);
}
