function baseLayout(content: string, previewText = "") {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<title>Hockystick</title>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; color: #09090b; }
  .wrapper { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
  .card { background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  .header { background: #0a0a0b; padding: 28px 32px; text-align: center; }
  .logo { font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px; }
  .logo-dot { color: #7c3aed; }
  .body { padding: 32px; }
  .footer { padding: 24px 32px; text-align: center; background: #fafafa; border-top: 1px solid #e4e4e7; }
  .footer p { color: #71717a; font-size: 12px; line-height: 1.6; }
  .btn { display: inline-block; padding: 12px 28px; background: #7c3aed; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 20px 0; }
  .btn-outline { background: transparent; color: #7c3aed !important; border: 1.5px solid #7c3aed; }
  h1 { font-size: 24px; font-weight: 700; color: #09090b; letter-spacing: -0.5px; margin-bottom: 12px; line-height: 1.3; }
  h2 { font-size: 18px; font-weight: 600; color: #09090b; margin: 20px 0 8px; }
  p { color: #3f3f46; font-size: 15px; line-height: 1.7; margin-bottom: 16px; }
  .highlight { background: #f5f3ff; border-left: 3px solid #7c3aed; padding: 12px 16px; border-radius: 0 6px 6px 0; margin: 20px 0; }
  .highlight p { margin: 0; color: #4c1d95; font-weight: 500; }
  .divider { height: 1px; background: #e4e4e7; margin: 24px 0; }
  .meta { font-size: 13px; color: #71717a; }
  .tag { display: inline-block; padding: 3px 10px; background: #f5f3ff; color: #7c3aed; border-radius: 99px; font-size: 12px; font-weight: 600; }
  ul { padding-left: 20px; margin: 12px 0; }
  li { color: #3f3f46; font-size: 15px; line-height: 1.8; }
  .center { text-align: center; }
  .badge { display: inline-block; padding: 4px 12px; background: #dcfce7; color: #166534; border-radius: 99px; font-size: 12px; font-weight: 600; margin-bottom: 16px; }
</style>
</head>
<body>
${previewText ? `<div style="display:none;max-height:0;overflow:hidden;">${previewText}</div>` : ""}
<div class="wrapper">
  <div class="card">
    <div class="header">
      <div class="logo">Hocky<span class="logo-dot">stick</span></div>
      <div style="color:#a1a1aa;font-size:12px;margin-top:4px;">Where deals get done</div>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>Hockystick · <a href="https://hockystick.app" style="color:#7c3aed;">hockystick.app</a></p>
      <p style="margin-top:8px;">You're receiving this because you have an account on Hockystick.</p>
      <p style="margin-top:4px;"><a href="https://hockystick.app/app/settings" style="color:#7c3aed;">Manage notifications</a> · <a href="https://hockystick.app/unsubscribe" style="color:#7c3aed;">Unsubscribe</a></p>
    </div>
  </div>
</div>
</body>
</html>`;
}

// 1. WELCOME
export function welcomeEmail({ name, role }: { name: string; role: "founder" | "investor" }) {
  const founderContent = `
    <div class="badge">🎉 Founding Member</div>
    <h1>Welcome to Hockystick, ${name}.</h1>
    <p>You've joined at exactly the right time. Hockystick is in beta — which means you get full access to every feature, completely free.</p>
    <div class="highlight"><p>As a founding member, you'll lock in 50% off when we launch paid plans. That's our promise.</p></div>
    <h2>Get started in 3 steps:</h2>
    <ul>
      <li>Complete your company profile (takes 2 minutes)</li>
      <li>Upload your pitch deck to your document vault</li>
      <li>Create your first deal room and invite an investor</li>
    </ul>
    <div class="center"><a href="https://hockystick.app/app" class="btn">Open your dashboard →</a></div>
    <div class="divider"></div>
    <p class="meta">Questions? Reply to this email — a real human will respond.</p>
  `;
  const investorContent = `
    <div class="badge">🎉 Founding Member</div>
    <h1>Welcome to Hockystick, ${name}.</h1>
    <p>You're in. Hockystick is in beta and you have full access to every investor tool — AI analysis, thesis-match scoring, deal flow pipeline, and more.</p>
    <div class="highlight"><p>Founding investors lock in 50% off when paid plans launch. No action needed — it's automatic.</p></div>
    <h2>Start in 3 steps:</h2>
    <ul>
      <li>Set up your investment thesis and check size</li>
      <li>Add companies to your watchlist</li>
      <li>Run your first AI analysis on any startup</li>
    </ul>
    <div class="center"><a href="https://hockystick.app/app/investor/" class="btn">Open your dashboard →</a></div>
    <div class="divider"></div>
    <p class="meta">Questions? Reply to this email — a real human will respond.</p>
  `;
  return {
    subject: `Welcome to Hockystick, ${name} — you're in.`,
    html: baseLayout(
      role === "founder" ? founderContent : investorContent,
      "Your deal room is ready. Full access, free during beta.",
    ),
  };
}

// 2. DEAL ROOM INVITE
export function dealRoomInviteEmail({
  investorName,
  founderName,
  companyName,
  inviteLink,
  companyStage,
  companySector,
}: {
  investorName: string;
  founderName: string;
  companyName: string;
  inviteLink: string;
  companyStage?: string;
  companySector?: string;
}) {
  const meta = [companyName, companyStage, companySector].filter(Boolean).join(" · ");
  const content = `
    <h1>${founderName} invited you to a deal room.</h1>
    <p>You've been invited to review <strong>${companyName}</strong> on Hockystick — a private, encrypted deal room where you can access their documents, run due diligence, and make an investment decision.</p>
    <div class="highlight"><p>📋 ${meta}</p></div>
    <p>Inside the deal room you'll find:</p>
    <ul>
      <li>NDA to sign before accessing documents</li>
      <li>Pitch deck and financial documents</li>
      <li>Q&amp;A channel with the founder</li>
      <li>AI-powered due diligence workstation</li>
    </ul>
    <div class="center"><a href="${inviteLink}" class="btn">Enter deal room →</a></div>
    <p class="meta center">This invite expires in 7 days. If you have questions, reply to this email.</p>
  `;
  return {
    subject: `${founderName} invited you to review ${companyName} on Hockystick`,
    html: baseLayout(content, `${companyName} deal room is ready for your review.`),
  };
}

// 3. NDA SIGNED
export function ndaSignedEmail({
  founderName,
  investorName,
  investorEmail,
  companyName,
  dealRoomUrl,
}: {
  founderName: string;
  investorName: string;
  investorEmail: string;
  companyName: string;
  dealRoomUrl: string;
}) {
  const content = `
    <h1>An investor signed your NDA.</h1>
    <p><strong>${investorName}</strong> (${investorEmail}) has signed the NDA and now has access to your ${companyName} deal room.</p>
    <div class="highlight"><p>🔓 They can now view your documents and begin due diligence.</p></div>
    <p>This is a strong signal of interest. Make sure your key documents are uploaded and up to date.</p>
    <div class="center"><a href="${dealRoomUrl}" class="btn">View your deal room →</a></div>
  `;
  return {
    subject: `${investorName} signed your NDA — they're reviewing ${companyName}`,
    html: baseLayout(content, `${investorName} is now inside your deal room.`),
  };
}

// 4. INVESTOR DECISION
export function investorDecisionEmail({
  founderName,
  investorName,
  companyName,
  decision,
  dealRoomUrl,
  note,
}: {
  founderName: string;
  investorName: string;
  companyName: string;
  decision: "Invest" | "Hold" | "Pass";
  dealRoomUrl: string;
  note?: string;
}) {
  const cfg = {
    Invest: { emoji: "🎉", color: "#166534", bg: "#dcfce7", text: "wants to invest" },
    Hold:   { emoji: "⏸️", color: "#92400e", bg: "#fef3c7", text: "is on hold" },
    Pass:   { emoji: "❌", color: "#991b1b", bg: "#fee2e2", text: "passed" },
  }[decision];
  const content = `
    <h1>${investorName} made a decision on ${companyName}.</h1>
    <div style="background:${cfg.bg};border-radius:8px;padding:16px 20px;margin:20px 0;text-align:center;">
      <span style="font-size:32px;">${cfg.emoji}</span>
      <p style="color:${cfg.color};font-weight:700;font-size:18px;margin:8px 0 0;">${investorName} ${cfg.text}</p>
    </div>
    ${note ? `<div class="highlight"><p><strong>Their note:</strong> "${note}"</p></div>` : ""}
    <div class="center"><a href="${dealRoomUrl}" class="btn">View deal room →</a></div>
    ${decision === "Invest" ? `<p class="meta center">Next step: discuss term sheet details in your deal room.</p>` : ""}
    ${decision === "Pass" ? `<p class="meta center">Don't get discouraged — use the feedback to strengthen your next pitch.</p>` : ""}
  `;
  return {
    subject: `${investorName} ${cfg.text} in ${companyName}`,
    html: baseLayout(content, `Investment decision received from ${investorName}.`),
  };
}

// 5. NEW MESSAGE
export function newMessageEmail({
  recipientName,
  senderName,
  companyName,
  messagePreview,
  dealRoomUrl,
}: {
  recipientName: string;
  senderName: string;
  companyName: string;
  messagePreview: string;
  dealRoomUrl: string;
}) {
  const preview = messagePreview.slice(0, 200) + (messagePreview.length > 200 ? "..." : "");
  const content = `
    <h1>New message in your deal room.</h1>
    <p><strong>${senderName}</strong> sent a message in the <strong>${companyName}</strong> deal room:</p>
    <div class="highlight"><p>"${preview}"</p></div>
    <div class="center"><a href="${dealRoomUrl}?tab=chat" class="btn">Reply →</a></div>
  `;
  return {
    subject: `${senderName} sent a message in ${companyName} deal room`,
    html: baseLayout(content, `New message from ${senderName}.`),
  };
}

// 6. DOCUMENT UPLOADED
export function documentUploadedEmail({
  investorName,
  founderName,
  companyName,
  documentName,
  dealRoomUrl,
}: {
  investorName: string;
  founderName: string;
  companyName: string;
  documentName: string;
  dealRoomUrl: string;
}) {
  const content = `
    <h1>${companyName} uploaded a new document.</h1>
    <p><strong>${founderName}</strong> has added a new document to the deal room: <strong>${documentName}</strong></p>
    <div class="center"><a href="${dealRoomUrl}?tab=documents" class="btn">View document →</a></div>
  `;
  return {
    subject: `New document in ${companyName} deal room: ${documentName}`,
    html: baseLayout(content, `${companyName} added ${documentName} to your deal room.`),
  };
}

// 7. MEETING SCHEDULED
export function meetingScheduledEmail({
  recipientName,
  organizerName,
  companyName,
  meetingTitle,
  meetingDate,
  meetingLink,
  dealRoomUrl,
}: {
  recipientName: string;
  organizerName: string;
  companyName: string;
  meetingTitle: string;
  meetingDate: string;
  meetingLink?: string;
  dealRoomUrl: string;
}) {
  const content = `
    <h1>Meeting scheduled: ${meetingTitle}</h1>
    <p><strong>${organizerName}</strong> scheduled a meeting for <strong>${companyName}</strong>.</p>
    <div class="highlight">
      <p>📅 <strong>${meetingDate}</strong></p>
      ${meetingLink ? `<p style="margin-top:8px;">🔗 <a href="${meetingLink}" style="color:#7c3aed;">${meetingLink}</a></p>` : ""}
    </div>
    <div class="center"><a href="${dealRoomUrl}?tab=meetings" class="btn">View meeting details →</a></div>
  `;
  return {
    subject: `Meeting scheduled: ${meetingTitle} — ${companyName}`,
    html: baseLayout(content, `${organizerName} scheduled a meeting with you.`),
  };
}

// 8. ACTIVITY DIGEST
export function activityDigestEmail({
  recipientName,
  companyName,
  activities,
  dealRoomUrl,
}: {
  recipientName: string;
  companyName: string;
  activities: string[];
  dealRoomUrl: string;
}) {
  const items = activities.map((a) => `<li>${a}</li>`).join("");
  const content = `
    <h1>What's happening in ${companyName}.</h1>
    <p>Here's a summary of recent activity in your deal room:</p>
    <ul>${items}</ul>
    <div class="center"><a href="${dealRoomUrl}" class="btn">View deal room →</a></div>
  `;
  return {
    subject: `Activity update: ${companyName} deal room`,
    html: baseLayout(content, `${activities.length} updates in your ${companyName} deal room.`),
  };
}

// 9. REFERRAL INVITE
export function referralInviteEmail({
  inviteeName,
  inviterName,
  role,
  inviteLink,
}: {
  inviteeName: string;
  inviterName: string;
  role: "founder" | "investor";
  inviteLink: string;
}) {
  const content = `
    <h1>${inviterName} invited you to Hockystick.</h1>
    <p>${inviterName} thinks you'd find Hockystick useful — it's the private deal room where founders and investors close deals without the chaos.</p>
    <div class="highlight"><p>🎁 Because you were invited, you get <strong>3 extra AI analyses free</strong> when you join.</p></div>
    <p>Hockystick is currently in beta — ${role === "founder" ? "founders" : "investors"} get full access to every feature, completely free.</p>
    <div class="center"><a href="${inviteLink}" class="btn">Accept invitation →</a></div>
    <p class="meta center">This invitation expires in 14 days.</p>
  `;
  return {
    subject: `${inviterName} invited you to Hockystick — free during beta`,
    html: baseLayout(content, "You've been invited to the deal platform where trust gets built."),
  };
}

// 10. MAGIC LINK
export function magicLinkEmail({ name, magicLink }: { name: string; magicLink: string }) {
  const content = `
    <h1>Your sign-in link.</h1>
    <p>Hi ${name}, here's your sign-in link for Hockystick. This link expires in 1 hour.</p>
    <div class="center"><a href="${magicLink}" class="btn">Sign in to Hockystick →</a></div>
    <p class="meta center">If you didn't request this, you can safely ignore this email.</p>
  `;
  return {
    subject: "Your Hockystick sign-in link",
    html: baseLayout(content, "Click to sign in to Hockystick."),
  };
}

// 11. BETA FEEDBACK REQUEST
export function feedbackRequestEmail({ name, role }: { name: string; role: "founder" | "investor" }) {
  const content = `
    <h1>How's Hockystick working for you?</h1>
    <p>Hi ${name}, you've been using Hockystick for a week. We're in beta and your feedback directly shapes the product.</p>
    <p>What would you like us to build next? What's broken? What's working?</p>
    <p>Just reply to this email — we read every response personally.</p>
    <div class="center"><a href="mailto:hello@hockystick.app?subject=Feedback%20from%20${encodeURIComponent(name)}" class="btn">Send feedback →</a></div>
    <div class="divider"></div>
    <p class="meta">PS — If you're finding Hockystick useful, sharing it with ${role === "founder" ? "investors you know" : "founders raising capital"} helps us grow. Thank you.</p>
  `;
  return {
    subject: "Quick question about your Hockystick experience",
    html: baseLayout(content, "We'd love to hear how it's going."),
  };
}

// 12. TEAM INVITE (investor fund team — legacy)
export function teamInviteEmail({
  inviteeName,
  inviterName,
  fundName,
  role,
  inviteLink,
}: {
  inviteeName: string;
  inviterName: string;
  fundName: string;
  role: string;
  inviteLink: string;
}) {
  const content = `
    <h1>${inviterName} added you to ${fundName} on Hockystick.</h1>
    <p>You've been added as <strong>${role}</strong> on the ${fundName} team on Hockystick.</p>
    <p>You'll have access to the team's deal flow, due diligence workstation, AI analysis tools, and portfolio tracking.</p>
    <div class="center"><a href="${inviteLink}" class="btn">Join your team →</a></div>
  `;
  return {
    subject: `You've been added to ${fundName} on Hockystick`,
    html: baseLayout(content, `${inviterName} added you to ${fundName}.`),
  };
}

// 13. STARTUP TEAM INVITE
const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: "As an Admin, you have access to all platform features including deal rooms, documents, pipeline, and team management.",
  manager: "As a Manager, you can access deal rooms, documents, and pipeline that you are assigned to.",
  analyst: "As an Analyst, you can review documents and run due diligence analysis on assigned deal rooms.",
  viewer: "As a Viewer, you can read documents in deal rooms you are assigned to.",
};

export function startupTeamInviteEmail({
  inviterName,
  companyName,
  role,
  inviteLink,
}: {
  inviterName: string;
  companyName: string;
  role: string;
  inviteLink: string;
}) {
  const roleDesc = ROLE_DESCRIPTIONS[role.toLowerCase()] ?? `You will have access to ${companyName}'s workspace on Hockystick.`;
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
  const content = `
    <h2>You have been invited to join ${companyName}.</h2>
    <p>${inviterName} has invited you to join <strong>${companyName}</strong> as a <strong>${roleLabel}</strong> on Hockystick.</p>
    <div class="highlight"><p>${roleDesc}</p></div>
    <div class="center"><a href="${inviteLink}" class="btn">Accept invitation →</a></div>
    <p class="meta center">This invitation expires in 7 days. If you did not expect this invitation, you can ignore this email.</p>
  `;
  return {
    subject: `You've been invited to join ${companyName} on Hockystick`,
    html: baseLayout(content, `${inviterName} invited you to join ${companyName}.`),
  };
}

// R14B — lawyer / legal counsel invite. Room-scoped only: this account
// never joins any fund or company's Team page, only this one deal room's
// Investment Terms stage.
export function lawyerInviteEmail({
  inviterName,
  companyName,
  side,
  inviteLink,
}: {
  inviterName: string;
  companyName: string;
  side: "founder" | "investor";
  inviteLink: string;
}) {
  const content = `
    <h2>You've been invited as Legal Counsel.</h2>
    <p>${inviterName} has invited you to represent the ${side === "founder" ? "founder" : "investor"} side of the <strong>${companyName}</strong> deal room on Hockystick.</p>
    <div class="highlight"><p>Access is scoped to this deal room's Investment Terms stage only — the deal summary, term sheet, the Investment Terms meeting, and its records. You will not see earlier-stage documents, diligence, or private notes.</p></div>
    <p>You'll be asked to sign the room's NDA when you join, same as any other participant.</p>
    <div class="center"><a href="${inviteLink}" class="btn">Accept invitation →</a></div>
    <p class="meta center">This invitation expires in 7 days. If you did not expect this invitation, you can ignore this email.</p>
  `;
  return {
    subject: `${inviterName} invited you as Legal Counsel — ${companyName}`,
    html: baseLayout(content, `${inviterName} invited you as Legal Counsel for ${companyName}.`),
  };
}
