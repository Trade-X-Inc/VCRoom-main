-- R4B step 4: enforce the investor_profiles public_fields whitelist at the
-- query layer, not just in the /i/:slug page's JSX.
--
-- Also fixes a pre-existing bug found while wiring this up: investor_profiles
-- has no RLS policy granting anon SELECT at all (confirmed live — only
-- investor_profiles_own, investor_profiles_peer_read, and
-- founder_read_dealroom_investor_profile exist, none anon-facing). The
-- public profile page has therefore been silently broken for logged-out
-- visitors — select("*") with the anon client returned nothing. This
-- function is SECURITY DEFINER so it can serve anon callers, but it is safe:
-- it re-checks profile_published = true internally before returning
-- anything, and only ever returns that row's own whitelisted columns —
-- it cannot be used to read an unpublished or arbitrary profile.
create or replace function public.get_public_investor_profile(p_slug text)
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
  where p.profile_slug = p_slug
    and p.profile_published = true
  limit 1;
$$;

grant execute on function public.get_public_investor_profile(text) to anon, authenticated;

comment on function public.get_public_investor_profile(text) is
  'Public /i/:slug lookup, callable by anon. Returns only investor_profiles.id plus columns listed in that row''s own public_fields whitelist. SECURITY DEFINER, but re-checks profile_published=true internally and only exposes the whitelist — cannot leak unpublished profiles or non-whitelisted fields.';
