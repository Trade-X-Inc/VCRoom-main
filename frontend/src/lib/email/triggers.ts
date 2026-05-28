import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { sendEmail, APP_URL } from "./resend";
import * as T from "./templates";

function getSupabaseAdmin() {
  const url =
    (typeof process !== "undefined" && process.env.SUPABASE_URL) ||
    (globalThis as any).SUPABASE_URL ||
    "";
  const key =
    (typeof process !== "undefined" && process.env.SUPABASE_SERVICE_ROLE_KEY) ||
    (globalThis as any).SUPABASE_SERVICE_ROLE_KEY ||
    "";
  return createClient(url, key);
}

// ── 1. Welcome email — called after signup ────────────────────────

export const triggerWelcomeEmail = createServerFn({ method: "POST" })
  .inputValidator(
    (d: unknown) => d as { name: string; role: "founder" | "investor"; email: string },
  )
  .handler(async ({ data }) => {
    try {
      const { subject, html } = T.welcomeEmail({ name: data.name, role: data.role });
      await sendEmail({
        to: data.email,
        subject,
        html,
        tags: [
          { name: "type", value: "welcome" },
          { name: "role", value: data.role },
        ],
      });
    } catch (e) {
      console.error("Welcome email failed:", e);
    }
  });

// ── 2. NDA signed — fetches founder email server-side ────────────

export const triggerNdaSignedEmail = createServerFn({ method: "POST" })
  .inputValidator(
    (d: unknown) => d as { dealRoomId: string; investorUserId: string },
  )
  .handler(async ({ data }) => {
    try {
      const db = getSupabaseAdmin();
      const [{ data: investor }, { data: room }] = await Promise.all([
        db.from("users").select("full_name, email").eq("id", data.investorUserId).maybeSingle(),
        db
          .from("deal_rooms")
          .select("*, startups(company_name), deal_room_members(user_id, role, users(full_name, email))")
          .eq("id", data.dealRoomId)
          .single(),
      ]);

      const companyName = (room as any)?.startups?.company_name ?? "the startup";
      const members: any[] = (room as any)?.deal_room_members ?? [];
      const founderMember = members.find((m) => m.role === "founder");
      const founderName = founderMember?.users?.full_name ?? "the founder";
      const founderEmail = founderMember?.users?.email;
      if (!founderEmail) return;

      const { subject, html } = T.ndaSignedEmail({
        founderName,
        investorName: (investor as any)?.full_name ?? "An investor",
        investorEmail: (investor as any)?.email ?? "",
        companyName,
        dealRoomUrl: `${APP_URL}/app/deal-room/${data.dealRoomId}`,
      });
      await sendEmail({ to: founderEmail, subject, html, tags: [{ name: "type", value: "nda-signed" }] });
    } catch (e) {
      console.error("NDA signed email failed:", e);
    }
  });

// ── 3. Decision submitted — notifies founder ─────────────────────

export const triggerDecisionEmail = createServerFn({ method: "POST" })
  .inputValidator(
    (d: unknown) =>
      d as { dealRoomId: string; investorUserId: string; decision: "Invest" | "Hold" | "Pass"; note?: string },
  )
  .handler(async ({ data }) => {
    try {
      const db = getSupabaseAdmin();
      const [{ data: investor }, { data: room }] = await Promise.all([
        db.from("users").select("full_name").eq("id", data.investorUserId).maybeSingle(),
        db
          .from("deal_rooms")
          .select("*, startups(company_name), deal_room_members(user_id, role, users(full_name, email))")
          .eq("id", data.dealRoomId)
          .single(),
      ]);

      const companyName = (room as any)?.startups?.company_name ?? "the startup";
      const members: any[] = (room as any)?.deal_room_members ?? [];
      const founderMember = members.find((m) => m.role === "founder");
      const founderName = founderMember?.users?.full_name ?? "the founder";
      const founderEmail = founderMember?.users?.email;
      if (!founderEmail) return;

      const { subject, html } = T.investorDecisionEmail({
        founderName,
        investorName: (investor as any)?.full_name ?? "An investor",
        companyName,
        decision: data.decision,
        dealRoomUrl: `${APP_URL}/app/deal-room/${data.dealRoomId}`,
        note: data.note,
      });
      await sendEmail({
        to: founderEmail,
        subject,
        html,
        tags: [
          { name: "type", value: "decision" },
          { name: "decision", value: data.decision },
        ],
      });
    } catch (e) {
      console.error("Decision email failed:", e);
    }
  });

// ── 4. Document uploaded — notifies investors in deal room ───────

export const triggerDocumentUploadedEmail = createServerFn({ method: "POST" })
  .inputValidator(
    (d: unknown) => d as { dealRoomId: string; documentName: string; uploaderUserId: string },
  )
  .handler(async ({ data }) => {
    try {
      const db = getSupabaseAdmin();
      const { data: room } = await db
        .from("deal_rooms")
        .select("*, startups(company_name), deal_room_members(user_id, role, users(full_name, email))")
        .eq("id", data.dealRoomId)
        .single();

      const companyName = (room as any)?.startups?.company_name ?? "the startup";
      const members: any[] = (room as any)?.deal_room_members ?? [];
      const uploader = members.find((m) => m.user_id === data.uploaderUserId);
      const founderName = uploader?.users?.full_name ?? "the founder";
      const investors = members.filter((m) => m.role === "investor" && m.users?.email);

      await Promise.all(
        investors.map((inv) => {
          const { subject, html } = T.documentUploadedEmail({
            investorName: inv.users.full_name ?? "there",
            founderName,
            companyName,
            documentName: data.documentName,
            dealRoomUrl: `${APP_URL}/app/deal-room/${data.dealRoomId}`,
          });
          return sendEmail({ to: inv.users.email, subject, html, tags: [{ name: "type", value: "document-uploaded" }] });
        }),
      );
    } catch (e) {
      console.error("Document email failed:", e);
    }
  });

// ── 5. Meeting scheduled — notifies all deal room members ────────

export const triggerMeetingEmail = createServerFn({ method: "POST" })
  .inputValidator(
    (d: unknown) =>
      d as { dealRoomId: string; organizerUserId: string; meetingTitle: string; meetingDate: string; meetingLink?: string },
  )
  .handler(async ({ data }) => {
    try {
      const db = getSupabaseAdmin();
      const { data: room } = await db
        .from("deal_rooms")
        .select("*, startups(company_name), deal_room_members(user_id, role, users(full_name, email))")
        .eq("id", data.dealRoomId)
        .single();

      const companyName = (room as any)?.startups?.company_name ?? "the startup";
      const members: any[] = (room as any)?.deal_room_members ?? [];
      const organizer = members.find((m) => m.user_id === data.organizerUserId);
      const organizerName = organizer?.users?.full_name ?? "Your contact";
      const recipients = members.filter(
        (m) => m.user_id !== data.organizerUserId && m.users?.email,
      );

      await Promise.all(
        recipients.map((m) => {
          const { subject, html } = T.meetingScheduledEmail({
            recipientName: m.users.full_name ?? "there",
            organizerName,
            companyName,
            meetingTitle: data.meetingTitle,
            meetingDate: data.meetingDate,
            meetingLink: data.meetingLink,
            dealRoomUrl: `${APP_URL}/app/deal-room/${data.dealRoomId}`,
          });
          return sendEmail({ to: m.users.email, subject, html, tags: [{ name: "type", value: "meeting-scheduled" }] });
        }),
      );
    } catch (e) {
      console.error("Meeting email failed:", e);
    }
  });
