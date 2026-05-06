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
  email?: string;
  role?: string;
  location?: string;
  linkedin?: string;
  twitter?: string;
  bio?: string;
  portfolio?: string[];
  lastTouch?: string;
  nextStep?: string;
}

export const stages: Stage[] = ["New", "Contacted", "Replied", "Meeting", "Interested", "Deal Room", "Rejected"];

export const leads: Lead[] = [];

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

export const notifications: Notification[] = [];

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

export const auditLog: AuditEntry[] = [];

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

export const members: Member[] = [];

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

export const invites: Invite[] = [];

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

export const deals: Deal[] = [];

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

export const ddChecklist: DDItem[] = [];

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

export const dealRoomChat: ChatMessage[] = [];

export const dealRoomMembers: { name: string; initials: string; role: string; online: boolean }[] = [];

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
