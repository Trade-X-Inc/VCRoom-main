-- R4B step 7 follow-up: after removing investor_profiles_peer_read /
-- founder_read_dealroom_investor_profile, several existing app pages that
-- read OTHER users' investor_profiles rows (not their own) broke silently —
-- they now get zero rows back. All of these only ever needed the same
-- public_fields whitelist subset that the /i/:slug page and mutual
-- disclosure's locked state already use, never the gated private profile.
-- These two RPCs fix them without restoring the broken broad policy.

create or replace function public.get_public_investor_profile_by_user_id(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when p.id is null then null else (
    select jsonb_object_agg(key, value)
    from jsonb_each(to_jsonb(p))
    where key = 'id' or key = any(p.public_fields)
  ) end
  from investor_profiles p
  where p.user_id = p_user_id
  limit 1;
$$;

comment on function public.get_public_investor_profile_by_user_id(uuid) is
  'Same whitelist enforcement as get_public_investor_profile(slug), looked up by user_id instead. Used by useDealRoomContext for the always-visible (pre-unlock) investor name/fund/thesis summary shown on deal-room tabs, and by join-investor.$token.tsx''s invite landing page — NOT gated by profile_published, since a deal-room counterparty or invite-link recipient should see these safe fields regardless of whether the investor has published a public page.';

grant execute on function public.get_public_investor_profile_by_user_id(uuid) to anon, authenticated;

create or replace function public.get_public_investor_profiles_by_user_ids(p_user_ids uuid[])
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(row_data), '[]'::jsonb)
  from (
    select (
      select jsonb_object_agg(key, value)
      from jsonb_each(to_jsonb(p))
      where key in ('id', 'user_id') or key = any(p.public_fields)
    ) as row_data
    from investor_profiles p
    where p.user_id = any(p_user_ids)
  ) sub;
$$;

comment on function public.get_public_investor_profiles_by_user_ids(uuid[]) is
  'Batch whitelist-filtered investor profile lookup for directory/connections/requests panels showing multiple other investors at once (app.directory.tsx, app.connections.tsx, app.overview.tsx, app.index.tsx). Each row only exposes that investor''s own public_fields whitelist plus id/user_id.';

grant execute on function public.get_public_investor_profiles_by_user_ids(uuid[]) to authenticated;
