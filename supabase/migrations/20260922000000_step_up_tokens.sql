-- Step-up token storage (Gate B, 22 Sep 2026)
--
-- Backs verifyStepUp(password) (src/lib/step-up-fn.ts's verifyPassword(),
-- approved at Gate A). Recon reported and approved before this file was
-- written: a signed/stateless token was rejected because this codebase has
-- no signing library and no JWT secret anywhere (checked directly, not
-- assumed), and a stateless token can't be revoked early or enforced
-- single-use without a server-side record anyway -- at which point it's a
-- strictly more complex version of this table. A DB round-trip per gated
-- action is not a real cost here: these are six low-frequency, high-
-- consequence actions, not a hot path.
--
-- Shape follows this session's own established pattern (auth_admin's
-- expire_stale_sessions(), erase_user_account()): SECURITY DEFINER
-- function, search_path with pg_temp LAST (CLAUDE.md §7.2 -- 'public'
-- alone is not safe, pg_temp is searched implicitly first), explicit
-- REVOKE FROM PUBLIC + GRANT TO service_role (new SECURITY DEFINER
-- functions default to EXECUTE TO PUBLIC and that default has bitten this
-- codebase before -- six room_get_* functions, 9 Aug 2026).
--
-- No raw table grant to service_role either -- only the two functions
-- below can read/write this table, same "no direct grant, function-only"
-- boundary auth_admin.expire_stale_sessions() already established for
-- auth.sessions.
--
-- Single-use: mint_step_up_token() invalidates any prior unconsumed token
-- for the same user (one live token per user at a time, not accumulating
-- rows). verify_and_consume_step_up_token() sets consumed_at on success
-- and will not accept the same token twice -- a stolen token is only
-- usable once, and a legitimate second use (e.g. retrying a gated action)
-- must go back through verifyStepUp(password) to mint a fresh one. 5-
-- minute TTL enforced in SQL (expires_at), not trusted from the caller.

create table if not exists pack_api.step_up_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz
);

-- One active lookup path: by hash. No index needed on user_id for the
-- verify path (token_hash is the only thing a caller presents), but mint
-- needs to find + invalidate this user's prior live tokens.
create unique index if not exists step_up_tokens_hash_idx on pack_api.step_up_tokens (token_hash);
create index if not exists step_up_tokens_user_live_idx on pack_api.step_up_tokens (user_id) where consumed_at is null;

revoke all on pack_api.step_up_tokens from public, anon, authenticated, service_role;

-- Mints a new step-up token for p_uid. Invalidates (consumes, does not
-- delete -- keeps a real audit trail rather than erasing rows) any prior
-- unconsumed token for the same user first, so at most one live token per
-- user exists at a time. Returns the raw token (given to the client) --
-- only its sha256 hash is ever stored, same principle as never storing a
-- plaintext password/session token at rest.
create or replace function pack_api.mint_step_up_token(p_uid uuid)
returns jsonb
language plpgsql
security definer
set search_path = extensions, public, pg_temp
as $function$
declare
  v_raw_token text;
  v_hash text;
begin
  if p_uid is null then
    return jsonb_build_object('ok', false, 'error', 'uid_required');
  end if;

  -- Invalidate any prior unconsumed token for this user -- single live
  -- token per user, not an accumulating set of valid grants.
  update pack_api.step_up_tokens
  set consumed_at = now()
  where user_id = p_uid and consumed_at is null;

  v_raw_token := encode(gen_random_bytes(32), 'hex');
  v_hash := encode(digest(v_raw_token, 'sha256'), 'hex');

  insert into pack_api.step_up_tokens (user_id, token_hash, expires_at)
  values (p_uid, v_hash, now() + interval '5 minutes');

  return jsonb_build_object('ok', true, 'token', v_raw_token, 'expires_in_seconds', 300);
end;
$function$;

-- Verifies + consumes a step-up token in one atomic step (select-for-update
-- then mark consumed, so two concurrent uses of the same token can't both
-- succeed). Checks: exists, belongs to p_uid (a token minted for one user
-- can never authorize a different user's gated action -- token_hash alone
-- is not sufficient, ownership is re-checked here), not expired, not
-- already consumed. Returns ok:true only when all four hold.
create or replace function pack_api.verify_and_consume_step_up_token(p_uid uuid, p_token text)
returns jsonb
language plpgsql
security definer
set search_path = extensions, public, pg_temp
as $function$
declare
  v_hash text;
  v_row pack_api.step_up_tokens%rowtype;
begin
  if p_uid is null or p_token is null or p_token = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_request');
  end if;

  v_hash := encode(digest(p_token, 'sha256'), 'hex');

  select * into v_row
  from pack_api.step_up_tokens
  where token_hash = v_hash
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;

  if v_row.user_id <> p_uid then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;

  if v_row.consumed_at is not null then
    return jsonb_build_object('ok', false, 'error', 'already_used');
  end if;

  if v_row.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;

  update pack_api.step_up_tokens set consumed_at = now() where id = v_row.id;

  return jsonb_build_object('ok', true, 'uid', p_uid);
end;
$function$;

revoke execute on function pack_api.mint_step_up_token(uuid) from public;
grant execute on function pack_api.mint_step_up_token(uuid) to service_role;

revoke execute on function pack_api.verify_and_consume_step_up_token(uuid, text) from public;
grant execute on function pack_api.verify_and_consume_step_up_token(uuid, text) to service_role;
