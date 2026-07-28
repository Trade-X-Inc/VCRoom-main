-- R42 (1/4) — pattern-proof move. See CLAUDE.md §50.
--
-- SECURITY DEFINER functions are owned by postgres (BYPASSRLS), so RLS is not
-- a backstop inside them. When such a helper is RPC-reachable (in `public`,
-- which PostgREST exposes, with EXECUTE to anon/authenticated) AND trusts a
-- caller-supplied ID instead of deriving auth.uid(), an attacker passes a
-- foreign ID and gets the data -- no shadowing needed. R42 live-proved
-- get_user_deal_room_ids('<victim uuid>') returned the victim's private
-- deal-room list to a zero-membership account.
--
-- Fix: move such helpers into `rls_private`, a schema PostgREST does NOT
-- expose (it exposes only public + graphql_public), so they stop being RPC-
-- reachable while RLS policies still call them schema-qualified. EXECUTE
-- cannot be revoked from authenticated because policy expressions run AS the
-- querying user -- the querying user must retain EXECUTE.
--
-- This migration establishes the pattern on ONE helper and repoints its 5
-- dependent policies (4 public + 1 storage). Verified: policies still return
-- correct rows for real members; the function is unreachable via attacker
-- RPC, via Content-Profile: rls_private (PostgREST 406), and even via a
-- service-role REST call (404) -- so anything called server-side by service
-- role must stay in public.

create schema if not exists rls_private;
grant usage on schema rls_private to authenticated, anon, service_role;

create or replace function rls_private.get_user_deal_room_ids(p_user_id uuid)
returns setof uuid
language sql stable security definer
set search_path = ''
as $$
  select deal_room_id from public.deal_room_members
  where user_id = p_user_id and deal_room_id is not null;
$$;
grant execute on function rls_private.get_user_deal_room_ids(uuid) to authenticated, anon, service_role;

alter policy drm_room_members_read on public.deal_room_members
  using (deal_room_id in (select rls_private.get_user_deal_room_ids(auth.uid())));

alter policy nda_room_members_read on public.nda_acceptances
  using (deal_room_id in (select rls_private.get_user_deal_room_ids(auth.uid())));

alter policy nda_docs_member_read on public.nda_documents
  using (deal_room_id in (select rls_private.get_user_deal_room_ids(auth.uid())));

alter policy closure_report_participant_read on public.deal_room_closure_reports
  using (
    (EXISTS ( SELECT 1 FROM deal_rooms dr
      WHERE dr.id = deal_room_closure_reports.deal_room_id AND is_startup_founder(dr.startup_id)))
    OR (deal_room_id IN ( SELECT rls_private.get_user_deal_room_ids(auth.uid()) ))
  );

alter policy documents_bucket_insert on storage.objects
  with check (
    (bucket_id = 'documents'::text) AND (
      (((storage.foldername(name))[1] = 'founder-docs'::text) AND is_startup_founder(((storage.foldername(name))[2])::uuid))
      OR (((storage.foldername(name))[1] <> 'founder-docs'::text) AND ((storage.foldername(name))[1] <> 'personal'::text)
          AND (((storage.foldername(name))[1])::uuid IN ( SELECT rls_private.get_user_deal_room_ids(auth.uid()) )))
      OR (((storage.foldername(name))[1] = 'personal'::text) AND ((storage.foldername(name))[2] = (auth.uid())::text))
    )
  );

drop function public.get_user_deal_room_ids(uuid);
