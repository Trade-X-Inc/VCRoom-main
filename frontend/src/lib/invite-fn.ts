import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

type InviteInput = {
  dealRoomId: string;
  email: string;
  role?: "viewer" | "investor" | "founder";
  invitedBy: string;
  userAccessToken: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  appUrl?: string;
  dealRoomName?: string;
  founderName?: string;
  startupName?: string;
  message?: string;
};

type InviteResult = {
  success: boolean;
  emailSent: boolean;
  token?: string;
  inviteLink?: string;
  error?: string;
  message?: string;
};

export const sendInviteEmail = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): InviteInput => data as InviteInput)
  .handler(async ({ data }: { data: InviteInput }): Promise<InviteResult> => {
    const supabaseUrl =
      data.supabaseUrl ||
      process.env.VITE_SUPABASE_URL ||
      (globalThis as any).VITE_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      (globalThis as any).SUPABASE_URL ||
      "";
    const supabaseAnonKey =
      data.supabaseAnonKey ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      (globalThis as any).VITE_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      (globalThis as any).SUPABASE_ANON_KEY ||
      "";

    if (!supabaseUrl || !supabaseAnonKey) {
      return { success: false, emailSent: false, error: "Missing Supabase config" };
    }

    const client = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${data.userAccessToken}` } },
    });

    const role = data.role ?? "investor";
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: invite, error: dbErr } = await client
      .from("invites")
      .insert({
        deal_room_id: data.dealRoomId,
        email: data.email,
        role,
        invited_by: data.invitedBy,
        expires_at: expiresAt,
      })
      .select("token")
      .single();

    if (dbErr || !invite) {
      return { success: false, emailSent: false, error: dbErr?.message ?? "Failed to create invite record" };
    }

    const baseUrl =
      data.appUrl ||
      (globalThis as any).VITE_APP_URL ||
      process.env.VITE_APP_URL ||
      (globalThis as any).SITE_URL ||
      process.env.SITE_URL ||
      "https://vcroom-main.pages.dev";
    const inviteLink = `${baseUrl}/join/${invite.token}`;

    const resendKey =
      (globalThis as any).RESEND_API_KEY ||
      process.env.RESEND_API_KEY ||
      "";
    const fromEmail =
      (globalThis as any).RESEND_FROM_EMAIL ||
      process.env.RESEND_FROM_EMAIL ||
      "onboarding@resend.dev";

    if (!resendKey) {
      return {
        success: true,
        emailSent: false,
        token: invite.token,
        inviteLink,
        message: "Invite created. Email not sent — copy link manually.",
      };
    }

    const roomName = data.startupName ?? data.dealRoomName ?? "a deal room";
    const senderName = data.founderName ?? "A founder";

    const emailHtml = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;color:#111827">
        <h1 style="font-size:22px;font-weight:700;margin:0 0 8px">You've been invited to a deal room</h1>
        <p style="color:#6b7280;margin:0 0 24px;font-size:15px">${senderName} has invited you to evaluate <strong>${roomName}</strong> on VentureRoom.</p>
        ${data.message ? `<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:0 0 24px"><p style="color:#374151;margin:0;font-size:14px;white-space:pre-line">${data.message}</p></div>` : ""}
        <a href="${inviteLink}" style="background:#6C5CE7;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;font-size:15px">View deal room →</a>
        <p style="color:#9ca3af;font-size:12px;margin:32px 0 0">This link expires in 7 days. If you didn't expect this, you can ignore it.</p>
      </div>
    `;

    try {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: data.email,
          subject: `${senderName} invited you to the ${roomName} deal room`,
          html: emailHtml,
        }),
      });

      if (!emailRes.ok) {
        return { success: true, emailSent: false, token: invite.token, inviteLink, message: "Invite created but email failed to send." };
      }
    } catch {
      return { success: true, emailSent: false, token: invite.token, inviteLink, message: "Invite created but email failed to send." };
    }

    return { success: true, emailSent: true, token: invite.token, inviteLink };
  });
