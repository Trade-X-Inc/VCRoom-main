const FROM_EMAIL = "Hockystick <hello@hockystick.app>";
const REPLY_TO = "hello@hockystick.app";

export const APP_URL =
  (typeof process !== "undefined" && process.env.VITE_APP_URL) ||
  (globalThis as any).VITE_APP_URL ||
  "https://hockystick.app";

function getResendKey() {
  return (
    (typeof process !== "undefined" && process.env.RESEND_API_KEY) ||
    (globalThis as any).RESEND_API_KEY ||
    ""
  );
}

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
}) {
  const key = getResendKey();
  if (!key) {
    console.warn("sendEmail: no RESEND_API_KEY — skipping");
    return null;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      reply_to: replyTo || REPLY_TO,
      tags,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Resend error:", err);
    throw new Error(`Email failed: ${err}`);
  }

  return res.json();
}
