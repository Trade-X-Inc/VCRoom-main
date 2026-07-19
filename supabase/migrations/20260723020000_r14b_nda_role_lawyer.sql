-- R14B step 4 — nda_acceptances.role only allowed 'founder'/'investor',
-- discovered while setting up a live screenshot fixture: a lawyer could
-- never actually sign the room NDA, which would silently block them from
-- the deal room entirely (app.deal-rooms.$id.tsx redirects any signed-in
-- member with no nda_acceptances row to /nda). nda-fn.ts's
-- formatSignerRole() already had a case for 'lawyer' (plus 'analyst' and
-- 'viewer') — the CHECK constraint was never widened to match, a stale
-- constraint left over from before those signer types existed.

alter table nda_acceptances drop constraint nda_acceptances_role_check;
alter table nda_acceptances add constraint nda_acceptances_role_check
  check (role = any (array['founder', 'investor', 'lawyer', 'analyst', 'viewer']));
