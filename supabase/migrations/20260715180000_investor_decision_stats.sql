-- R4B step 5: "median days to decision" for the investor's private
-- (deal-room) profile view. decisions.created_at is the effective decision
-- timestamp (confirmed — no separate decided_at column exists); days is
-- measured from the deal room's own creation to that decision, joined on
-- deal_room_id. Rooms with no recorded decision are excluded, not zero-filled.
create or replace function public.investor_median_days_to_decision(p_investor_user_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select percentile_cont(0.5) within group (order by extract(epoch from (d.created_at - dr.created_at)) / 86400.0)
  from decisions d
  join deal_rooms dr on dr.id = d.deal_room_id
  where d.decided_by = p_investor_user_id;
$$;

comment on function public.investor_median_days_to_decision(uuid) is
  'Median days between deal_rooms.created_at and this investor''s decisions.created_at across all their decided rooms. Returns null if they have no recorded decisions. Used on the private (deal-room) investor profile view.';

grant execute on function public.investor_median_days_to_decision(uuid) to authenticated;
