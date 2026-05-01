export type Stage = "New" | "Contacted" | "Replied" | "Meeting" | "Interested" | "Deal Room" | "Rejected";

export interface Lead {
  id: string;
  name: string;
  firm: string;
  stage: Stage;
  check: string;
  thesis: string;
  initials: string;
  hot?: boolean;
}

export const stages: Stage[] = ["New", "Contacted", "Replied", "Meeting", "Interested", "Deal Room", "Rejected"];

export const leads: Lead[] = [
  { id: "1", name: "Elena Park", firm: "Sequoia", stage: "New", check: "$2–5M", thesis: "AI infra", initials: "EP" },
  { id: "2", name: "Marcus Vale", firm: "a16z", stage: "Contacted", check: "$1–3M", thesis: "Dev tools", initials: "MV", hot: true },
  { id: "3", name: "Hana Ito", firm: "Index", stage: "Contacted", check: "$500k–2M", thesis: "Fintech", initials: "HI" },
  { id: "4", name: "Dmitri Roy", firm: "Accel", stage: "Replied", check: "$3M", thesis: "Vertical SaaS", initials: "DR" },
  { id: "5", name: "Priya Shah", firm: "Lightspeed", stage: "Replied", check: "$2M", thesis: "AI apps", initials: "PS", hot: true },
  { id: "6", name: "Noah Bell", firm: "Bessemer", stage: "Meeting", check: "$4M", thesis: "Cloud", initials: "NB" },
  { id: "7", name: "Ava Cole", firm: "Founders Fund", stage: "Meeting", check: "$5M", thesis: "Deep tech", initials: "AC" },
  { id: "8", name: "Liam Ortiz", firm: "Greylock", stage: "Interested", check: "$3M", thesis: "AI infra", initials: "LO", hot: true },
  { id: "9", name: "Sara Khan", firm: "NEA", stage: "Deal Room", check: "$5M", thesis: "Enterprise AI", initials: "SK" },
  { id: "10", name: "Tom Reid", firm: "Kleiner", stage: "Deal Room", check: "$4M", thesis: "Robotics", initials: "TR" },
  { id: "11", name: "Mia Chen", firm: "Spark", stage: "Rejected", check: "—", thesis: "Pass: stage", initials: "MC" },
];

export const stageColor: Record<Stage, string> = {
  New: "bg-muted-foreground/40",
  Contacted: "bg-foreground/40",
  Replied: "bg-brand",
  Meeting: "bg-violet",
  Interested: "bg-warning",
  "Deal Room": "bg-success",
  Rejected: "bg-destructive/70",
};

// ────────────────────────────────────────────────────────────
// Notifications
// ────────────────────────────────────────────────────────────
export type NotifKind = "deal" | "message" | "invite" | "system" | "ai";

export interface Notification {
  id: string;
  kind: NotifKind;
  title: string;
  body: string;
  time: string;
  unread?: boolean;
  actor?: string;
}

export const notifications: Notification[] = [
  { id: "n1", kind: "deal", title: "Sara Khan signed the NDA", body: "Atlas Robotics deal room · NEA", time: "2m ago", unread: true, actor: "SK" },
  { id: "n2", kind: "message", title: "New question in Q&A", body: "“Can you walk through your retention curve…”", time: "18m ago", unread: true, actor: "SK" },
  { id: "n3", kind: "ai", title: "AI brief ready", body: "3 stalled investors flagged for re-engagement.", time: "1h ago", unread: true },
  { id: "n4", kind: "invite", title: "Invite accepted", body: "Marcus Vale (a16z) joined the deal room.", time: "3h ago", actor: "MV" },
  { id: "n5", kind: "deal", title: "Document uploaded", body: "Cohort analysis v2.pdf — 1.2 MB", time: "yesterday" },
  { id: "n6", kind: "system", title: "Security check complete", body: "All documents are watermarked.", time: "2d ago" },
  { id: "n7", kind: "message", title: "Noah Bell scheduled a call", body: "Wed · 1:00 PM — Partner meeting", time: "2d ago", actor: "NB" },
];

// ────────────────────────────────────────────────────────────
// Audit log
// ────────────────────────────────────────────────────────────
export type AuditSeverity = "info" | "warn" | "critical";
export interface AuditEntry {
  id: string;
  actor: string;
  initials: string;
  action: string;
  target: string;
  category: "Auth" | "Document" | "Deal Room" | "Invite" | "Settings" | "AI";
  ip: string;
  time: string;
  severity: AuditSeverity;
}

export const auditLog: AuditEntry[] = [
  { id: "a1", actor: "Sara Khan", initials: "SK", action: "Signed NDA", target: "Atlas Robotics · Deal Room", category: "Deal Room", ip: "98.124.22.10", time: "2m ago", severity: "info" },
  { id: "a2", actor: "Sara Khan", initials: "SK", action: "Downloaded document", target: "Cohort analysis v2.pdf", category: "Document", ip: "98.124.22.10", time: "4m ago", severity: "info" },
  { id: "a3", actor: "Jordan Reeves", initials: "JR", action: "Invited investor", target: "marcus@a16z.com", category: "Invite", ip: "172.58.10.4", time: "1h ago", severity: "info" },
  { id: "a4", actor: "AI Advisor", initials: "AI", action: "Generated weekly brief", target: "Round summary", category: "AI", ip: "internal", time: "1h ago", severity: "info" },
  { id: "a5", actor: "Mei Tan", initials: "MT", action: "Updated cap table", target: "Cap table.xlsx", category: "Document", ip: "67.20.11.8", time: "3h ago", severity: "warn" },
  { id: "a6", actor: "Jordan Reeves", initials: "JR", action: "Changed deal room access", target: "Bessemer · view → review", category: "Settings", ip: "172.58.10.4", time: "yesterday", severity: "warn" },
  { id: "a7", actor: "Unknown", initials: "?", action: "Failed sign-in attempt", target: "jordan@atlas.ai", category: "Auth", ip: "45.201.83.119", time: "yesterday", severity: "critical" },
  { id: "a8", actor: "Marcus Vale", initials: "MV", action: "Accepted invite", target: "Atlas Robotics · Deal Room", category: "Invite", ip: "73.144.5.22", time: "2d ago", severity: "info" },
  { id: "a9", actor: "Jordan Reeves", initials: "JR", action: "Signed in", target: "Web · macOS · Safari", category: "Auth", ip: "172.58.10.4", time: "2d ago", severity: "info" },
];

// ────────────────────────────────────────────────────────────
// Team / Users
// ────────────────────────────────────────────────────────────
export type Role = "Owner" | "Admin" | "Member" | "Viewer";
export type MemberStatus = "Active" | "Pending" | "Suspended";
export interface Member {
  id: string;
  name: string;
  email: string;
  initials: string;
  role: Role;
  status: MemberStatus;
  lastActive: string;
}

export const members: Member[] = [
  { id: "u1", name: "Jordan Reeves", email: "jordan@atlas.ai", initials: "JR", role: "Owner", status: "Active", lastActive: "now" },
  { id: "u2", name: "Mei Tan", email: "mei@atlas.ai", initials: "MT", role: "Admin", status: "Active", lastActive: "12m ago" },
  { id: "u3", name: "Sam Cole", email: "sam@atlas.ai", initials: "SC", role: "Admin", status: "Active", lastActive: "1h ago" },
  { id: "u4", name: "Priya Shah", email: "priya@atlas.ai", initials: "PS", role: "Member", status: "Active", lastActive: "yesterday" },
  { id: "u5", name: "Alex Wong", email: "alex@atlas.ai", initials: "AW", role: "Viewer", status: "Active", lastActive: "3d ago" },
  { id: "u6", name: "Rina Patel", email: "rina@atlas.ai", initials: "RP", role: "Member", status: "Pending", lastActive: "—" },
];

// ────────────────────────────────────────────────────────────
// Invites
// ────────────────────────────────────────────────────────────
export type InviteStatus = "Pending" | "Accepted" | "Expired" | "Revoked";
export interface Invite {
  id: string;
  email: string;
  role: Role;
  scope: string;
  sentBy: string;
  sentAt: string;
  status: InviteStatus;
}

export const invites: Invite[] = [
  { id: "i1", email: "rina@atlas.ai", role: "Member", scope: "Workspace", sentBy: "Jordan Reeves", sentAt: "1h ago", status: "Pending" },
  { id: "i2", email: "noah@bessemer.vc", role: "Viewer", scope: "Atlas · Deal Room", sentBy: "Jordan Reeves", sentAt: "1d ago", status: "Pending" },
  { id: "i3", email: "marcus@a16z.com", role: "Viewer", scope: "Atlas · Deal Room", sentBy: "Jordan Reeves", sentAt: "2d ago", status: "Accepted" },
  { id: "i4", email: "elena@sequoia.com", role: "Viewer", scope: "Atlas · Deal Room", sentBy: "Jordan Reeves", sentAt: "5d ago", status: "Expired" },
  { id: "i5", email: "tom@kleiner.com", role: "Viewer", scope: "Atlas · Deal Room", sentBy: "Jordan Reeves", sentAt: "1w ago", status: "Revoked" },
];

// ────────────────────────────────────────────────────────────
// Pipeline (deals)
// ────────────────────────────────────────────────────────────
export type PipelineStage = "Sourced" | "Qualified" | "Pitched" | "Diligence" | "Term Sheet" | "Closed";
export const pipelineStages: PipelineStage[] = ["Sourced", "Qualified", "Pitched", "Diligence", "Term Sheet", "Closed"];

export interface Deal {
  id: string;
  firm: string;
  partner: string;
  initials: string;
  check: string;
  stage: PipelineStage;
  probability: number;
  lastTouch: string;
  signal?: "hot" | "stale";
  thesis: string;
}

export const deals: Deal[] = [
  { id: "d1", firm: "Sequoia", partner: "Elena Park", initials: "EP", check: "$5M", stage: "Sourced", probability: 10, lastTouch: "2d ago", thesis: "AI infra" },
  { id: "d2", firm: "Index", partner: "Hana Ito", initials: "HI", check: "$2M", stage: "Sourced", probability: 8, lastTouch: "5d ago", signal: "stale", thesis: "Fintech" },
  { id: "d3", firm: "a16z", partner: "Marcus Vale", initials: "MV", check: "$3M", stage: "Qualified", probability: 28, lastTouch: "1d ago", signal: "hot", thesis: "Dev tools" },
  { id: "d4", firm: "Accel", partner: "Dmitri Roy", initials: "DR", check: "$3M", stage: "Qualified", probability: 22, lastTouch: "3d ago", thesis: "Vertical SaaS" },
  { id: "d5", firm: "Lightspeed", partner: "Priya Shah", initials: "PS", check: "$2M", stage: "Pitched", probability: 40, lastTouch: "yesterday", signal: "hot", thesis: "AI apps" },
  { id: "d6", firm: "Bessemer", partner: "Noah Bell", initials: "NB", check: "$4M", stage: "Pitched", probability: 35, lastTouch: "2d ago", thesis: "Cloud" },
  { id: "d7", firm: "Founders Fund", partner: "Ava Cole", initials: "AC", check: "$5M", stage: "Diligence", probability: 55, lastTouch: "today", thesis: "Deep tech" },
  { id: "d8", firm: "Greylock", partner: "Liam Ortiz", initials: "LO", check: "$3M", stage: "Diligence", probability: 60, lastTouch: "today", signal: "hot", thesis: "AI infra" },
  { id: "d9", firm: "NEA", partner: "Sara Khan", initials: "SK", check: "$5M", stage: "Term Sheet", probability: 80, lastTouch: "1h ago", signal: "hot", thesis: "Enterprise AI" },
  { id: "d10", firm: "Kleiner", partner: "Tom Reid", initials: "TR", check: "$4M", stage: "Closed", probability: 100, lastTouch: "1w ago", thesis: "Robotics" },
];

// ────────────────────────────────────────────────────────────
// Due Diligence Checklist
// ────────────────────────────────────────────────────────────
export type DDStatus = "todo" | "in_progress" | "done" | "blocked";
export interface DDItem {
  id: string;
  category: "Legal" | "Financial" | "Technical" | "Commercial" | "Team";
  title: string;
  owner: string;
  ownerInitials: string;
  due: string;
  status: DDStatus;
}

export const ddChecklist: DDItem[] = [
  { id: "dd1", category: "Legal", title: "NDA executed by all parties", owner: "Mei Tan", ownerInitials: "MT", due: "Done", status: "done" },
  { id: "dd2", category: "Legal", title: "IP assignment agreements", owner: "Mei Tan", ownerInitials: "MT", due: "Done", status: "done" },
  { id: "dd3", category: "Legal", title: "Customer contracts review", owner: "Sam Cole", ownerInitials: "SC", due: "Fri", status: "in_progress" },
  { id: "dd4", category: "Legal", title: "Cap table verification", owner: "Jordan Reeves", ownerInitials: "JR", due: "Done", status: "done" },
  { id: "dd5", category: "Financial", title: "Revenue audit Q1–Q4", owner: "Jordan Reeves", ownerInitials: "JR", due: "Done", status: "done" },
  { id: "dd6", category: "Financial", title: "Cohort retention analysis", owner: "Mei Tan", ownerInitials: "MT", due: "Done", status: "done" },
  { id: "dd7", category: "Financial", title: "Forecast model 2026", owner: "Jordan Reeves", ownerInitials: "JR", due: "Mon", status: "in_progress" },
  { id: "dd8", category: "Financial", title: "Unit economics breakdown", owner: "Sam Cole", ownerInitials: "SC", due: "Wed", status: "todo" },
  { id: "dd9", category: "Technical", title: "Architecture review with NEA", owner: "Mei Tan", ownerInitials: "MT", due: "Done", status: "done" },
  { id: "dd10", category: "Technical", title: "Security & SOC2 audit", owner: "Sam Cole", ownerInitials: "SC", due: "Next week", status: "blocked" },
  { id: "dd11", category: "Technical", title: "Code quality review", owner: "Mei Tan", ownerInitials: "MT", due: "Thu", status: "todo" },
  { id: "dd12", category: "Commercial", title: "Customer reference calls (3)", owner: "Sam Cole", ownerInitials: "SC", due: "Fri", status: "in_progress" },
  { id: "dd13", category: "Commercial", title: "Competitive landscape memo", owner: "Jordan Reeves", ownerInitials: "JR", due: "Mon", status: "todo" },
  { id: "dd14", category: "Team", title: "Founder background checks", owner: "External", ownerInitials: "EX", due: "Done", status: "done" },
  { id: "dd15", category: "Team", title: "Key hire pipeline review", owner: "Jordan Reeves", ownerInitials: "JR", due: "Wed", status: "todo" },
];

// ────────────────────────────────────────────────────────────
// Deal Room Chat
// ────────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  author: string;
  initials: string;
  role: "Founder" | "Investor" | "Advisor";
  text: string;
  time: string;
  me?: boolean;
}

export const dealRoomChat: ChatMessage[] = [
  { id: "m1", author: "Sara Khan", initials: "SK", role: "Investor", text: "Reviewed the cohort doc — impressive net retention. Can we schedule a call with your top 2 customers this week?", time: "9:14 AM" },
  { id: "m2", author: "Jordan Reeves", initials: "JR", role: "Founder", text: "Absolutely. I'll line up Acme and Northstar for Wed/Thu. Sending Calendly invites in 5.", time: "9:18 AM", me: true },
  { id: "m3", author: "Mark Lin", initials: "ML", role: "Investor", text: "Quick one — what's your target gross margin at scale on the hardware side?", time: "9:22 AM" },
  { id: "m4", author: "Mei Tan", initials: "MT", role: "Founder", text: "Targeting 62% by Y3 as we move from contract manufacturing to in-house final assembly. BOM doc is in /Financials.", time: "9:30 AM", me: true },
  { id: "m5", author: "Sara Khan", initials: "SK", role: "Investor", text: "Perfect. Partner meeting Wed 1PM still on?", time: "9:31 AM" },
];

export const dealRoomMembers = [
  { name: "Jordan Reeves", initials: "JR", role: "Founder", online: true },
  { name: "Mei Tan", initials: "MT", role: "Founder", online: true },
  { name: "Sara Khan", initials: "SK", role: "Investor", online: true },
  { name: "Mark Lin", initials: "ML", role: "Investor", online: false },
  { name: "Tom Reid", initials: "TR", role: "Investor", online: false },
];

// ────────────────────────────────────────────────────────────
// Notification rule defaults
// ────────────────────────────────────────────────────────────
export interface NotifRule {
  id: string;
  group: "Deal activity" | "Documents" | "Messages" | "Team & invites" | "AI insights";
  label: string;
  description: string;
  email: boolean;
  inApp: boolean;
  push: boolean;
}

export const notifRulesDefault: NotifRule[] = [
  { id: "r1", group: "Deal activity", label: "Investor opened deal room", description: "Get notified when an investor first enters a room.", email: true, inApp: true, push: false },
  { id: "r2", group: "Deal activity", label: "NDA signed", description: "Legal milestone — high-signal event.", email: true, inApp: true, push: true },
  { id: "r3", group: "Deal activity", label: "Stage changed", description: "When a deal moves between pipeline stages.", email: false, inApp: true, push: false },
  { id: "r4", group: "Documents", label: "Document downloaded", description: "Track who downloads sensitive files.", email: false, inApp: true, push: false },
  { id: "r5", group: "Documents", label: "New document uploaded", description: "Workspace-wide upload notifications.", email: true, inApp: true, push: false },
  { id: "r6", group: "Messages", label: "New question in Q&A", description: "When an investor asks a question.", email: true, inApp: true, push: true },
  { id: "r7", group: "Messages", label: "Direct message", description: "1:1 messages from investors or team.", email: true, inApp: true, push: true },
  { id: "r8", group: "Team & invites", label: "Invite accepted", description: "When someone joins via invite link.", email: true, inApp: true, push: false },
  { id: "r9", group: "Team & invites", label: "New team member added", description: "Workspace membership changes.", email: true, inApp: true, push: false },
  { id: "r10", group: "AI insights", label: "Weekly AI brief", description: "Mondays at 9 AM — round summary.", email: true, inApp: false, push: false },
  { id: "r11", group: "AI insights", label: "Stalled investor flagged", description: "AI detects an at-risk relationship.", email: true, inApp: true, push: true },
];
