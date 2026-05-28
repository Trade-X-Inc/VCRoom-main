import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { sendEmail, APP_URL } from "./email/resend";
import { dealRoomInviteEmail } from "./email/templates";

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

    const resolvedAppUrl = import.meta.env.VITE_APP_URL || data.appUrl || APP_URL;
    const inviteLink = `${resolvedAppUrl}/join/${invite.token}`;

    // In-app notification for existing users
    try {
      const { data: existingUser } = await client
        .from("users")
        .select("id")
        .eq("email", data.email)
        .maybeSingle();
      if (existingUser?.id) {
        const roomName = data.startupName ?? data.dealRoomName ?? "a deal room";
        const senderName = data.founderName ?? "A founder";
        await client.from("notifications").insert({
          user_id: existingUser.id,
          title: "You have been invited to a deal room",
          body: `${senderName} invited you to the ${roomName} deal room`,
          type: "deal_room_invite",
          deal_room_id: data.dealRoomId,
          action_url: inviteLink,
        });
      }
    } catch {
      // Non-blocking
    }

    // Send branded invite email via Resend
    const companyName = data.startupName ?? data.dealRoomName ?? "a deal room";
    const senderName = data.founderName ?? "A founder";

    try {
      const { subject, html } = dealRoomInviteEmail({
        investorName: "there",
        founderName: senderName,
        companyName,
        inviteLink,
      });

      // Append personal message block if provided
      const finalHtml = data.message
        ? html.replace(
            "</div>\n    <p class=\"meta center\">",
            `<div class="highlight" style="margin-bottom:16px;"><p style="white-space:pre-line;">${data.message}</p></div>\n    </div>\n    <p class="meta center">`,
          )
        : html;

      await sendEmail({
        to: data.email,
        subject,
        html: finalHtml,
        tags: [{ name: "type", value: "deal-room-invite" }],
      });
      return { success: true, emailSent: true, token: invite.token, inviteLink };
    } catch {
      return {
        success: true,
        emailSent: false,
        token: invite.token,
        inviteLink,
        message: "Invite created but email failed to send.",
      };
    }
  });
