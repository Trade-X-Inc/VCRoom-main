import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { getEnvVar } from "@/lib/env";
import { sendEmail, APP_URL } from "./resend";
import {
  welcomeEmail,
  dealRoomInviteEmail,
  ndaSignedEmail,
  investorDecisionEmail,
  documentUploadedEmail,
  meetingScheduledEmail,
  feedbackRequestEmail,
  startupTeamInviteEmail,
} from "./templates";

function getServiceClient() {
  const cfEnv = (globalThis as any).__cf_env || {};
  const url = cfEnv.VITE_SUPABASE_URL || cfEnv.SUPABASE_URL || getEnvVar("VITE_SUPABASE_URL") || getEnvVar("SUPABASE_URL");
  const key = cfEnv.SUPABASE_SERVICE_ROLE_KEY || getEnvVar("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key);
}

// ── Welcome email — called on first signup ─────────────────────────────────

export const triggerWelcomeEmail = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as { userId: string; name: string; role: "founder" | "investor"; email: string })
  .handler(async ({ data }) => {
    const { subject, html } = welcomeEmail({ name: data.name, role: data.role });
    const result = await sendEmail({
      to: data.email,
      subject,
      html,
      tags: [{ name: "type", value: "welcome" }, { name: "role", value: data.role }],
    });
    if (result?.id) {
      try {
        await getServiceClient().from("email_events").insert({
          event_type: "email.sent",
          email_id: result.id,
          to_email: data.email,
          tags: [{ type: "welcome" }],
        });
      } catch {}
    }
    return result;
  });

// ── Deal room invite ───────────────────────────────────────────────────────

export const triggerDealRoomInvite = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as {
    to: string;
    investorName: string;
    founderName: string;
    companyName: string;
    inviteToken: string;
    stage?: string;
    sector?: string;
  })
  .handler(async ({ data }) => {
    const inviteLink = `${APP_URL}/join/${data.inviteToken}`;
    const { subject, html } = dealRoomInviteEmail({
      investorName: data.investorName || "there",
      founderName: data.founderName,
      companyName: data.companyName,
      inviteLink,
      companyStage: data.stage,
      companySector: data.sector,
    });
    return sendEmail({
      to: data.to,
      subject,
      html,
      tags: [{ name: "type", value: "deal-room-invite" }],
    });
  });

// ── NDA signed ─────────────────────────────────────────────────────────────

export const triggerNdaSigned = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as {
    founderEmail: string;
    founderName: string;
    investorName: string;
    investorEmail: string;
    companyName: string;
    dealRoomId: string;
  })
  .handler(async ({ data }) => {
    const { subject, html } = ndaSignedEmail({
      founderName: data.founderName,
      investorName: data.investorName,
      investorEmail: data.investorEmail,
      companyName: data.companyName,
      dealRoomUrl: `${APP_URL}/app/deal-room/${data.dealRoomId}`,
    });
    return sendEmail({
      to: data.founderEmail,
      subject,
      html,
      tags: [{ name: "type", value: "nda-signed" }],
    });
  });

// ── Investment decision ────────────────────────────────────────────────────

export const triggerDecision = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as {
    founderEmail: string;
    founderName: string;
    investorName: string;
    companyName: string;
    decision: "Invest" | "Hold" | "Pass";
    dealRoomId: string;
    note?: string;
  })
  .handler(async ({ data }) => {
    const { subject, html } = investorDecisionEmail({
      founderName: data.founderName,
      investorName: data.investorName,
      companyName: data.companyName,
      decision: data.decision,
      dealRoomUrl: `${APP_URL}/app/deal-room/${data.dealRoomId}`,
      note: data.note,
    });
    return sendEmail({
      to: data.founderEmail,
      subject,
      html,
      tags: [{ name: "type", value: "decision" }, { name: "decision", value: data.decision }],
    });
  });

// ── Document uploaded ──────────────────────────────────────────────────────

export const triggerDocumentUploaded = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as {
    investorEmail: string;
    investorName: string;
    founderName: string;
    companyName: string;
    documentName: string;
    dealRoomId: string;
  })
  .handler(async ({ data }) => {
    const { subject, html } = documentUploadedEmail({
      investorName: data.investorName,
      founderName: data.founderName,
      companyName: data.companyName,
      documentName: data.documentName,
      dealRoomUrl: `${APP_URL}/app/deal-room/${data.dealRoomId}`,
    });
    return sendEmail({
      to: data.investorEmail,
      subject,
      html,
      tags: [{ name: "type", value: "document-uploaded" }],
    });
  });

// ── Meeting scheduled ──────────────────────────────────────────────────────

export const triggerMeetingScheduled = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as {
    recipientEmail: string;
    recipientName: string;
    organizerName: string;
    companyName: string;
    meetingTitle: string;
    meetingDate: string;
    meetingLink?: string;
    dealRoomId: string;
  })
  .handler(async ({ data }) => {
    const { subject, html } = meetingScheduledEmail({
      recipientName: data.recipientName,
      organizerName: data.organizerName,
      companyName: data.companyName,
      meetingTitle: data.meetingTitle,
      meetingDate: data.meetingDate,
      meetingLink: data.meetingLink,
      dealRoomUrl: `${APP_URL}/app/deal-room/${data.dealRoomId}`,
    });
    return sendEmail({
      to: data.recipientEmail,
      subject,
      html,
      tags: [{ name: "type", value: "meeting-scheduled" }],
    });
  });

// ── 7-day feedback request ─────────────────────────────────────────────────

export const triggerFeedbackRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as { name: string; email: string; role: "founder" | "investor" })
  .handler(async ({ data }) => {
    const { subject, html } = feedbackRequestEmail({ name: data.name, role: data.role });
    return sendEmail({
      to: data.email,
      subject,
      html,
      tags: [{ name: "type", value: "feedback-request" }],
    });
  });

// ── Deal-room server-lookup variants (called from client with only IDs) ────

export const triggerNdaSignedEmail = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as { dealRoomId: string; investorUserId: string })
  .handler(async ({ data }) => {
    try {
      const db = getServiceClient();
      const [{ data: investor }, { data: room }] = await Promise.all([
        db.from("users").select("full_name, email").eq("id", data.investorUserId).maybeSingle(),
        db.from("deal_rooms")
          .select("*, startups(company_name), deal_room_members(user_id, role, users(full_name, email))")
          .eq("id", data.dealRoomId).single(),
      ]);
      const members: any[] = (room as any)?.deal_room_members ?? [];
      const founder = members.find((m: any) => m.role === "founder");
      if (!founder?.users?.email) return null;
      const { subject, html } = ndaSignedEmail({
        founderName: founder.users.full_name ?? "the founder",
        investorName: (investor as any)?.full_name ?? "An investor",
        investorEmail: (investor as any)?.email ?? "",
        companyName: (room as any)?.startups?.company_name ?? "the startup",
        dealRoomUrl: `${APP_URL}/app/deal-room/${data.dealRoomId}`,
      });
      return sendEmail({ to: founder.users.email, subject, html, tags: [{ name: "type", value: "nda-signed" }] });
    } catch (e) { console.error("[triggers] NDA email failed:", e); return null; }
  });

export const triggerDecisionEmail = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as { dealRoomId: string; investorUserId: string; decision: "Invest" | "Hold" | "Pass"; note?: string })
  .handler(async ({ data }) => {
    try {
      const db = getServiceClient();
      const [{ data: investor }, { data: room }] = await Promise.all([
        db.from("users").select("full_name").eq("id", data.investorUserId).maybeSingle(),
        db.from("deal_rooms")
          .select("*, startups(company_name), deal_room_members(user_id, role, users(full_name, email))")
          .eq("id", data.dealRoomId).single(),
      ]);
      const members: any[] = (room as any)?.deal_room_members ?? [];
      const founder = members.find((m: any) => m.role === "founder");
      if (!founder?.users?.email) return null;
      const { subject, html } = investorDecisionEmail({
        founderName: founder.users.full_name ?? "the founder",
        investorName: (investor as any)?.full_name ?? "An investor",
        companyName: (room as any)?.startups?.company_name ?? "the startup",
        decision: data.decision,
        dealRoomUrl: `${APP_URL}/app/deal-room/${data.dealRoomId}`,
        note: data.note,
      });
      return sendEmail({ to: founder.users.email, subject, html, tags: [{ name: "type", value: "decision" }, { name: "decision", value: data.decision }] });
    } catch (e) { console.error("[triggers] Decision email failed:", e); return null; }
  });

export const triggerMeetingEmail = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as { dealRoomId: string; organizerUserId: string; meetingTitle: string; meetingDate: string; meetingLink?: string })
  .handler(async ({ data }) => {
    try {
      const db = getServiceClient();
      const { data: room } = await db.from("deal_rooms")
        .select("*, startups(company_name), deal_room_members(user_id, role, users(full_name, email))")
        .eq("id", data.dealRoomId).single();
      const members: any[] = (room as any)?.deal_room_members ?? [];
      const organizer = members.find((m: any) => m.user_id === data.organizerUserId);
      const organizerName = organizer?.users?.full_name ?? "Your contact";
      const recipients = members.filter((m: any) => m.user_id !== data.organizerUserId && m.users?.email);
      await Promise.all(recipients.map((m: any) => {
        const { subject, html } = meetingScheduledEmail({
          recipientName: m.users.full_name ?? "there",
          organizerName,
          companyName: (room as any)?.startups?.company_name ?? "the startup",
          meetingTitle: data.meetingTitle,
          meetingDate: data.meetingDate,
          meetingLink: data.meetingLink,
          dealRoomUrl: `${APP_URL}/app/deal-room/${data.dealRoomId}`,
        });
        return sendEmail({ to: m.users.email, subject, html, tags: [{ name: "type", value: "meeting-scheduled" }] });
      }));
    } catch (e) { console.error("[triggers] Meeting email failed:", e); }
  });

// ── Startup team invite ────────────────────────────────────────────────────

export const triggerStartupTeamInvite = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as {
    to: string;
    inviterName: string;
    companyName: string;
    role: string;
    token: string;
  })
  .handler(async ({ data }) => {
    const inviteLink = `${APP_URL}/join?token=${data.token}`;
    const { subject, html } = startupTeamInviteEmail({
      inviterName: data.inviterName,
      companyName: data.companyName,
      role: data.role,
      inviteLink,
    });
    return sendEmail({
      to: data.to,
      subject,
      html,
      tags: [{ name: "type", value: "startup-team-invite" }],
    });
  });

export const triggerDocumentUploadedEmail = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as { dealRoomId: string; documentName: string; uploaderUserId: string })
  .handler(async ({ data }) => {
    try {
      const db = getServiceClient();
      const { data: room } = await db.from("deal_rooms")
        .select("*, startups(company_name), deal_room_members(user_id, role, users(full_name, email))")
        .eq("id", data.dealRoomId).single();
      const members: any[] = (room as any)?.deal_room_members ?? [];
      const uploader = members.find((m: any) => m.user_id === data.uploaderUserId);
      const founderName = uploader?.users?.full_name ?? "the founder";
      const investors = members.filter((m: any) => m.role === "investor" && m.users?.email);
      await Promise.all(investors.map((inv: any) => {
        const { subject, html } = documentUploadedEmail({
          investorName: inv.users.full_name ?? "there",
          founderName,
          companyName: (room as any)?.startups?.company_name ?? "the startup",
          documentName: data.documentName,
          dealRoomUrl: `${APP_URL}/app/deal-room/${data.dealRoomId}`,
        });
        return sendEmail({ to: inv.users.email, subject, html, tags: [{ name: "type", value: "document-uploaded" }] });
      }));
    } catch (e) { console.error("[triggers] Document email failed:", e); }
  });
