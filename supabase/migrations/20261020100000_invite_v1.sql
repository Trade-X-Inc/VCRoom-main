-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
-- DRAFT — NOT APPLIED. Lives in supabase/drafts/, not supabase/migrations/.   Job I2, 20 Oct 2026.
-- The one invitation model that will replace invites, team_invites, deal_room_lawyer_invites,
-- deal_room_invite_links and (later, separately) investor_invite_links. Database half only.
--
-- TWO SCHEMAS, the same split as pack_v1 / pack_api.
--   invite_v1  PRIVATE. Both tables, the append-only triggers and every internal helper live here. It is never
--              exposed through the API. RLS is on for both tables with NO policies, and every privilege on both
--              tables is revoked from public, anon, authenticated AND service_role. USAGE on the schema goes to
--              service_role only. No function in invite_v1 is executable by anyone but the owner (the definer
--              functions call each other as the owner); anon and authenticated cannot even see the schema.
--   invite_api The only schema the service layer calls. Six functions (create_invite, resend_invite,
--              revoke_invite, mark_sent, list_invites, accept_invite) plus the erase wrapper, all SECURITY
--              DEFINER with search_path = '' (every name qualified), EXECUTE for service_role only, revoked from
--              public, anon and authenticated. The owner exposes invite_api in the API settings, never invite_v1.
--   public.invite_preview is the one anonymous entry point (below).
-- Identity is never read here: the gateway action derives the caller (requireUser) and passes it as p_uid, the
-- same pattern as pack_api.*. A null p_uid is refused first.
--
-- TABLES
--   invite_v1.invite        one row per invitation. The token is NEVER stored: only sha256(token string, UTF-8)
--                           in token_hash. The token is generated in create_invite / resend_invite, returned in
--                           that one response, and is on the call path only between the database and the
--                           gateway action that emails it. Email is stored lowercased (NULL only after erasure, on a closed invitation). Lifetime is
--                           at most 30 days from created_at (CHECK). A resend ROTATES the token (new hash), so a
--                           link that leaked before a resend stops working.
--   invite_v1.invite_event  append-only audit: created, sent, resent, viewed, accepted, revoked, failed_attempt.
--                           Columns: id, invite_id, event_type, actor_id (a user id), reason (a lower-case code,
--                           CHECK-enforced, never free text), created_at. NO PERSONAL DATA: no email, no IP, no
--                           user agent, no token or hash. UPDATE, DELETE and TRUNCATE are blocked by triggers
--                           (the table has no foreign key to invite, so a room being deleted does not try to
--                           delete its events). Erasure never touches this table.
--
-- KINDS AND SCOPES (CHECK-enforced shape)
--   room_member   scope_room_id; role founder|investor (the principal role the invitee will hold in the room)
--   room_counsel  scope_room_id + request_id; role founder|investor (the side the lawyer represents)
--   team          scope_startup_id; role admin|manager|analyst|viewer
--   fund_team     scope_investor_id (investor_profiles.user_id); role admin|associate|analyst|external
--
-- WHO MAY CREATE WHAT (enforced in create_invite, resend_invite, revoke_invite, list_invites, mark_sent)
--   team       the startup's founder (owner, rank 5) or an ACTIVE startup_team_accounts admin (rank 4).
--              Manager, analyst, viewer: no authority. The invite role's rank must be <= the caller's rank
--              (admin 4, manager 3, analyst 2, viewer 1), so a lower role can never create a higher-role invite.
--   fund_team  the investor profile owner (rank 5) or an ACTIVE admin of that investor profile (rank 4); roles
--              admin 4, associate 3, analyst 2, external 1; same rank rule.
--   room_member a member of the room whose room role is founder or investor. The invitee role must be the
--              OPPOSITE side of the caller's own room role (a founder invites an investor and the reverse): the
--              room model has one founder principal and one investor principal. A role already held in the room
--              is refused (role_already_filled). Lawyers and other members have no authority.
--   room_counsel the room member who APPROVED an invite_lawyer request (deal_room_lawyer_requests.status
--              'approved', approved_by = the caller); the email and side come from that request, never from the
--              caller. One live invite per request.
--   Not-allowed and does-not-exist give the SAME answer (not_authorized) so scope existence is not probed.
--
-- LIMITS (create_invite): expiry 1 to 30 days, default 7; per sender at most 20 invitations per rolling 24 hours,
--   per scope at most 50 per rolling 24 hours (revoked ones still count); one pending invitation per
--   (kind, scope, email, role). resend_invite: at least 10 minutes since the last send (too_soon), at most 10
--   sends per invitation, the SERVER sets the new expiry (never a caller value), and the lifetime cap holds.
--
-- ACCEPT requires the signed-in account's email to be CONFIRMED (stricter than the old accept_team_invite, which
--   checked only the address): the join page must handle "confirm your email first".
-- ACCEPT (accept_invite) takes a row lock (FOR UPDATE). Every refusal returns the SAME answer,
--   {"ok": false, "error": "invalid_or_used"}: unknown token, already accepted, revoked, expired, email not equal
--   to the signed-in account's CONFIRMED email (case-insensitive), the inviter accepting their own invitation,
--   wrong role family, already a member, closed room, missing scope, blocked platform role (deleted, challenger,
--   admin). The specific reason goes to invite_event (failed_attempt, reason code) only when the token matched a
--   row, so random guessing writes nothing.
--   ROLE FAMILY (carried over from accept_deal_room_invite_link): room_member investor accepts users.role
--   investor or investor_member; room_member founder accepts founder. CROSS-ROOM: the scope comes only from the
--   invite row, never from the caller, so an invitation can only ever create the one membership it names.
--
-- ANONYMOUS PREVIEW: public.invite_preview(p_token text). Returns {valid:true, org_name, role_label, expires_on}
--   for a pending, unexpired invitation and exactly {valid:false} for every other case (unknown, accepted,
--   revoked, expired, malformed). It is a SECURITY DEFINER function owned by the database owner, executed by the
--   anonymous PostgREST role directly: there is no server function and no service-role key anywhere on the path
--   (SECURITY.md section 4 item 5). The only write it can cause is one 'viewed' event per invitation per hour,
--   and only for a valid token, so it cannot be used to grow the table by guessing.
--   NOTE FOR THE PROMOTION STEP: this one function needs GRANT EXECUTE ... TO anon, which the grant guard rule
--   R1 rejects for any migration at or after the cutoff. The accompanying patch (supabase/drafts/
--   DRAFT_grant_guard_invite_preview.patch) adds a narrow, named, reasoned allow-list bucket for exactly this
--   function; it is not applied.
--
-- NOT HERE (later steps): gateway actions and the hash-chain record entries they write, the join page, moving
--   each old flow over, the email handlers, dropping the old tables. ERASURE: invite_v1.erase_user_data(uuid)
--   (wrapped by invite_api.erase_user_data) clears the email and unlinks the user ids; it is not yet called by
--   erase_user_account (the exact addition is in the I2b report; that function is not edited here).
--
-- Re-runnable: create ... if not exists, create or replace function, idempotent revoke and grant.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

create schema if not exists invite_v1;
revoke all on schema invite_v1 from public, anon, authenticated;
grant usage on schema invite_v1 to service_role;
create schema if not exists invite_api;
revoke all on schema invite_api from public, anon, authenticated;
grant usage on schema invite_api to service_role;

-- ───────────────────────────────────────────── tables ─────────────────────────────────────────────
create table if not exists invite_v1.invite (
  id                uuid        not null default gen_random_uuid(),
  kind              text        not null,
  token_hash        bytea       not null,
  email             text,
  role              text        not null,
  scope_room_id     uuid,
  scope_startup_id  uuid,
  scope_investor_id uuid,
  request_id        uuid,
  created_by        uuid,
  created_at        timestamptz not null default now(),
  expires_at        timestamptz not null,
  last_sent_at      timestamptz,
  send_count        int         not null default 0,
  accepted_at       timestamptz,
  accepted_by       uuid,
  revoked_at        timestamptz,
  revoked_by        uuid,
  constraint invite_pkey primary key (id),
  constraint invite_token_hash_key unique (token_hash),
  constraint invite_token_hash_len check (octet_length(token_hash) = 32),
  constraint invite_kind_check check (kind in ('room_member', 'room_counsel', 'team', 'fund_team')),
  constraint invite_email_shape check (
    email is null
 or (email = lower(email) and char_length(email) between 5 and 254 and email ~ '^[^@[:space:][:cntrl:]]+@[^@[:space:][:cntrl:]]+\.[^@[:space:][:cntrl:]]+$')),
  -- an address may be absent only after erasure, and then the invitation is revoked (or already accepted)
  constraint invite_email_null_only_when_closed check (email is not null or accepted_at is not null or revoked_at is not null),
  constraint invite_scope_shape check (
    (kind = 'room_member'  and scope_room_id is not null and scope_startup_id is null and scope_investor_id is null and request_id is null)
 or (kind = 'room_counsel' and scope_room_id is not null and scope_startup_id is null and scope_investor_id is null and request_id is not null)
 or (kind = 'team'         and scope_startup_id is not null and scope_room_id is null and scope_investor_id is null and request_id is null)
 or (kind = 'fund_team'    and scope_investor_id is not null and scope_room_id is null and scope_startup_id is null and request_id is null)),
  constraint invite_role_shape check (
    (kind in ('room_member', 'room_counsel') and role in ('founder', 'investor'))
 or (kind = 'team'      and role in ('admin', 'manager', 'analyst', 'viewer'))
 or (kind = 'fund_team' and role in ('admin', 'associate', 'analyst', 'external'))),
  constraint invite_lifetime check (expires_at > created_at and expires_at <= created_at + interval '30 days'),
  constraint invite_send_count_nonneg check (send_count >= 0),
  constraint invite_not_accepted_and_revoked check (not (accepted_at is not null and revoked_at is not null)),
  constraint invite_room_fk foreign key (scope_room_id) references public.deal_rooms (id) on delete cascade,
  constraint invite_startup_fk foreign key (scope_startup_id) references public.startups (id) on delete cascade
);

-- one pending invitation per (kind, scope, email, role)
create unique index if not exists invite_one_pending
  on invite_v1.invite (kind, coalesce(scope_room_id, scope_startup_id, scope_investor_id), email, role)
  where accepted_at is null and revoked_at is null;
-- one accepted principal / counsel per room and role (carried over from the two old partial unique indexes)
create unique index if not exists invite_one_accepted_per_room_role
  on invite_v1.invite (scope_room_id, kind, role)
  where accepted_at is not null and kind in ('room_member', 'room_counsel');
-- one live invitation per approved counsel request
create unique index if not exists invite_one_live_per_request
  on invite_v1.invite (request_id)
  where request_id is not null and revoked_at is null;
create index if not exists invite_created_by_idx on invite_v1.invite (created_by, created_at);
create index if not exists invite_scope_room_idx on invite_v1.invite (scope_room_id) where scope_room_id is not null;
create index if not exists invite_scope_startup_idx on invite_v1.invite (scope_startup_id) where scope_startup_id is not null;
create index if not exists invite_scope_investor_idx on invite_v1.invite (scope_investor_id) where scope_investor_id is not null;

create table if not exists invite_v1.invite_event (
  id         bigint      generated always as identity,
  invite_id  uuid        not null,
  event_type text        not null,
  actor_id   uuid,
  reason     text,
  created_at timestamptz not null default now(),
  constraint invite_event_pkey primary key (id),
  constraint invite_event_type_check check (event_type in ('created', 'sent', 'resent', 'viewed', 'accepted', 'revoked', 'failed_attempt')),
  constraint invite_event_reason_len check (reason is null or char_length(reason) <= 40),
  -- a reason is a short lower-case code, never free text, so no name, address or token can be stored in it
  constraint invite_event_reason_code check (reason is null or reason ~ '^[a-z][a-z0-9_]*$')
);
create index if not exists invite_event_invite_idx on invite_v1.invite_event (invite_id, created_at);

create or replace function invite_v1.invite_event_append_only()
returns trigger
language plpgsql
set search_path = ''
as $fn$
begin
  raise exception 'invite_event is append-only';
end;
$fn$;

drop trigger if exists invite_event_no_update_delete on invite_v1.invite_event;
create trigger invite_event_no_update_delete before update or delete on invite_v1.invite_event
  for each row execute function invite_v1.invite_event_append_only();
drop trigger if exists invite_event_no_truncate on invite_v1.invite_event;
create trigger invite_event_no_truncate before truncate on invite_v1.invite_event
  for each statement execute function invite_v1.invite_event_append_only();

alter table invite_v1.invite enable row level security;
alter table invite_v1.invite_event enable row level security;
revoke all on table invite_v1.invite from public, anon, authenticated, service_role;
revoke all on table invite_v1.invite_event from public, anon, authenticated, service_role;

-- ──────────────────────────────────── internal helpers ────────────────────────────────────
create or replace function invite_v1.hash_token(p_token text)
returns bytea
language sql
immutable
set search_path = ''
as $fn$
  select pg_catalog.sha256(pg_catalog.convert_to(p_token, 'UTF8'));
$fn$;

create or replace function invite_v1.new_token()
returns text
language sql
volatile
set search_path = ''
as $fn$
  -- 32 random bytes, base64url without padding: 43 characters of A-Z a-z 0-9 - _
  select pg_catalog.rtrim(pg_catalog.translate(pg_catalog.encode(extensions.gen_random_bytes(32), 'base64'), '+/' || E'\n\r', '-_'), '=');
$fn$;

create or replace function invite_v1.log_event(p_invite_id uuid, p_type text, p_actor uuid, p_reason text default null)
returns void
language sql
set search_path = ''
as $fn$
  insert into invite_v1.invite_event (invite_id, event_type, actor_id, reason) values (p_invite_id, p_type, p_actor, p_reason);
$fn$;

-- rank of an invite role (higher = more powerful); 0 for a role that does not exist for the kind
create or replace function invite_v1.role_rank(p_kind text, p_role text)
returns int
language sql
immutable
set search_path = ''
as $fn$
  select case
    when p_kind = 'team'      then case p_role when 'admin' then 4 when 'manager' then 3 when 'analyst' then 2 when 'viewer' then 1 else 0 end
    when p_kind = 'fund_team' then case p_role when 'admin' then 4 when 'associate' then 3 when 'analyst' then 2 when 'external' then 1 else 0 end
    else 0 end;
$fn$;

-- the caller's authority over one scope: 0 none, 1 room member (founder or investor role), 4 admin, 5 owner
create or replace function invite_v1.scope_authority(p_uid uuid, p_kind text, p_room uuid, p_startup uuid, p_investor uuid)
returns int
language plpgsql
stable
set search_path = ''
as $fn$
begin
  if p_uid is null then return 0; end if;
  if p_kind = 'team' and p_startup is not null then
    if exists (select 1 from public.startups s where s.id = p_startup and s.founder_id = p_uid) then return 5; end if;
    if exists (select 1 from public.startup_team_accounts a
                where a.startup_id = p_startup and a.user_id = p_uid and a.status = 'active' and a.role = 'admin') then return 4; end if;
    return 0;
  elsif p_kind = 'fund_team' and p_investor is not null then
    if exists (select 1 from public.investor_profiles ip where ip.user_id = p_investor and ip.user_id = p_uid) then return 5; end if;
    if exists (select 1 from public.startup_team_accounts a
                where a.investor_profile_id = p_investor and a.user_id = p_uid and a.status = 'active' and a.role = 'admin') then return 4; end if;
    return 0;
  elsif p_kind in ('room_member', 'room_counsel') and p_room is not null then
    if exists (select 1 from public.deal_room_members m where m.deal_room_id = p_room and m.user_id = p_uid and m.role in ('founder', 'investor')) then return 1; end if;
    return 0;
  end if;
  return 0;
end;
$fn$;

-- display name of the organisation an invitation belongs to
create or replace function invite_v1.org_name(p_kind text, p_room uuid, p_startup uuid, p_investor uuid)
returns text
language sql
stable
set search_path = ''
as $fn$
  select case
    when p_kind in ('room_member', 'room_counsel') then
      (select s.company_name from public.deal_rooms dr join public.startups s on s.id = dr.startup_id where dr.id = p_room)
    when p_kind = 'team' then (select s.company_name from public.startups s where s.id = p_startup)
    when p_kind = 'fund_team' then (select coalesce(ip.fund_name, ip.your_name) from public.investor_profiles ip where ip.user_id = p_investor)
  end;
$fn$;

create or replace function invite_v1.role_label(p_kind text, p_role text)
returns text
language sql
immutable
set search_path = ''
as $fn$
  select case
    when p_kind = 'room_counsel' then 'Legal counsel'
    when p_kind = 'room_member'  then case p_role when 'founder' then 'Founder' else 'Investor' end
    else pg_catalog.initcap(p_role)
  end;
$fn$;

-- ───────────────────────────────────────── create ─────────────────────────────────────────
create or replace function invite_api.create_invite(
  p_uid             uuid,
  p_kind            text,
  p_email           text,
  p_role            text,
  p_scope_room      uuid,
  p_scope_startup   uuid,
  p_scope_investor  uuid,
  p_request_id      uuid default null,
  p_expires_in_days int  default 7
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  c_sender_cap constant int := 20;
  c_scope_cap  constant int := 50;
  v_email   text;
  v_role    text := p_role;
  v_auth    int;
  v_days    int := coalesce(p_expires_in_days, 7);
  v_req     public.deal_room_lawyer_requests;
  v_caller_room_role text;
  v_token   text;
  v_inv     invite_v1.invite;
  v_n       int;
begin
  if p_uid is null then
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if p_kind is null or p_kind not in ('room_member', 'room_counsel', 'team', 'fund_team') then
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'invalid_input');
  end if;
  -- the scope arguments must be exactly the ones this kind uses
  if not ((p_kind in ('room_member', 'room_counsel') and p_scope_room is not null and p_scope_startup is null and p_scope_investor is null)
       or (p_kind = 'team'      and p_scope_startup  is not null and p_scope_room is null and p_scope_investor is null)
       or (p_kind = 'fund_team' and p_scope_investor is not null and p_scope_room is null and p_scope_startup  is null)) then
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'invalid_input');
  end if;
  if v_days < 1 or v_days > 30 then
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'invalid_expiry');
  end if;

  -- authority first; "not allowed" and "does not exist" are one answer
  v_auth := invite_v1.scope_authority(p_uid, p_kind, p_scope_room, p_scope_startup, p_scope_investor);
  if v_auth = 0 then
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;

  -- serialise this sender's creations so the daily caps cannot be raced
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('invite_v1:create:' || p_uid::text, 0));

  if p_kind = 'room_counsel' then
    select r.* into v_req from public.deal_room_lawyer_requests r
     where r.id = p_request_id and r.deal_room_id = p_scope_room and r.kind = 'invite_lawyer'
       and r.status = 'approved' and r.approved_by = p_uid and r.lawyer_email is not null;
    if not found then
      return pg_catalog.jsonb_build_object('ok', false, 'error', 'not_ready');
    end if;
    if v_role is not null and v_role <> v_req.side then
      return pg_catalog.jsonb_build_object('ok', false, 'error', 'invalid_role');
    end if;
    v_role := v_req.side;
    v_email := pg_catalog.lower(pg_catalog.btrim(v_req.lawyer_email));
  else
    v_email := pg_catalog.lower(pg_catalog.btrim(coalesce(p_email, '')));
  end if;

  if v_email !~ '^[^@[:space:][:cntrl:]]+@[^@[:space:][:cntrl:]]+\.[^@[:space:][:cntrl:]]+$' or pg_catalog.char_length(v_email) > 254 then
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'invalid_email');
  end if;

  -- role rules
  if p_kind = 'room_member' then
    select m.role into v_caller_room_role from public.deal_room_members m
     where m.deal_room_id = p_scope_room and m.user_id = p_uid and m.role in ('founder', 'investor') limit 1;
    if v_role is null or v_role not in ('founder', 'investor')
       or v_role = v_caller_room_role then
      return pg_catalog.jsonb_build_object('ok', false, 'error', 'invalid_role');
    end if;
    if exists (select 1 from public.deal_room_members m where m.deal_room_id = p_scope_room and m.role = v_role) then
      return pg_catalog.jsonb_build_object('ok', false, 'error', 'role_already_filled');
    end if;
  elsif p_kind = 'room_counsel' then
    if exists (select 1 from invite_v1.invite i where i.kind = 'room_counsel' and i.scope_room_id = p_scope_room
                and i.role = v_role and i.accepted_at is not null) then
      return pg_catalog.jsonb_build_object('ok', false, 'error', 'role_already_filled');
    end if;
  else
    if v_role is null or invite_v1.role_rank(p_kind, v_role) = 0 then
      return pg_catalog.jsonb_build_object('ok', false, 'error', 'invalid_role');
    end if;
    if invite_v1.role_rank(p_kind, v_role) > v_auth then
      return pg_catalog.jsonb_build_object('ok', false, 'error', 'role_exceeds_caller');
    end if;
  end if;

  -- already a member? (inside the caller's own scope only)
  if exists (
       select 1 from auth.users u
        where pg_catalog.lower(u.email) = v_email
          and ((p_kind in ('room_member', 'room_counsel') and exists (select 1 from public.deal_room_members m where m.deal_room_id = p_scope_room and m.user_id = u.id))
            or (p_kind = 'team' and (exists (select 1 from public.startup_team_accounts a where a.startup_id = p_scope_startup and a.user_id = u.id)
                                     or exists (select 1 from public.startups s where s.id = p_scope_startup and s.founder_id = u.id)))
            or (p_kind = 'fund_team' and (exists (select 1 from public.startup_team_accounts a where a.investor_profile_id = p_scope_investor and a.user_id = u.id)
                                          or u.id = p_scope_investor)))) then
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'already_member');
  end if;

  -- caps over a rolling 24 hours (revoked invitations still count)
  select pg_catalog.count(*) into v_n from invite_v1.invite i
   where i.created_by = p_uid and i.created_at > pg_catalog.now() - interval '24 hours';
  if v_n >= c_sender_cap then
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'daily_cap_sender');
  end if;
  select pg_catalog.count(*) into v_n from invite_v1.invite i
   where i.created_at > pg_catalog.now() - interval '24 hours'
     and i.kind = p_kind
     and coalesce(i.scope_room_id, i.scope_startup_id, i.scope_investor_id) = coalesce(p_scope_room, p_scope_startup, p_scope_investor);
  if v_n >= c_scope_cap then
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'daily_cap_scope');
  end if;

  -- an EXPIRED pending duplicate no longer blocks a new invitation: close it first
  update invite_v1.invite i
     set revoked_at = pg_catalog.now(), revoked_by = p_uid
   where i.kind = p_kind and i.email = v_email and i.role = v_role
     and coalesce(i.scope_room_id, i.scope_startup_id, i.scope_investor_id) = coalesce(p_scope_room, p_scope_startup, p_scope_investor)
     and i.accepted_at is null and i.revoked_at is null and i.expires_at <= pg_catalog.now();

  v_token := invite_v1.new_token();
  begin
    insert into invite_v1.invite (kind, token_hash, email, role, scope_room_id, scope_startup_id, scope_investor_id, request_id,
                                  created_by, expires_at, last_sent_at, send_count)
    values (p_kind, invite_v1.hash_token(v_token), v_email, v_role, p_scope_room, p_scope_startup, p_scope_investor,
            case when p_kind = 'room_counsel' then p_request_id end,
            p_uid, pg_catalog.now() + pg_catalog.make_interval(days => v_days), pg_catalog.now(), 1)
    returning * into v_inv;
  exception when unique_violation then
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'duplicate_pending');
  end;

  perform invite_v1.log_event(v_inv.id, 'created', p_uid, null);
  return pg_catalog.jsonb_build_object(
    'ok', true, 'invite_id', v_inv.id, 'token', v_token, 'kind', v_inv.kind, 'role', v_inv.role, 'email', v_inv.email,
    'expires_at', v_inv.expires_at,
    'org_name', invite_v1.org_name(v_inv.kind, v_inv.scope_room_id, v_inv.scope_startup_id, v_inv.scope_investor_id));
end;
$fn$;

-- shared authority check for resend / revoke / mark_sent / list: the caller must hold authority over the invite's
-- scope and, for the two team kinds, rank at least that of the invite's role.
create or replace function invite_v1.can_manage(p_uid uuid, p_inv invite_v1.invite)
returns boolean
language plpgsql
stable
set search_path = ''
as $fn$
declare
  v_auth int := invite_v1.scope_authority(p_uid, p_inv.kind, p_inv.scope_room_id, p_inv.scope_startup_id, p_inv.scope_investor_id);
  v_side text;
begin
  if v_auth = 0 then return false; end if;
  if p_inv.kind in ('team', 'fund_team') then
    return invite_v1.role_rank(p_inv.kind, p_inv.role) <= v_auth;
  end if;
  -- Room kinds: scope_authority only says "a founder- or investor-side member of this room". Which invitations that
  -- member may manage depends on the SIDE.
  select m.role into v_side from public.deal_room_members m
   where m.deal_room_id = p_inv.scope_room_id and m.user_id = p_uid and m.role in ('founder', 'investor') limit 1;
  if v_side is null then return false; end if;
  if p_inv.kind = 'room_counsel' then
    return v_side = p_inv.role;          -- the lawyer's own side only (the invite role IS the side represented)
  end if;
  return v_side <> p_inv.role;           -- room_member: the creator is the OPPOSITE side of the invited role
end;
$fn$;

-- ───────────────────────────────────────── resend ─────────────────────────────────────────
-- No expiry argument exists: the server chooses the new expiry. The token is rotated.
create or replace function invite_api.resend_invite(p_uid uuid, p_invite_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  c_min_interval constant interval := interval '10 minutes';
  c_max_sends    constant int := 10;
  v_inv     invite_v1.invite;
  v_token   text;
  v_expiry  timestamptz;
begin
  if p_uid is null then
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  select i.* into v_inv from invite_v1.invite i where i.id = p_invite_id for update;
  if not found or not invite_v1.can_manage(p_uid, v_inv) then
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;
  if v_inv.accepted_at is not null or v_inv.revoked_at is not null then
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'invalid_state');
  end if;
  if v_inv.send_count >= c_max_sends then
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'too_many_sends');
  end if;
  if v_inv.last_sent_at is not null and v_inv.last_sent_at > pg_catalog.now() - c_min_interval then
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'too_soon',
      'retry_after_seconds', pg_catalog.ceil(extract(epoch from (v_inv.last_sent_at + c_min_interval - pg_catalog.now())))::int);
  end if;

  v_expiry := least(greatest(v_inv.expires_at, pg_catalog.now() + interval '7 days'), v_inv.created_at + interval '30 days');
  if v_expiry <= pg_catalog.now() then
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'lifetime_exceeded');
  end if;

  v_token := invite_v1.new_token();
  update invite_v1.invite i
     set token_hash = invite_v1.hash_token(v_token), expires_at = v_expiry,
         last_sent_at = pg_catalog.now(), send_count = i.send_count + 1
   where i.id = v_inv.id;
  perform invite_v1.log_event(v_inv.id, 'resent', p_uid, null);
  return pg_catalog.jsonb_build_object('ok', true, 'invite_id', v_inv.id, 'token', v_token, 'kind', v_inv.kind, 'role', v_inv.role,
    'email', v_inv.email, 'expires_at', v_expiry,
    'org_name', invite_v1.org_name(v_inv.kind, v_inv.scope_room_id, v_inv.scope_startup_id, v_inv.scope_investor_id));
end;
$fn$;

-- ───────────────────────────────────────── revoke ─────────────────────────────────────────
create or replace function invite_api.revoke_invite(p_uid uuid, p_invite_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_inv invite_v1.invite;
begin
  if p_uid is null then
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  select i.* into v_inv from invite_v1.invite i where i.id = p_invite_id for update;
  if not found or not invite_v1.can_manage(p_uid, v_inv) then
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;
  if v_inv.accepted_at is not null then
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'invalid_state');
  end if;
  if v_inv.revoked_at is not null then
    return pg_catalog.jsonb_build_object('ok', true, 'invite_id', v_inv.id, 'already_revoked', true); -- idempotent, no new event
  end if;
  update invite_v1.invite i set revoked_at = pg_catalog.now(), revoked_by = p_uid where i.id = v_inv.id;
  perform invite_v1.log_event(v_inv.id, 'revoked', p_uid, null);
  return pg_catalog.jsonb_build_object('ok', true, 'invite_id', v_inv.id);
end;
$fn$;

-- ──────────────────────────────────────── mark_sent ────────────────────────────────────────
-- The gateway reports whether the email provider accepted the message.
create or replace function invite_api.mark_sent(p_uid uuid, p_invite_id uuid, p_ok boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_inv invite_v1.invite;
  v_n   int;
begin
  if p_uid is null then
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  -- the row lock serialises concurrent calls so the count below cannot be raced past
  select i.* into v_inv from invite_v1.invite i where i.id = p_invite_id for update;
  if not found or not invite_v1.can_manage(p_uid, v_inv) then
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;
  -- At most ONE outcome event per send: create/resend each count as one send (send_count). Outcomes already
  -- recorded = 'sent' events + 'failed_attempt' events with reason send_failed. When they have caught up with
  -- send_count, a further call is a harmless no-op, so an authorised caller cannot grow the event table.
  select pg_catalog.count(*) into v_n from invite_v1.invite_event e
   where e.invite_id = v_inv.id
     and (e.event_type = 'sent' or (e.event_type = 'failed_attempt' and e.reason = 'send_failed'));
  if v_n >= v_inv.send_count then
    return pg_catalog.jsonb_build_object('ok', true, 'noop', true);
  end if;
  if coalesce(p_ok, false) then
    perform invite_v1.log_event(v_inv.id, 'sent', p_uid, null);
  else
    perform invite_v1.log_event(v_inv.id, 'failed_attempt', p_uid, 'send_failed');
  end if;
  return pg_catalog.jsonb_build_object('ok', true);
end;
$fn$;

-- ──────────────────────────────────────── list ────────────────────────────────────────
create or replace function invite_api.list_invites(p_uid uuid, p_kind text, p_scope_room uuid, p_scope_startup uuid, p_scope_investor uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_auth int;
begin
  if p_uid is null then
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if p_kind is null or p_kind not in ('room_member', 'room_counsel', 'team', 'fund_team') then
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'invalid_input');
  end if;
  v_auth := invite_v1.scope_authority(p_uid, p_kind, p_scope_room, p_scope_startup, p_scope_investor);
  if v_auth = 0 then
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;
  return pg_catalog.jsonb_build_object('ok', true, 'invites', coalesce((
    select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
             'id', i.id, 'kind', i.kind, 'email', i.email, 'role', i.role,
             'status', case when i.accepted_at is not null then 'accepted' when i.revoked_at is not null then 'revoked'
                            when i.expires_at <= pg_catalog.now() then 'expired' else 'pending' end,
             'created_by', i.created_by, 'created_at', i.created_at, 'expires_at', i.expires_at,
             'last_sent_at', i.last_sent_at, 'send_count', i.send_count, 'accepted_at', i.accepted_at) order by i.created_at desc)
      from invite_v1.invite i
     where i.kind = p_kind
       and coalesce(i.scope_room_id, i.scope_startup_id, i.scope_investor_id) = coalesce(p_scope_room, p_scope_startup, p_scope_investor)
       and invite_v1.can_manage(p_uid, i)), '[]'::jsonb));
end;
$fn$;

-- ──────────────────────────────────────── accept ────────────────────────────────────────
create or replace function invite_api.accept_invite(p_uid uuid, p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_inv      invite_v1.invite;
  v_email    text;
  v_confirmed timestamptz;
  v_urole    text;
  v_status   text;
  v_founder  uuid;
  v_name     text;
  c_fail     constant jsonb := '{"ok": false, "error": "invalid_or_used"}'::jsonb;
begin
  if p_uid is null then
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if p_token is null or pg_catalog.char_length(p_token) < 20 or pg_catalog.char_length(p_token) > 128 then
    return c_fail;
  end if;

  select i.* into v_inv from invite_v1.invite i where i.token_hash = invite_v1.hash_token(p_token) for update;
  if not found then
    return c_fail;            -- unknown token: nothing is written
  end if;

  -- Per-user membership lock. startup_team_accounts is unique only on (startup_id, user_id), so a fund-team row
  -- (startup_id null) has no database-level protection against the same user joining the same fund twice through
  -- two different invitations. Serialising on (scope, user) makes the already-member checks below race-free.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'invite_v1:member:' || coalesce(v_inv.scope_room_id, v_inv.scope_startup_id, v_inv.scope_investor_id)::text || ':' || p_uid::text, 0));

  if v_inv.accepted_at is not null then perform invite_v1.log_event(v_inv.id, 'failed_attempt', p_uid, 'used'); return c_fail; end if;
  if v_inv.revoked_at  is not null then perform invite_v1.log_event(v_inv.id, 'failed_attempt', p_uid, 'revoked'); return c_fail; end if;
  if v_inv.expires_at <= pg_catalog.now() then perform invite_v1.log_event(v_inv.id, 'failed_attempt', p_uid, 'expired'); return c_fail; end if;

  select u.email, u.email_confirmed_at into v_email, v_confirmed from auth.users u where u.id = p_uid;
  if v_email is null or v_confirmed is null or pg_catalog.lower(v_email) <> v_inv.email then
    perform invite_v1.log_event(v_inv.id, 'failed_attempt', p_uid, 'email_mismatch'); return c_fail;
  end if;
  if p_uid = v_inv.created_by then
    perform invite_v1.log_event(v_inv.id, 'failed_attempt', p_uid, 'self'); return c_fail;
  end if;

  select u.role, u.full_name into v_urole, v_name from public.users u where u.id = p_uid;
  if v_urole is null or v_urole in ('deleted', 'challenger', 'admin') then
    perform invite_v1.log_event(v_inv.id, 'failed_attempt', p_uid, 'blocked_role'); return c_fail;
  end if;

  if v_inv.kind in ('room_member', 'room_counsel') then
    select dr.status into v_status from public.deal_rooms dr where dr.id = v_inv.scope_room_id;
    if not found then perform invite_v1.log_event(v_inv.id, 'failed_attempt', p_uid, 'scope_missing'); return c_fail; end if;
    if v_status = 'closed' then perform invite_v1.log_event(v_inv.id, 'failed_attempt', p_uid, 'room_closed'); return c_fail; end if;
    if v_inv.kind = 'room_member' and not (
         (v_inv.role = 'investor' and v_urole in ('investor', 'investor_member')) or (v_inv.role = 'founder' and v_urole = 'founder')) then
      perform invite_v1.log_event(v_inv.id, 'failed_attempt', p_uid, 'role_family'); return c_fail;
    end if;
    if exists (select 1 from public.deal_room_members m where m.deal_room_id = v_inv.scope_room_id and m.user_id = p_uid) then
      perform invite_v1.log_event(v_inv.id, 'failed_attempt', p_uid, 'already_member'); return c_fail;
    end if;
    begin
      insert into public.deal_room_members (deal_room_id, user_id, role, invited_by)
      values (v_inv.scope_room_id, p_uid, case when v_inv.kind = 'room_counsel' then 'lawyer' else v_inv.role end, v_inv.created_by);
      update invite_v1.invite i set accepted_at = pg_catalog.now(), accepted_by = p_uid where i.id = v_inv.id;
    exception when unique_violation then
      perform invite_v1.log_event(v_inv.id, 'failed_attempt', p_uid, 'role_filled'); return c_fail;
    end;
  elsif v_inv.kind = 'team' then
    select s.founder_id into v_founder from public.startups s where s.id = v_inv.scope_startup_id;
    if not found then perform invite_v1.log_event(v_inv.id, 'failed_attempt', p_uid, 'scope_missing'); return c_fail; end if;
    if v_founder = p_uid or exists (select 1 from public.startup_team_accounts a where a.startup_id = v_inv.scope_startup_id and a.user_id = p_uid) then
      perform invite_v1.log_event(v_inv.id, 'failed_attempt', p_uid, 'already_member'); return c_fail;
    end if;
    insert into public.startup_team_accounts (startup_id, investor_profile_id, user_id, role, invite_id, invited_by, display_name, avatar_url)
    values (v_inv.scope_startup_id, null, p_uid, v_inv.role, null, v_inv.created_by,
            coalesce(nullif(pg_catalog.btrim(v_name), ''), pg_catalog.split_part(v_email, '@', 1)), null);
    insert into public.team_member_profiles (user_id) values (p_uid) on conflict (user_id) do nothing;
    update invite_v1.invite i set accepted_at = pg_catalog.now(), accepted_by = p_uid where i.id = v_inv.id;
  else -- fund_team
    if not exists (select 1 from public.investor_profiles ip where ip.user_id = v_inv.scope_investor_id) then
      perform invite_v1.log_event(v_inv.id, 'failed_attempt', p_uid, 'scope_missing'); return c_fail;
    end if;
    if v_inv.scope_investor_id = p_uid or exists (select 1 from public.startup_team_accounts a where a.investor_profile_id = v_inv.scope_investor_id and a.user_id = p_uid) then
      perform invite_v1.log_event(v_inv.id, 'failed_attempt', p_uid, 'already_member'); return c_fail;
    end if;
    insert into public.startup_team_accounts (startup_id, investor_profile_id, user_id, role, invite_id, invited_by, display_name, avatar_url)
    values (null, v_inv.scope_investor_id, p_uid, v_inv.role, null, v_inv.created_by,
            coalesce(nullif(pg_catalog.btrim(v_name), ''), pg_catalog.split_part(v_email, '@', 1)), null);
    insert into public.team_member_profiles (user_id) values (p_uid) on conflict (user_id) do nothing;
    update invite_v1.invite i set accepted_at = pg_catalog.now(), accepted_by = p_uid where i.id = v_inv.id;
  end if;

  perform invite_v1.log_event(v_inv.id, 'accepted', p_uid, null);
  return pg_catalog.jsonb_build_object('ok', true, 'kind', v_inv.kind, 'role', v_inv.role,
    'scope_room_id', v_inv.scope_room_id, 'scope_startup_id', v_inv.scope_startup_id, 'scope_investor_id', v_inv.scope_investor_id,
    'org_name', invite_v1.org_name(v_inv.kind, v_inv.scope_room_id, v_inv.scope_startup_id, v_inv.scope_investor_id));
end;
$fn$;

-- ───────────────────────────────────── preview (internal) ─────────────────────────────────────
-- Not executable by anyone but service_role and the owner. Called only by public.invite_preview below.
create or replace function invite_v1.preview(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_inv invite_v1.invite;
begin
  if p_token is null or pg_catalog.char_length(p_token) < 20 or pg_catalog.char_length(p_token) > 128 then
    return '{"valid": false}'::jsonb;
  end if;
  select i.* into v_inv from invite_v1.invite i where i.token_hash = invite_v1.hash_token(p_token);
  if not found or v_inv.accepted_at is not null or v_inv.revoked_at is not null or v_inv.expires_at <= pg_catalog.now() then
    return '{"valid": false}'::jsonb;
  end if;
  -- one 'viewed' event per invitation per hour, only for a token that really exists
  if not exists (select 1 from invite_v1.invite_event e
                  where e.invite_id = v_inv.id and e.event_type = 'viewed' and e.created_at > pg_catalog.now() - interval '1 hour') then
    perform invite_v1.log_event(v_inv.id, 'viewed', null, null);
  end if;
  return pg_catalog.jsonb_build_object(
    'valid', true,
    'org_name', coalesce(invite_v1.org_name(v_inv.kind, v_inv.scope_room_id, v_inv.scope_startup_id, v_inv.scope_investor_id), 'a team on Lengdon'),
    'role_label', invite_v1.role_label(v_inv.kind, v_inv.role),
    'expires_on', pg_catalog.to_char(v_inv.expires_at at time zone 'UTC', 'YYYY-MM-DD'));
end;
$fn$;

-- ──────────────────────────────── counsel side (internal + wrapper) ────────────────────────────────
-- deal_room_members has no side column and a lawyer's membership row says only role = 'lawyer'. The side the
-- lawyer represents ('founder' or 'investor') lives on the ACCEPTED room_counsel invitation (its role column).
-- Returns that side, or NULL when the user holds no accepted counsel invitation for the room. Read-only.
create or replace function invite_v1.counsel_side(p_room uuid, p_user uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $fn$
  select i.role
    from invite_v1.invite i
   where i.kind = 'room_counsel' and i.scope_room_id = p_room and i.accepted_by = p_user and i.accepted_at is not null
   order by i.accepted_at desc
   limit 1;
$fn$;

create or replace function invite_api.counsel_side(p_room uuid, p_user uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $fn$
  select invite_v1.counsel_side(p_room, p_user);
$fn$;

-- ───────────────────────────────────── erasure (internal) ─────────────────────────────────────
-- Personal-data erasure for one user. Called from pack_api.erase_user_account (the owner-executed definer, no
-- grant needed) and, for the service layer, through invite_api.erase_user_data. It never touches invite_event:
-- that table holds only ids, an event type and a reason code, and is append-only.
--   1. Pending invitations the user created, or addressed to the user's CONFIRMED email, are revoked (nothing
--      remains that could be accepted), with revoked_by cleared.
--   2. The email address is cleared on every invitation the user created or accepted and on every invitation
--      addressed to the user's confirmed email.
--   3. created_by, accepted_by and revoked_by that name the user are set to NULL.
-- It returns counts only. It must run BEFORE the auth.users row is removed (it reads the account's email there).
create or replace function invite_v1.erase_user_data(p_uid uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_email     text;
  v_confirmed timestamptz;
  v_emails    int;
  v_unlinked  int;
begin
  if p_uid is null then
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  select pg_catalog.lower(u.email), u.email_confirmed_at into v_email, v_confirmed from auth.users u where u.id = p_uid;
  if v_confirmed is null then v_email := null; end if;

  -- 1 + 2 in one statement: a pending row is revoked and loses its address together (the table's check requires
  -- an address to be present unless the invitation is closed)
  update invite_v1.invite i
     set revoked_at = case when i.accepted_at is null and i.revoked_at is null then pg_catalog.now() else i.revoked_at end,
         revoked_by = case when i.accepted_at is null and i.revoked_at is null then null else i.revoked_by end,
         email = null
   where i.email is not null
     and (i.created_by = p_uid or i.accepted_by = p_uid or (v_email is not null and i.email = v_email));
  get diagnostics v_emails = row_count;

  -- 3
  update invite_v1.invite i
     set created_by  = case when i.created_by  = p_uid then null else i.created_by  end,
         accepted_by = case when i.accepted_by = p_uid then null else i.accepted_by end,
         revoked_by  = case when i.revoked_by  = p_uid then null else i.revoked_by  end
   where i.created_by = p_uid or i.accepted_by = p_uid or i.revoked_by = p_uid;
  get diagnostics v_unlinked = row_count;

  return pg_catalog.jsonb_build_object('ok', true, 'emails_cleared', v_emails, 'rows_unlinked', v_unlinked);
end;
$fn$;

-- service-layer wrapper (the same pattern as every other invite_api function)
create or replace function invite_api.erase_user_data(p_uid uuid)
returns jsonb
language sql
security definer
set search_path = ''
as $fn$
  select invite_v1.erase_user_data(p_uid);
$fn$;

-- ───────────────────────────────── the one anonymous wrapper ─────────────────────────────────
create or replace function public.invite_preview(p_token text)
returns jsonb
language sql
security definer
set search_path = ''
as $fn$
  select invite_v1.preview(p_token);
$fn$;

-- ───────────────────────────────────────── grants ─────────────────────────────────────────
-- invite_v1: nothing is callable by anyone but the owner (definer functions call each other as the owner).
revoke all on function invite_v1.invite_event_append_only() from public, anon, authenticated, service_role;
revoke all on function invite_v1.hash_token(text) from public, anon, authenticated, service_role;
revoke all on function invite_v1.new_token() from public, anon, authenticated, service_role;
revoke all on function invite_v1.log_event(uuid, text, uuid, text) from public, anon, authenticated, service_role;
revoke all on function invite_v1.role_rank(text, text) from public, anon, authenticated, service_role;
revoke all on function invite_v1.scope_authority(uuid, text, uuid, uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function invite_v1.org_name(text, uuid, uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function invite_v1.role_label(text, text) from public, anon, authenticated, service_role;
revoke all on function invite_v1.can_manage(uuid, invite_v1.invite) from public, anon, authenticated, service_role;
revoke all on function invite_v1.preview(text) from public, anon, authenticated, service_role;
revoke all on function invite_v1.erase_user_data(uuid) from public, anon, authenticated, service_role;
revoke all on function invite_v1.counsel_side(uuid, uuid) from public, anon, authenticated, service_role;

-- invite_api: service_role only.
revoke all on function invite_api.create_invite(uuid, text, text, text, uuid, uuid, uuid, uuid, int) from public, anon, authenticated;
revoke all on function invite_api.resend_invite(uuid, uuid) from public, anon, authenticated;
revoke all on function invite_api.revoke_invite(uuid, uuid) from public, anon, authenticated;
revoke all on function invite_api.mark_sent(uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function invite_api.list_invites(uuid, text, uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function invite_api.accept_invite(uuid, text) from public, anon, authenticated;
revoke all on function invite_api.erase_user_data(uuid) from public, anon, authenticated;
revoke all on function invite_api.counsel_side(uuid, uuid) from public, anon, authenticated;
revoke all on function public.invite_preview(text) from public;

grant execute on function invite_api.create_invite(uuid, text, text, text, uuid, uuid, uuid, uuid, int) to service_role;
grant execute on function invite_api.resend_invite(uuid, uuid) to service_role;
grant execute on function invite_api.revoke_invite(uuid, uuid) to service_role;
grant execute on function invite_api.mark_sent(uuid, uuid, boolean) to service_role;
grant execute on function invite_api.list_invites(uuid, text, uuid, uuid, uuid) to service_role;
grant execute on function invite_api.accept_invite(uuid, text) to service_role;
grant execute on function invite_api.erase_user_data(uuid) to service_role;
grant execute on function invite_api.counsel_side(uuid, uuid) to service_role;

-- the single anonymous entry point
grant execute on function public.invite_preview(text) to anon, authenticated;
