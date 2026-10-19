// Pure rules for outbound email and CRM writes. No server, router or database imports, so these are unit-tested
// in plain Node (tests/email-lockdown.spec.ts).
//
// Policy letters (CLAUDE.md §20.23):
//   A  a signed-in user acting on their OWN email only (recipient = the verified session's email)
//   B  a signed-in user; recipients are derived server-side from a membership or deal-room record the caller is
//      authorised for. Reports, updates and notifications go ONLY to existing platform members of the same
//      organisation or deal room, never to a free-form address from a request.
//   C  public form (waitlist, contact, demo request): strict validation, length caps, fixed property allow-list
//   D  internal only, not callable from a client
//   E  invite emails, the ONLY emails allowed to reach a non-member address: the sender is an authenticated member
//      authorised for that team or deal room; the recipient is read from the invite record created server-side;
//      a resend needs a minimum interval; the invitee must confirm that exact email at acceptance.

export type Result<T> =
  { ok: true; value: T } | { ok: false; error: "invalid_input" };

export const LIMITS = {
  email: 254,
  name: 120,
  company: 160,
  reason: 80,
  message: 2000,
  slot: 40,
  documentName: 200,
  inviteMessage: 500,
} as const;

// Deliberately simple and strict: one @, no whitespace, no angle brackets or quotes, a dotted domain with a
// letters-only TLD of 2 or more characters.
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"']+@[^\s@<>()[\]\\,;:"']+\.[A-Za-z]{2,}$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidEmail(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= LIMITS.email &&
    EMAIL_RE.test(value)
  );
}
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/** Remove control characters (CR, LF, NUL and the rest) and trim. */
export function cleanText(value: string): string {
  return (
    value
      // eslint-disable-next-line no-control-regex -- stripping control characters is the point
      .replace(/[\u0000-\u001f\u007f]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** True when `raw` is a plain object whose keys are all in `allowed`. Unknown keys are refused, never ignored. */
export function hasOnlyKeys(
  raw: unknown,
  allowed: readonly string[],
): raw is Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  return Object.keys(raw).every((k) => allowed.includes(k));
}

const bad = { ok: false, error: "invalid_input" } as const;

function text(raw: unknown, max: number, required: boolean): string | null {
  if (raw === undefined || raw === null || raw === "")
    return required ? null : "";
  if (typeof raw !== "string" || raw.length > max) return null;
  const v = cleanText(raw);
  if (required && v === "") return null;
  return v;
}

// ── Public forms (policy C) ───────────────────────────────────────────────────────────────────────

export const WAITLIST_SOURCES = [
  "sign-up page",
  "footer newsletter",
  "popup",
] as const;
export type WaitlistSource = (typeof WAITLIST_SOURCES)[number];
export type WaitlistInput = {
  email: string;
  name: string;
  role: "founder" | "investor" | "";
  source: WaitlistSource;
};

export function parseWaitlistInput(raw: unknown): Result<WaitlistInput> {
  if (!hasOnlyKeys(raw, ["email", "name", "role", "source"])) return bad;
  if (!isValidEmail(raw.email)) return bad;
  const name = text(raw.name, LIMITS.name, false);
  if (name === null) return bad;
  const role = raw.role ?? "";
  if (role !== "" && role !== "founder" && role !== "investor") return bad;
  if (!WAITLIST_SOURCES.includes(raw.source as WaitlistSource)) return bad;
  return {
    ok: true,
    value: {
      email: raw.email.toLowerCase(),
      name,
      role,
      source: raw.source as WaitlistSource,
    },
  };
}

export type ContactInput = {
  email: string;
  name: string;
  company: string;
  reason: string;
  message: string;
};

export function parseContactInput(raw: unknown): Result<ContactInput> {
  if (!hasOnlyKeys(raw, ["email", "name", "company", "reason", "message"]))
    return bad;
  if (!isValidEmail(raw.email)) return bad;
  const name = text(raw.name, LIMITS.name, true);
  const company = text(raw.company, LIMITS.company, false);
  const reason = text(raw.reason, LIMITS.reason, true);
  const message = text(raw.message, LIMITS.message, false);
  if (name === null || company === null || reason === null || message === null)
    return bad;
  return {
    ok: true,
    value: { email: raw.email.toLowerCase(), name, company, reason, message },
  };
}

export const DEMO_SLOTS = [
  "Morning (Gulf time)",
  "Afternoon (Gulf time)",
  "Evening (Gulf time)",
] as const;
export type DemoInput = {
  email: string;
  name: string;
  company: string;
  slot: (typeof DEMO_SLOTS)[number];
};

export function parseDemoInput(raw: unknown): Result<DemoInput> {
  if (!hasOnlyKeys(raw, ["email", "name", "company", "slot"])) return bad;
  if (!isValidEmail(raw.email)) return bad;
  const name = text(raw.name, LIMITS.name, true);
  const company = text(raw.company, LIMITS.company, false);
  if (name === null || company === null) return bad;
  if (!DEMO_SLOTS.includes(raw.slot as (typeof DEMO_SLOTS)[number])) return bad;
  return {
    ok: true,
    value: {
      email: raw.email.toLowerCase(),
      name,
      company,
      slot: raw.slot as (typeof DEMO_SLOTS)[number],
    },
  };
}

export function splitName(name: string): {
  firstname: string;
  lastname: string;
} {
  const [first, ...rest] = cleanText(name).split(" ");
  return { firstname: first ?? "", lastname: rest.join(" ") };
}

// ── HubSpot property allow-list ────────────────────────────────────────────────────────────────────
// No caller ever supplies a property map. Every write is built from the fixed builders below and then passed
// through sanitizeHubspotProps, which drops anything not on this list.

export const HUBSPOT_ALLOWED_PROPERTIES: ReadonlySet<string> = new Set([
  "firstname",
  "lastname",
  "company",
  "lifecyclestage",
  "hs_lead_status",
  "user_type",
  "platform_signup_date",
  "deal_room_created",
  "message",
]);

export function sanitizeHubspotProps(
  props: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(props)) {
    if (HUBSPOT_ALLOWED_PROPERTIES.has(k) && typeof v === "string")
      out[k] = v.slice(0, LIMITS.message);
  }
  return out;
}

export function waitlistHubspotProps(v: WaitlistInput): Record<string, string> {
  return sanitizeHubspotProps({
    ...splitName(v.name),
    lifecyclestage: "lead",
    hs_lead_status: "NEW",
    ...(v.role
      ? { user_type: v.role === "founder" ? "Founder" : "Investor" }
      : {}),
  });
}
export function contactHubspotProps(v: ContactInput): Record<string, string> {
  return sanitizeHubspotProps({
    ...splitName(v.name),
    company: v.company,
    lifecyclestage: "lead",
    hs_lead_status: "NEW",
    message: `[${v.reason}] ${v.message}`.trim(),
  });
}
export function demoHubspotProps(v: DemoInput): Record<string, string> {
  return sanitizeHubspotProps({
    ...splitName(v.name),
    company: v.company,
    lifecyclestage: "lead",
    hs_lead_status: "NEW",
    message: `[Book a product demo] Requested slot: ${v.slot}`,
  });
}

export const OWN_SYNC_KINDS = ["account_created", "deal_room_created"] as const;
export type OwnSyncKind = (typeof OWN_SYNC_KINDS)[number];

export function ownContactHubspotProps(
  kind: OwnSyncKind,
  who: { fullName: string; role: "founder" | "investor"; today: string },
): Record<string, string> {
  if (kind === "account_created") {
    return sanitizeHubspotProps({
      ...splitName(who.fullName),
      lifecyclestage: "lead",
      hs_lead_status: "NEW",
      user_type: who.role === "founder" ? "Founder" : "Investor",
      platform_signup_date: who.today,
    });
  }
  return sanitizeHubspotProps({
    lifecyclestage: "marketingqualifiedlead",
    deal_room_created: "true",
  });
}

// ── Recipients from membership (policy B) ──────────────────────────────────────────────────────────

export type MemberRecipient = {
  user_id: string;
  role: string;
  email?: string | null;
  full_name?: string | null;
};

/** Existing members with an address, excluding the sender, optionally limited to some roles. */
export function selectMemberRecipients<M extends MemberRecipient>(
  members: readonly M[],
  opts: { excludeUserId?: string; roles?: readonly string[] } = {},
): M[] {
  return members.filter(
    (m) =>
      isValidEmail(m.email) &&
      m.user_id !== opts.excludeUserId &&
      (!opts.roles || opts.roles.includes(m.role)),
  );
}

/**
 * For reports and updates: every requested address must belong to an existing member. If any does not, nothing is
 * sent. There is no path from a request to a non-member address.
 */
export function requireMemberAddresses<M extends MemberRecipient>(
  requested: readonly string[],
  members: readonly M[],
):
  { ok: true; recipients: M[] } | { ok: false; error: "recipient_not_member" } {
  const byEmail = new Map(
    members
      .filter((m) => isValidEmail(m.email))
      .map((m) => [String(m.email).toLowerCase(), m] as const),
  );
  const recipients: M[] = [];
  for (const addr of requested) {
    const m =
      typeof addr === "string" ? byEmail.get(addr.toLowerCase()) : undefined;
    if (!m) return { ok: false, error: "recipient_not_member" };
    recipients.push(m);
  }
  return { ok: true, recipients };
}

// ── Invites (policy E) ──────────────────────────────────────────────────────────────────────────────

export const MIN_RESEND_INTERVAL_MS = 10 * 60 * 1000;

export type InviteRecord = {
  invited_by: string | null;
  email: string | null;
  accepted_at: string | null;
  expires_at: string | null;
};

export type InviteCheck =
  | { ok: true }
  | { ok: false; error: "not_found" | "invite_closed" | "too_soon" };

/**
 * The caller must be the member who created the invite record, and the record must still be open. A caller who
 * did not create it gets not_found, the same answer as a record that does not exist.
 */
export function checkInviteSendable(
  invite: InviteRecord | null | undefined,
  callerUid: string,
  lastSentIso: string | null,
  nowMs: number,
): InviteCheck {
  if (
    !invite ||
    !invite.invited_by ||
    invite.invited_by !== callerUid ||
    !isValidEmail(invite.email)
  ) {
    return { ok: false, error: "not_found" };
  }
  if (invite.accepted_at) return { ok: false, error: "invite_closed" };
  if (invite.expires_at && Date.parse(invite.expires_at) < nowMs)
    return { ok: false, error: "invite_closed" };
  if (lastSentIso && nowMs - Date.parse(lastSentIso) < MIN_RESEND_INTERVAL_MS) {
    return { ok: false, error: "too_soon" };
  }
  return { ok: true };
}

// ── Admin bulk CRM sync (/api/hubspot-sync, admin key required) ─────────────────────────────────────

export const MAX_BULK_SYNC_USERS = 50;
export type BulkSyncRow = {
  email: string;
  firstname: string;
  lastname: string;
  role: "founder" | "investor";
  created: string;
};

export function parseBulkSyncInput(
  raw: unknown,
): Result<{ users: BulkSyncRow[] }> {
  if (!hasOnlyKeys(raw, ["users"]) || !Array.isArray(raw.users)) return bad;
  if (raw.users.length < 1 || raw.users.length > MAX_BULK_SYNC_USERS)
    return bad;
  const users: BulkSyncRow[] = [];
  for (const u of raw.users) {
    if (!hasOnlyKeys(u, ["email", "firstname", "lastname", "role", "created"]))
      return bad;
    if (!isValidEmail(u.email)) return bad;
    const first = text(u.firstname, LIMITS.name, false);
    const last = text(u.lastname, LIMITS.name, false);
    if (first === null || last === null) return bad;
    if (u.role !== "founder" && u.role !== "investor") return bad;
    if (typeof u.created !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(u.created))
      return bad;
    users.push({
      email: u.email.toLowerCase(),
      firstname: first,
      lastname: last,
      role: u.role,
      created: u.created,
    });
  }
  return { ok: true, value: { users } };
}
