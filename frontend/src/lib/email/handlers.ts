/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from an untyped service/user Supabase client; every field is validated before use */
import { createClient } from "@supabase/supabase-js";
import type { SessionIdentity } from "@/lib/require-user-fn";
import { sendEmailWith, type MailerConfig, type OutboundEmail } from "./resend";
import { upsertContactWith } from "@/lib/hubspot";
import type { ProviderEnv } from "./server-env";
import {
  welcomeEmail,
  ndaSignedEmail,
  documentUploadedEmail,
  startupTeamInviteEmail,
  lawyerInviteEmail,
  dealRoomInviteEmail,
} from "./templates";
import {
  LIMITS,
  MIN_RESEND_INTERVAL_MS,
  checkInviteSendable,
  cleanText,
  contactHubspotProps,
  demoHubspotProps,
  escapeHtml,
  hasOnlyKeys,
  isUuid,
  isValidEmail,
  OWN_SYNC_KINDS,
  ownContactHubspotProps,
  parseContactInput,
  parseDemoInput,
  parseWaitlistInput,
  selectMemberRecipients,
  waitlistHubspotProps,
  type MemberRecipient,
  type OwnSyncKind,
} from "./policy";

// Policy-checked handlers for every outbound email and CRM write (CLAUDE.md §20.23). Plain module, no server
// function here: the thin wrappers in triggers.ts and public-forms-fn.ts call these after resolving the caller.
// Everything external (Supabase, Resend, HubSpot, Notion) is reached through `Deps`, so the tests point it at
// local mock servers and assert whether a provider was called.
//
// Rules every handler follows:
//   * The recipient is never taken from the request. It is the verified session's own email (A), an address
//     looked up from a membership record the caller belongs to (B), or the address on an invite record the caller
//     created (E).
//   * Unknown request fields are refused, not ignored.
//   * Nothing is logged that contains an address, a token or a key.

export type Deps = {
  env: ProviderEnv;
  fetchImpl?: typeof fetch;
  now?: () => number;
};

export type Fail = { ok: false; error: string };
const fail = (error: string): Fail => ({ ok: false, error });
const INVALID = fail("invalid_input");
const NOT_FOUND = fail("not_found");

const nowMs = (d: Deps) => (d.now ? d.now() : Date.now());
const doFetch = (d: Deps): typeof fetch => d.fetchImpl ?? fetch;
const mailer = (d: Deps): MailerConfig => ({
  baseUrl: d.env.resendBase,
  apiKey: d.env.resendKey,
});
const send = (d: Deps, msg: OutboundEmail) =>
  sendEmailWith(mailer(d), msg, doFetch(d));
const hubspot = (d: Deps) => ({
  baseUrl: d.env.hubspotBase,
  token: d.env.hubspotToken,
});

function service(d: Deps) {
  return createClient(d.env.supabaseUrl, d.env.serviceKey, {
    auth: { persistSession: false },
  });
}

type Db = ReturnType<typeof service>;

/** Address of an auth user, from Supabase Auth's admin API. public.users has no email column. */
async function authEmailOf(d: Deps, uid: string): Promise<string | null> {
  if (!isUuid(uid)) return null;
  try {
    const r = await doFetch(d)(
      `${d.env.supabaseUrl}/auth/v1/admin/users/${uid}`,
      {
        headers: {
          apikey: d.env.serviceKey,
          Authorization: `Bearer ${d.env.serviceKey}`,
        },
      },
    );
    if (!r.ok) return null;
    const j = (await r.json()) as { email?: string };
    return isValidEmail(j.email) ? j.email : null;
  } catch {
    return null;
  }
}

async function fullNameOf(db: Db, uid: string): Promise<string> {
  const { data } = await db
    .from("users")
    .select("full_name")
    .eq("id", uid)
    .maybeSingle();
  return cleanText(String((data as any)?.full_name ?? "")).slice(
    0,
    LIMITS.name,
  );
}

/** Record a send in email_events and look it up again for the minimum-interval rule. */
async function recordSent(
  db: Db,
  emailId: string | undefined,
  toEmail: string,
  tags: Record<string, string>[],
) {
  try {
    const { error } = await db.from("email_events").insert({
      event_type: "email.sent",
      email_id: emailId ?? null,
      to_email: toEmail,
      tags,
    });
    if (error) console.error("[email] event log failed");
  } catch {
    console.error("[email] event log failed");
  }
}

async function lastSentAt(
  db: Db,
  tagFilter: Record<string, string>,
): Promise<string | null> {
  const { data } = await db
    .from("email_events")
    .select("created_at")
    .contains("tags", JSON.stringify([tagFilter]))
    .order("created_at", { ascending: false })
    .limit(1);
  const row = (data as any[] | null)?.[0];
  return row?.created_at ?? null;
}

// ── A: welcome email, to the signed-in user's own address only ───────────────────────────────────────

export async function welcomeEmailHandler(
  d: Deps,
  who: SessionIdentity,
  raw: unknown,
) {
  if (!hasOnlyKeys(raw, [])) return INVALID; // no fields at all: a request cannot name a recipient
  if (!who.emailConfirmed) return fail("email_not_confirmed");
  const db = service(d);

  const already = await lastSentAt(db, { type: "welcome", uid: who.uid });
  if (already)
    return { ok: true as const, sent: false, reason: "already_sent" };

  const { data: row } = await db
    .from("users")
    .select("role, full_name")
    .eq("id", who.uid)
    .maybeSingle();
  const role = (row as any)?.role === "investor" ? "investor" : "founder";
  const name = cleanText(
    String((row as any)?.full_name || who.fullName || who.email.split("@")[0]),
  ).slice(0, LIMITS.name);

  const { subject, html, text } = welcomeEmail({
    name,
    role,
    appUrl: d.env.appUrl,
  });
  const result = await send(d, {
    to: who.email,
    subject,
    html,
    text,
    tags: [
      { name: "type", value: "welcome" },
      { name: "role", value: role },
    ],
  });
  if (!result?.id)
    return { ok: true as const, sent: false, reason: "provider_unavailable" };
  await recordSent(db, result.id, who.email, [
    { type: "welcome", uid: who.uid },
  ]);
  return { ok: true as const, sent: true };
}

// ── B: notifications to other members of a deal room the caller belongs to ───────────────────────────

type RoomMember = MemberRecipient & { email: string | null };

/** Members of a room, only if `uid` is one of them. Null means the caller is not a member (answer: not_found). */
async function roomMembersIfMember(
  d: Deps,
  db: Db,
  roomId: string,
  uid: string,
): Promise<{
  members: RoomMember[];
  callerRole: string;
  companyName: string;
} | null> {
  if (!isUuid(roomId)) return null;
  const { data: rows } = await db
    .from("deal_room_members")
    .select("user_id, role")
    .eq("deal_room_id", roomId);
  const list = (rows as { user_id: string; role: string }[] | null) ?? [];
  const mine = list.find((m) => m.user_id === uid);
  if (!mine) return null;
  const members: RoomMember[] = [];
  for (const m of list) {
    members.push({
      user_id: m.user_id,
      role: m.role,
      email: m.user_id === uid ? null : await authEmailOf(d, m.user_id),
      full_name: await fullNameOf(db, m.user_id),
    });
  }
  const { data: room } = await db
    .from("deal_rooms")
    .select("startups(company_name)")
    .eq("id", roomId)
    .maybeSingle();
  const companyName = cleanText(
    String((room as any)?.startups?.company_name ?? "the startup"),
  ).slice(0, LIMITS.company);
  return { members, callerRole: mine.role, companyName };
}

export async function ndaSignedEmailHandler(
  d: Deps,
  who: SessionIdentity,
  raw: unknown,
) {
  if (!hasOnlyKeys(raw, ["dealRoomId"]) || !isUuid(raw.dealRoomId))
    return INVALID;
  const roomId = raw.dealRoomId;
  const db = service(d);
  const ctx = await roomMembersIfMember(d, db, roomId, who.uid);
  if (!ctx || ctx.callerRole !== "investor") return NOT_FOUND;

  const tag = { type: "nda-signed", room: roomId, from: who.uid };
  const last = await lastSentAt(db, tag);
  if (last && nowMs(d) - Date.parse(last) < MIN_RESEND_INTERVAL_MS) {
    return { ok: true as const, sent: 0, reason: "too_soon" };
  }

  const recipients = selectMemberRecipients(ctx.members, {
    excludeUserId: who.uid,
    roles: ["founder"],
  });
  const callerName = (await fullNameOf(db, who.uid)) || "An investor";
  let sent = 0;
  for (const r of recipients) {
    const { subject, html, text } = ndaSignedEmail({
      investorName: callerName,
      investorEmail: who.email,
      companyName: ctx.companyName,
      roomId,
      appUrl: d.env.appUrl,
    });
    const res = await send(d, {
      to: r.email as string,
      subject,
      html,
      text,
      tags: [{ name: "type", value: "nda-signed" }],
    });
    if (res?.id) {
      sent += 1;
      await recordSent(db, res.id, r.email as string, [tag]);
    }
  }
  return { ok: true as const, sent };
}

export async function documentUploadedEmailHandler(
  d: Deps,
  who: SessionIdentity,
  raw: unknown,
) {
  if (
    !hasOnlyKeys(raw, ["dealRoomId", "documentName"]) ||
    !isUuid(raw.dealRoomId)
  )
    return INVALID;
  if (
    typeof raw.documentName !== "string" ||
    raw.documentName.length > LIMITS.documentName
  )
    return INVALID;
  const documentName = cleanText(raw.documentName);
  if (!documentName) return INVALID;
  const roomId = raw.dealRoomId;
  const db = service(d);
  const ctx = await roomMembersIfMember(d, db, roomId, who.uid);
  if (!ctx) return NOT_FOUND;

  const tag = { type: "document-uploaded", room: roomId, from: who.uid };
  const last = await lastSentAt(db, tag);
  if (last && nowMs(d) - Date.parse(last) < 60_000) {
    return { ok: true as const, sent: 0, reason: "too_soon" };
  }

  const recipients = selectMemberRecipients(ctx.members, {
    excludeUserId: who.uid,
    roles: ["investor"],
  });
  const uploaderName = (await fullNameOf(db, who.uid)) || "the founder";
  let sent = 0;
  for (const r of recipients) {
    const { subject, html, text } = documentUploadedEmail({
      uploaderName,
      companyName: ctx.companyName,
      documentName,
      roomId,
      appUrl: d.env.appUrl,
    });
    const res = await send(d, {
      to: r.email as string,
      subject,
      html,
      text,
      tags: [{ name: "type", value: "document-uploaded" }],
    });
    if (res?.id) {
      sent += 1;
      await recordSent(db, res.id, r.email as string, [tag]);
    }
  }
  return { ok: true as const, sent };
}

// ── E: invites, the only email that may reach a non-member address ───────────────────────────────────

export async function startupTeamInviteHandler(
  d: Deps,
  who: SessionIdentity,
  raw: unknown,
) {
  if (!hasOnlyKeys(raw, ["token"]) || !isUuid(raw.token)) return INVALID;
  const db = service(d);

  const { data: inv } = await db
    .from("team_invites")
    .select(
      "id, startup_id, investor_profile_id, email, role, invited_by, accepted_at, expires_at, token",
    )
    .eq("token", raw.token)
    .maybeSingle();
  const invite = inv as any;
  const tag = { type: "startup-team-invite", invite: String(invite?.id ?? "") };
  const last = invite?.id ? await lastSentAt(db, tag) : null;
  const check = checkInviteSendable(invite, who.uid, last, nowMs(d));
  if (!check.ok) return fail(check.error);

  // The creator must still belong to the organisation the invite is for.
  let authorised = false;
  let orgName = "the team";
  if (invite.startup_id) {
    const { data: s } = await db
      .from("startups")
      .select("founder_id, company_name")
      .eq("id", invite.startup_id)
      .maybeSingle();
    orgName = cleanText(
      String((s as any)?.company_name ?? "the company"),
    ).slice(0, LIMITS.company);
    if ((s as any)?.founder_id === who.uid) authorised = true;
    else {
      const { data: t } = await db
        .from("startup_team_accounts")
        .select("id")
        .eq("startup_id", invite.startup_id)
        .eq("user_id", who.uid)
        .limit(1);
      authorised = ((t as any[] | null)?.length ?? 0) > 0;
    }
  } else if (invite.investor_profile_id) {
    const { data: p } = await db
      .from("investor_profiles")
      .select("fund_name, your_name")
      .eq("user_id", invite.investor_profile_id)
      .maybeSingle();
    orgName = cleanText(
      String((p as any)?.fund_name || (p as any)?.your_name || "the fund"),
    ).slice(0, LIMITS.company);
    if (invite.investor_profile_id === who.uid) authorised = true;
    else {
      const { data: t } = await db
        .from("startup_team_accounts")
        .select("id")
        .eq("investor_profile_id", invite.investor_profile_id)
        .eq("user_id", who.uid)
        .limit(1);
      authorised = ((t as any[] | null)?.length ?? 0) > 0;
    }
  }
  if (!authorised) return NOT_FOUND;

  const inviterName = (await fullNameOf(db, who.uid)) || "Your team";
  const { subject, html, text } = startupTeamInviteEmail({
    inviterName,
    companyName: orgName,
    role: String(invite.role ?? "member"),
    token: String(invite.token),
    expiresAt: invite.expires_at,
    appUrl: d.env.appUrl,
  });
  const res = await send(d, {
    to: invite.email,
    subject,
    html,
    text,
    tags: [{ name: "type", value: "startup-team-invite" }],
  });
  if (!res?.id)
    return { ok: true as const, sent: false, reason: "provider_unavailable" };
  await recordSent(db, res.id, invite.email, [tag]);
  return { ok: true as const, sent: true };
}

export async function lawyerInviteHandler(
  d: Deps,
  who: SessionIdentity,
  raw: unknown,
) {
  if (!hasOnlyKeys(raw, ["token"]) || !isUuid(raw.token)) return INVALID;
  const db = service(d);

  const { data: inv } = await db
    .from("deal_room_lawyer_invites")
    .select(
      "id, deal_room_id, side, email, invited_by, accepted_at, expires_at, token",
    )
    .eq("token", raw.token)
    .maybeSingle();
  const invite = inv as any;
  const tag = { type: "lawyer-invite", invite: String(invite?.id ?? "") };
  const last = invite?.id ? await lastSentAt(db, tag) : null;
  const check = checkInviteSendable(invite, who.uid, last, nowMs(d));
  if (!check.ok) return fail(check.error);

  const ctx = await roomMembersIfMember(d, db, invite.deal_room_id, who.uid);
  if (!ctx) return NOT_FOUND;

  const side = invite.side === "investor" ? "investor" : "founder";
  const inviterName = (await fullNameOf(db, who.uid)) || "Your contact";
  const { subject, html, text } = lawyerInviteEmail({
    inviterName,
    companyName: ctx.companyName,
    side,
    token: String(invite.token),
    expiresAt: invite.expires_at,
    appUrl: d.env.appUrl,
  });
  const res = await send(d, {
    to: invite.email,
    subject,
    html,
    text,
    tags: [{ name: "type", value: "lawyer-invite" }],
  });
  if (!res?.id)
    return { ok: true as const, sent: false, reason: "provider_unavailable" };
  await recordSent(db, res.id, invite.email, [tag]);
  return { ok: true as const, sent: true };
}

/**
 * Deal-room invite. The record is created with the CALLER's own token (row-level security decides whether they may
 * invite to this room), and the email goes to the address stored on the record that came back, not to a request
 * field. The Supabase URL and keys come from the server environment, never from the request.
 */
export async function dealRoomInviteHandler(
  d: Deps,
  who: SessionIdentity,
  accessToken: string,
  raw: unknown,
) {
  if (
    !hasOnlyKeys(raw, [
      "dealRoomId",
      "email",
      "role",
      "dealRoomName",
      "founderName",
      "startupName",
      "message",
    ])
  )
    return INVALID;
  if (!isUuid(raw.dealRoomId) || !isValidEmail(raw.email)) return INVALID;
  const role = raw.role ?? "investor";
  if (role !== "viewer" && role !== "investor" && role !== "founder")
    return INVALID;
  const cap = (v: unknown, max: number): string | null =>
    v === undefined || v === null || v === ""
      ? ""
      : typeof v === "string" && v.length <= max
        ? cleanText(v)
        : null;
  const dealRoomName = cap(raw.dealRoomName, LIMITS.company);
  const founderName = cap(raw.founderName, LIMITS.name);
  const startupName = cap(raw.startupName, LIMITS.company);
  const message =
    typeof raw.message === "string" &&
    raw.message.length <= LIMITS.inviteMessage
      ? raw.message
      : raw.message === undefined || raw.message === ""
        ? ""
        : null;
  if (
    dealRoomName === null ||
    founderName === null ||
    startupName === null ||
    message === null
  )
    return INVALID;
  if (!d.env.supabaseUrl || !d.env.anonKey) return fail("db_unavailable");

  const client = createClient(d.env.supabaseUrl, d.env.anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const expiresAt = new Date(nowMs(d) + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: invite, error } = await client
    .from("invites")
    .insert({
      deal_room_id: raw.dealRoomId,
      email: raw.email.toLowerCase(),
      role,
      invited_by: who.uid,
      expires_at: expiresAt,
    })
    .select("id, token, email")
    .single();
  if (error || !invite) return NOT_FOUND; // row-level security refused: the caller may not invite to this room

  const companyName = startupName || dealRoomName || "a deal room";
  const senderName = founderName || "A founder";
  const inviteLink = `${d.env.appUrl}/join/${(invite as any).token}`;
  const { subject, html, text } = dealRoomInviteEmail({
    founderName: senderName,
    companyName,
    token: String((invite as any).token),
    message: message || undefined,
    expiresAt,
    appUrl: d.env.appUrl,
  });
  const res = await send(d, {
    to: (invite as any).email,
    subject,
    html,
    text,
    tags: [{ name: "type", value: "deal-room-invite" }],
  });
  if (res?.id)
    await recordSent(service(d), res.id, (invite as any).email, [
      { type: "deal-room-invite", invite: String((invite as any).id) },
    ]);
  return {
    ok: true as const,
    emailSent: !!res?.id,
    token: (invite as any).token as string,
    inviteLink,
  };
}

// ── C: public forms ──────────────────────────────────────────────────────────────────────────────────

const NOTION_DATA_SOURCE_ID = "54f8f92a-0c73-4e84-8eb3-9eb705062f99";

async function notionWaitlistPage(
  d: Deps,
  v: { email: string; name: string; role: string; source: string },
) {
  if (!d.env.notionKey) {
    console.error("[Notion Waitlist] key not set; entry not written");
    return false;
  }
  try {
    const res = await doFetch(d)(`${d.env.notionBase}/v1/pages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${d.env.notionKey}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        parent: { data_source_id: NOTION_DATA_SOURCE_ID },
        properties: {
          Name: { title: [{ text: { content: v.name || v.email } }] },
          Email: { email: v.email },
          Role: { select: { name: v.role || "unspecified" } },
          Source: { select: { name: v.source } },
          Submitted: { date: { start: new Date(nowMs(d)).toISOString() } },
        },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function waitlistFormHandler(d: Deps, raw: unknown) {
  const p = parseWaitlistInput(raw);
  if (!p.ok) return INVALID;
  await upsertContactWith(
    hubspot(d),
    p.value.email,
    waitlistHubspotProps(p.value),
    doFetch(d),
  );
  await notionWaitlistPage(d, p.value);
  return { ok: true as const };
}

export async function contactFormHandler(d: Deps, raw: unknown) {
  const p = parseContactInput(raw);
  if (!p.ok) return INVALID;
  await upsertContactWith(
    hubspot(d),
    p.value.email,
    contactHubspotProps(p.value),
    doFetch(d),
  );
  return { ok: true as const };
}

export async function demoFormHandler(d: Deps, raw: unknown) {
  const p = parseDemoInput(raw);
  if (!p.ok) return INVALID;
  await upsertContactWith(
    hubspot(d),
    p.value.email,
    demoHubspotProps(p.value),
    doFetch(d),
  );
  return { ok: true as const };
}

// ── A: a signed-in user's own CRM contact ────────────────────────────────────────────────────────────

export async function syncOwnContactHandler(
  d: Deps,
  who: SessionIdentity,
  raw: unknown,
) {
  if (
    !hasOnlyKeys(raw, ["kind"]) ||
    !OWN_SYNC_KINDS.includes(raw.kind as OwnSyncKind)
  )
    return INVALID;
  if (!who.emailConfirmed) return fail("email_not_confirmed");
  const db = service(d);
  const { data: row } = await db
    .from("users")
    .select("role, full_name")
    .eq("id", who.uid)
    .maybeSingle();
  const role = (row as any)?.role === "investor" ? "investor" : "founder";
  const fullName = cleanText(
    String((row as any)?.full_name || who.fullName || ""),
  ).slice(0, LIMITS.name);
  const props = ownContactHubspotProps(raw.kind as OwnSyncKind, {
    fullName,
    role,
    today: new Date(nowMs(d)).toISOString().split("T")[0],
  });
  await upsertContactWith(hubspot(d), who.email, props, doFetch(d));
  return { ok: true as const };
}
