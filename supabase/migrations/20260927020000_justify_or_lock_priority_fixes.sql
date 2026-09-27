-- Justify-or-lock audit, Migration 2 (the real fixes) — 27 Sep 2026.
-- Three functions, each with a live, exploitable-by-any-authenticated-caller
-- (or, for check_and_increment_ai_usage, exploitable-by-ANY-caller-at-all
-- including anon) defect. Landed together with the frontend change swapping
-- all 11 real call sites of check_and_increment_ai_usage's anon-key usage
-- to the service-role key, in the same commit — no dual-path window, same
-- standard as finalize_deal_close / counsel-gate / advance_workflow_stage.
--
-- Recon summary (full detail in the session's own report, reproduced here
-- so this migration is self-explanatory read cold):
--
-- 1. notify_invite_recipient — PATTERN A (client-side session call, real
--    caller's own JWT). Called from invite-fn.ts's sendInviteEmail via a
--    fresh createClient(anonKey, { Authorization: Bearer <forwarded real
--    user token> }) — auth.uid() already resolves correctly inside this
--    function today. NOT an identity-source bug. The real defect: the
--    function only checks that an `invites` row exists matching
--    (p_invite_id, p_deal_room_id) — it never checks the CALLER is that
--    invite's own inviter, nor that p_recipient_user_id actually matches
--    the invite's target email. Any authenticated caller who knows or
--    guesses a real (invite_id, deal_room_id) pair can write an
--    arbitrary-content notification (fully attacker-controlled title/
--    body/action_url) into ANY user's notification feed, impersonating
--    the platform. Fixed by adding invited_by = auth.uid() to the exists
--    check and cross-verifying p_recipient_user_id resolves to the
--    invite's own email via a join to public.users.
--
-- 2. global_search — PATTERN A (client-side session call, browser's own
--    anon-key singleton with a real bound session). Called from
--    AppShell.tsx via the plain `supabase` client — auth.uid() already
--    resolves correctly. NOT an identity-source bug. The real defect:
--    searcher_id/searcher_role are raw PARAMETERS, never checked against
--    auth.uid() — any authenticated caller can pass another user's id as
--    searcher_id and read that user's own deal-room documents and deal-
--    room list (the function's document/deal-room branches filter on
--    dr.startup_id IN (SELECT id FROM startups WHERE founder_id =
--    searcher_id) and dr.investor_email = (SELECT email FROM auth.users
--    WHERE id = searcher_id) — both keyed on the spoofable parameter).
--    Fixed by dropping searcher_id/searcher_role as parameters entirely
--    and deriving both internally from auth.uid()/a real role lookup.
--    Also revoking the anon grant this function held (confirmed live via
--    has_function_privilege — anon should never have held it; searcher_id
--    being spoofable to any arbitrary uuid make anon particularly severe
--    since it required no session of any kind, just a guessed/known uid).
--
-- 3. check_and_increment_ai_usage — the widest exposure found in this
--    audit: proacl carried a bare PUBLIC grant (shown as `=X/postgres`),
--    confirmed anon-executable live via has_function_privilege BEFORE this
--    migration. The function's own body was never reading auth.uid() at
--    all (Pattern B does not apply in the "add p_uid" sense) — it already
--    exclusively used p_user_id, and its two originally-known callers
--    (library.ts via runAction's service-role ctx.sb; the ai-router edge
--    function via its own service-role client) already source p_user_id
--    from a server-verified identity (requireUser()-derived ctx.uid;
--    resolveUid()-derived uid checked against /auth/v1/user) — never
--    client input. BUT a full grep found 9 MORE real call sites
--    (founder-thesis-fn.ts, profile-builder-fn.ts, investor-memo-fn.ts,
--    ai-secure-fn.ts, vision-extract-fn.ts, investor-profile-builder-fn.ts,
--    qa-suggestions-fn.ts, interview-fn.ts, dd-fn.ts, advisor-fn.ts) doing
--    a raw fetch() to /rest/v1/rpc/check_and_increment_ai_usage using the
--    ANON KEY AS THE BEARER TOKEN — meaning PostgREST authenticated every
--    one of those calls as the anon role, with p_user_id passed as a bare
--    parameter the function itself never verified against anything. Every
--    one of those 9 call sites already independently verifies the real
--    caller via requireUser()/verifyUser() before calling — none trusts
--    raw client input for p_user_id — but the RPC layer itself was
--    reachable by literally anyone with the public anon key, bypassing
--    those application-layer checks entirely for a direct caller. All 9
--    call sites are createServerFn handlers (server-side only, never
--    shipped to the browser) and switched to the service-role key in the
--    same commit as this migration (mirroring library.ts/ai-router's
--    already-correct pattern) — no functional change for any real user,
--    since the underlying identity verification was already happening;
--    only the wide-open direct-RPC-call path closes. Locked to
--    service_role-only: REVOKE ALL FROM PUBLIC (closes anon), explicit
--    REVOKE FROM anon/authenticated (defense in depth, in case PUBLIC is
--    ever narrowed without this function being re-audited), GRANT TO
--    service_role only.

-- ============================================================================
-- 1. notify_invite_recipient — verify caller is the invite's own inviter,
--    and that the recipient actually matches the invite's target email.
-- ============================================================================

create or replace function public.notify_invite_recipient(
  p_invite_id uuid,
  p_recipient_user_id uuid,
  p_deal_room_id uuid,
  p_title text,
  p_body text,
  p_action_url text
)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_invite record;
  v_recipient_email text;
begin
  if v_uid is null then
    return;
  end if;

  select i.invited_by, i.email
    into v_invite
  from invites i
  where i.id = p_invite_id and i.deal_room_id = p_deal_room_id;

  if v_invite.invited_by is null then
    return;
  end if;

  -- Caller must be the invite's own inviter — not merely someone who
  -- knows/guessed a real (invite_id, deal_room_id) pair.
  if v_invite.invited_by <> v_uid then
    return;
  end if;

  -- The recipient must actually be the invite's own target, not an
  -- arbitrary user id the caller chooses to spam. Email lives in
  -- auth.users, not public.users (public.users has no email column —
  -- confirmed live before writing this fix, per this codebase's own
  -- established convention, e.g. accept_team_invite's identical lookup).
  select u.email into v_recipient_email from auth.users u where u.id = p_recipient_user_id;
  if v_recipient_email is null or lower(v_recipient_email) <> lower(v_invite.email) then
    return;
  end if;

  insert into notifications (user_id, kind, title, body, meta, action_url, read)
  values (p_recipient_user_id, 'deal_room_invite', p_title, p_body,
          jsonb_build_object('deal_room_id', p_deal_room_id), p_action_url, false);
end;
$$;

comment on function public.notify_invite_recipient(uuid, uuid, uuid, text, text, text) is
  'Justify-or-lock audit fix (27 Sep 2026). Was: exists-check on (invite_id, deal_room_id) only, with no check that the CALLER is that invite''s inviter and no check that the recipient actually matches the invite''s target email — any authenticated caller who knew or guessed a real (invite_id, deal_room_id) pair could write an arbitrary-content notification into any user''s feed. Now: caller must be invited_by, and p_recipient_user_id must resolve to the invite''s own email. No grant change — already authenticated-only, no anon.';

-- Grants unchanged (already authenticated + service_role, no anon) —
-- confirmed via live proacl before this migration was written; the defect
-- was internal-logic, not grant-shape, for this one function.

-- ============================================================================
-- 2. global_search — derive identity internally, never trust caller-
--    supplied searcher_id/searcher_role.
-- ============================================================================

drop function if exists public.global_search(text, uuid, text, integer);

create or replace function public.global_search(search_query text, result_limit integer default 10)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
DECLARE
  searcher_id uuid := auth.uid();
  results jsonb := '[]'::jsonb;
  startup_results jsonb;
  investor_results jsonb;
  document_results jsonb;
  deal_room_results jsonb;
BEGIN
  IF searcher_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  -- Sanitize query
  IF search_query IS NULL OR length(trim(search_query)) < 2 THEN
    RETURN '[]'::jsonb;
  END IF;

  -- 1. Search startups (visible to everyone)
  SELECT jsonb_agg(row_to_json(r))
  INTO startup_results
  FROM (
    SELECT
      s.id,
      'startup' as type,
      s.company_name as title,
      s.tagline as subtitle,
      s.sector as tag,
      s.stage as tag2,
      s.profile_slug as slug,
      '/p/' || s.profile_slug as url,
      ts_rank(
        to_tsvector('english',
          coalesce(s.company_name, '') || ' ' ||
          coalesce(s.sector, '') || ' ' ||
          coalesce(s.tagline, '')),
        plainto_tsquery('english', search_query)
      ) as rank
    FROM public.startups s
    WHERE s.profile_published = true
    AND to_tsvector('english',
      coalesce(s.company_name, '') || ' ' ||
      coalesce(s.sector, '') || ' ' ||
      coalesce(s.stage, '') || ' ' ||
      coalesce(s.tagline, '') || ' ' ||
      coalesce(s.description, '')
    ) @@ plainto_tsquery('english', search_query)
    ORDER BY rank DESC
    LIMIT result_limit
  ) r;

  -- 2. Search investors (visible to founders and investors)
  SELECT jsonb_agg(row_to_json(r))
  INTO investor_results
  FROM (
    SELECT
      ip.user_id as id,
      'investor' as type,
      coalesce(ip.your_name, '') as title,
      ip.fund_name as subtitle,
      ip.sectors as tag,
      ip.stages as tag2,
      null as slug,
      '/app/directory?tab=investors' as url,
      ts_rank(
        to_tsvector('english',
          coalesce(ip.your_name, '') || ' ' ||
          coalesce(ip.fund_name, '') || ' ' ||
          coalesce(ip.sectors, '')),
        plainto_tsquery('english', search_query)
      ) as rank
    FROM public.investor_profiles ip
    WHERE to_tsvector('english',
      coalesce(ip.your_name, '') || ' ' ||
      coalesce(ip.fund_name, '') || ' ' ||
      coalesce(ip.sectors, '') || ' ' ||
      coalesce(ip.stages, '') || ' ' ||
      coalesce(ip.geography, '') || ' ' ||
      coalesce(ip.role, '')
    ) @@ plainto_tsquery('english', search_query)
    ORDER BY rank DESC
    LIMIT result_limit
  ) r;

  -- 3. Search documents in deal rooms
  -- Only return docs the searcher has access to
  SELECT jsonb_agg(row_to_json(r))
  INTO document_results
  FROM (
    SELECT
      d.id,
      'document' as type,
      d.file_name as title,
      d.category as subtitle,
      d.category as tag,
      null as tag2,
      null as slug,
      '/app/deal-rooms' as url,
      ts_rank(
        to_tsvector('english',
          coalesce(d.file_name, '') || ' ' ||
          coalesce(d.category, '')),
        plainto_tsquery('english', search_query)
      ) as rank
    FROM public.documents d
    JOIN public.deal_rooms dr ON dr.id = d.deal_room_id
    WHERE (
      -- Founder sees their own documents
      dr.startup_id IN (
        SELECT id FROM public.startups
        WHERE founder_id = searcher_id
      )
      OR
      -- Investor sees documents in their deal rooms
      dr.investor_email = (
        SELECT email FROM auth.users WHERE id = searcher_id
      )
    )
    AND to_tsvector('english',
      coalesce(d.file_name, '') || ' ' ||
      coalesce(d.category, '')
    ) @@ plainto_tsquery('english', search_query)
    ORDER BY rank DESC
    LIMIT result_limit
  ) r;

  -- 4. Search deal rooms by name
  SELECT jsonb_agg(row_to_json(r))
  INTO deal_room_results
  FROM (
    SELECT
      dr.id,
      'deal_room' as type,
      s.company_name as title,
      'Deal Room' as subtitle,
      dr.status as tag,
      null as tag2,
      null as slug,
      '/app/deal-rooms' as url,
      1.0 as rank
    FROM public.deal_rooms dr
    JOIN public.startups s ON s.id = dr.startup_id
    WHERE (
      s.founder_id = searcher_id
      OR dr.investor_email = (
        SELECT email FROM auth.users WHERE id = searcher_id
      )
    )
    AND s.company_name ILIKE '%' || search_query || '%'
    LIMIT 3
  ) r;

  -- Combine all results
  results := coalesce(startup_results, '[]'::jsonb) ||
             coalesce(investor_results, '[]'::jsonb) ||
             coalesce(document_results, '[]'::jsonb) ||
             coalesce(deal_room_results, '[]'::jsonb);

  RETURN results;
END;
$function$;

comment on function public.global_search(text, integer) is
  'Justify-or-lock audit fix (27 Sep 2026). Was global_search(search_query, searcher_id, searcher_role, result_limit) with searcher_id/searcher_role as raw, UNVERIFIED parameters — any authenticated caller could pass another user''s id as searcher_id and read that user''s own deal-room documents and deal-room list. Now: searcher_id is derived internally from auth.uid(), searcher_role parameter dropped (was unused in the body — the four branches never referenced it). Signature changed (4 args -> 2); old signature dropped in this migration since the only caller (AppShell.tsx) is updated in the same commit.';

revoke all on function public.global_search(text, integer) from public;
revoke execute on function public.global_search(text, integer) from anon;
grant execute on function public.global_search(text, integer) to authenticated;
grant execute on function public.global_search(text, integer) to service_role;
-- postgres retains implicit execute as function owner.
-- NOTE: kept `authenticated` (not service_role-only) — this function's real
-- caller is AppShell.tsx's plain browser session (Pattern A, confirmed via
-- recon), the same shape as get_public_founder_profile et al. Locking to
-- service_role-only would break the one real caller for no security gain,
-- since the internal auth.uid() derivation is what actually closes the gap.

-- ============================================================================
-- 3. check_and_increment_ai_usage — lock to service_role only. Function
--    BODY IS UNCHANGED (it already exclusively used p_user_id, never
--    auth.uid() — see header note). This is a pure grant fix.
-- ============================================================================

revoke all on function public.check_and_increment_ai_usage(uuid, text) from public;
revoke execute on function public.check_and_increment_ai_usage(uuid, text) from anon;
revoke execute on function public.check_and_increment_ai_usage(uuid, text) from authenticated;
grant execute on function public.check_and_increment_ai_usage(uuid, text) to service_role;
-- postgres retains implicit execute as function owner.
-- All 11 real call sites (library.ts via runAction; the ai-router edge
-- function; and 9 createServerFn handlers — founder-thesis-fn.ts,
-- profile-builder-fn.ts, investor-memo-fn.ts, ai-secure-fn.ts,
-- vision-extract-fn.ts, investor-profile-builder-fn.ts, qa-suggestions-fn.ts,
-- interview-fn.ts, dd-fn.ts, advisor-fn.ts) already use, or were switched in
-- the same commit as this migration to use, the service-role key. No dual-
-- path window.
