import { getEnvVar } from "@/lib/env";

function getResendKey(): string {
  const cfEnv = (globalThis as any).__cf_env || {};
  const key =
    cfEnv.RESEND_API_KEY ||
    (typeof process !== "undefined" ? process.env?.RESEND_API_KEY : "") ||
    (import.meta as any).env?.VITE_RESEND_API_KEY ||
    "";

  if (!key) {
    console.error("[Resend] No API key found. Checked: __cf_env.RESEND_API_KEY, process.env.RESEND_API_KEY, import.meta.env.VITE_RESEND_API_KEY");
  }
  return key;
}

export const APP_URL = getEnvVar("VITE_APP_URL") || "https://hockystick.app";

export async function sendEmail({
  to,
  subject,
  html,
  replyTo,
  tags,
}: {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
}): Promise<{ id: string } | null> {
  const apiKey = getResendKey();

  if (!apiKey) {
    console.error("[Resend] RESEND_API_KEY not set — email skipped:", subject);
    return null;
  }

  console.log("[Resend] Sending:", subject, "→", to);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Hockystick <hello@hockystick.app>",
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      reply_to: replyTo || "hello@hockystick.app",
      tags: tags || [],
    }),
  });

  const responseText = await res.text();
  console.log("[Resend] Status:", res.status);
  console.log("[Resend] Response:", responseText);

  if (!res.ok) {
    console.error("[Resend] Failed:", res.status, responseText);
    return null;
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return null;
  }
}
