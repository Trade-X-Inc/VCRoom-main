import { createAPIHandler } from "@tanstack/react-start/api";
import { sendEmail, APP_URL } from "@/lib/email/resend";
import * as T from "@/lib/email/templates";

const TEST_TO = "hello@hockystick.app";
const DEAL_URL = `${APP_URL}/app/deal-room/test-id`;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export default createAPIHandler({
  method: "GET",
  handler: async () => {
    const results: Record<string, string> = {};

    const templates = [
      { name: "welcome-founder",    ...T.welcomeEmail({ name: "Test User", role: "founder" }) },
      { name: "welcome-investor",   ...T.welcomeEmail({ name: "Test Investor", role: "investor" }) },
      { name: "deal-room-invite",   ...T.dealRoomInviteEmail({ investorName: "Test VC", founderName: "Jane Doe", companyName: "Acme Corp", inviteLink: `${APP_URL}/join/test-token`, companyStage: "Seed", companySector: "DevTools" }) },
      { name: "nda-signed",         ...T.ndaSignedEmail({ founderName: "Jane Doe", investorName: "John VC", investorEmail: "vc@fund.com", companyName: "Acme Corp", dealRoomUrl: DEAL_URL }) },
      { name: "decision-invest",    ...T.investorDecisionEmail({ founderName: "Jane Doe", investorName: "John VC", companyName: "Acme Corp", decision: "Invest", dealRoomUrl: DEAL_URL, note: "Love the team and traction." }) },
      { name: "decision-pass",      ...T.investorDecisionEmail({ founderName: "Jane Doe", investorName: "John VC", companyName: "Acme Corp", decision: "Pass", dealRoomUrl: DEAL_URL }) },
      { name: "new-message",        ...T.newMessageEmail({ recipientName: "Jane Doe", senderName: "John VC", companyName: "Acme Corp", messagePreview: "Hey, I had a look at the deck — really impressive traction numbers. Can we schedule a call?", dealRoomUrl: DEAL_URL }) },
      { name: "doc-uploaded",       ...T.documentUploadedEmail({ investorName: "John VC", founderName: "Jane Doe", companyName: "Acme Corp", documentName: "Q1 2026 Financials.xlsx", dealRoomUrl: DEAL_URL }) },
      { name: "meeting-scheduled",  ...T.meetingScheduledEmail({ recipientName: "John VC", organizerName: "Jane Doe", companyName: "Acme Corp", meetingTitle: "Partner Meeting", meetingDate: "Monday, June 2, 2026 at 2:00 PM", meetingLink: "https://meet.google.com/test", dealRoomUrl: DEAL_URL }) },
      { name: "activity-digest",    ...T.activityDigestEmail({ recipientName: "Jane Doe", companyName: "Acme Corp", activities: ["John VC signed the NDA", "John VC opened the pitch deck (3 times)", "John VC submitted a question in Q&A"], dealRoomUrl: DEAL_URL }) },
      { name: "referral-invite",    ...T.referralInviteEmail({ inviteeName: "New User", inviterName: "Jane Doe", role: "investor", inviteLink: `${APP_URL}/join/referral-token` }) },
      { name: "magic-link",         ...T.magicLinkEmail({ name: "Jane Doe", magicLink: `${APP_URL}/auth/callback?token=test` }) },
      { name: "feedback-request",   ...T.feedbackRequestEmail({ name: "Jane Doe", role: "founder" }) },
      { name: "team-invite",        ...T.teamInviteEmail({ inviteeName: "Partner", inviterName: "Jane Doe", fundName: "Acme Ventures", role: "Partner", inviteLink: `${APP_URL}/join/team-token` }) },
    ];

    for (const tmpl of templates) {
      try {
        await sendEmail({ to: TEST_TO, subject: `[TEST] ${tmpl.name}: ${tmpl.subject}`, html: tmpl.html });
        results[tmpl.name] = "sent";
      } catch (e: any) {
        results[tmpl.name] = `failed: ${e?.message}`;
      }
    }

    return json({ results, count: templates.length });
  },
});
