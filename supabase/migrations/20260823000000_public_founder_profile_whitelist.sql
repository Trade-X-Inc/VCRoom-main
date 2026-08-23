-- Closes a live data exposure on /p/:slug (founder public profile).
--
-- p.$slug.tsx's SSR loader used the SERVICE-ROLE key with select("*") on
-- startups (77 columns), filtered only on profile_published = true. The
-- whole row was serialized into the SSR payload; the page's section-gating
-- logic (getVisibility/SectionGate) decided only what to RENDER, never what
-- to SEND. Confirmed live in production (grep -a on the real HTML response,
-- not grep -- the response has no newlines and one grep pass silently
-- reported zero matches for everything by treating the file as binary):
-- founder_email, burn_rate, runway_months, unit_economics, org_code and
-- completeness_score were all present in the HTML for a published profile
-- whose own section_visibility marked "financials" as deal_room-only.
--
-- git log -S pins introduction to dc32c6d (14 Jun 2026) in this exact final
-- shape -- service-role + select(*) + client-side-only gating, all present
-- at first commit. 70 days exposed as of this fix (23 Aug 2026).
--
-- /i/:slug (the investor mirror of this same feature) already does this
-- correctly: get_public_investor_profile() is SECURITY DEFINER, re-checks
-- profile_published internally, and returns only that row's own
-- public_fields whitelist, filtered in SQL. This function mirrors that
-- shape for startups. investor_profiles stores its whitelist as a column
-- (public_fields text[]); startups has no equivalent column -- visibility
-- is per-SECTION (section_visibility jsonb), not per-field, so the
-- section -> field map is expressed in this function's own SQL rather than
-- read from a stored column.
--
-- The section -> field map was derived from p.$slug.tsx's own SectionGate
-- usage, matched against the REAL open/close line ranges of each gate (not
-- a naive "scan to the next gate" approach, which silently overshoots into
-- unrelated page chrome on some sections and misses content between gates
-- on others -- both happened on the first pass of this audit and were
-- caught only by re-deriving the map against exact line boundaries before
-- considering the fix complete):
--
-- ALWAYS-PUBLIC fields (render unconditionally, outside every SectionGate,
-- in the page's own "identity" header/summary block): id, founder_id
-- (needed for the page's own owner-preview check), company_name, tagline,
-- logo_url, sector, stage, country, profile_slug, description, problem,
-- solution, why_us, why_now, founder_name, funding_target, team_size,
-- intro_video_url, product_video_url, social_links, section_visibility.
-- founder_name and why_now ALSO appear inside the gated market/team
-- sections for fuller detail, but the identity block renders them
-- unconditionally regardless of those sections' visibility -- gating them
-- would have silently blanked the identity header on any row with
-- market/team set to non-public.
--
-- CONDITIONAL fields, returned only when that row's own
-- section_visibility[section] = 'public':
--   business_model: business_model, pricing, revenue, revenue_model,
--                    target_customer, use_of_funds
--   market:         competitive_advantage, competitors, market_size, moat,
--                    sam, tam, target_customer
--   traction:       customer_count, growth_rate, key_metric, milestones,
--                    traction
--   financials:     burn_rate, current_investors, previous_funding,
--                    runway_months, unit_economics, valuation
--   team:           advisors, cofounder_linkedin, cofounder_name,
--                    founder_linkedin
--
-- NEVER included, at any visibility, for any row: founder_email and
-- pitch_deck_url render under NO SectionGate anywhere on the page -- they
-- were never displayable at all, public row or not, and shipped in every
-- payload regardless. Also excluded: registration_number, org_code,
-- completeness_score, mrr_usd, founder_ownership_pct, has_options_pool,
-- total_shareholders, fundraising_*, registry_*, legal_entity_name,
-- incorporated_*, investor_narrative, publicly_discoverable, and every
-- timestamp/internal column.
--
-- STANDING LESSON this incident produced (CLAUDE.md, logged alongside this
-- migration): "zero readers" is a claim about the CODE, not about what a
-- service-role select(*) actually TRANSMITS -- the two are not the same
-- fact. Treating column exposure as safe because nothing currently renders
-- it is the same reasoning error that let this ship for 70 days.

create or replace function public.get_public_founder_profile(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select case when s.id is null then null else (
    jsonb_build_object(
      'id', s.id,
      'founder_id', s.founder_id,
      'company_name', s.company_name,
      'tagline', s.tagline,
      'logo_url', s.logo_url,
      'sector', s.sector,
      'stage', s.stage,
      'country', s.country,
      'profile_slug', s.profile_slug,
      'description', s.description,
      'problem', s.problem,
      'solution', s.solution,
      'why_us', s.why_us,
      'why_now', s.why_now,
      'founder_name', s.founder_name,
      'funding_target', s.funding_target,
      'team_size', s.team_size,
      'intro_video_url', s.intro_video_url,
      'product_video_url', s.product_video_url,
      'social_links', s.social_links,
      'section_visibility', s.section_visibility
    )
    ||
    case when coalesce(s.section_visibility->>'business_model', 'on_request') = 'public'
      then jsonb_build_object(
        'business_model', s.business_model,
        'pricing', s.pricing,
        'revenue', s.revenue,
        'revenue_model', s.revenue_model,
        'target_customer', s.target_customer,
        'use_of_funds', s.use_of_funds
      )
      else '{}'::jsonb
    end
    ||
    case when coalesce(s.section_visibility->>'market', 'on_request') = 'public'
      then jsonb_build_object(
        'competitive_advantage', s.competitive_advantage,
        'competitors', s.competitors,
        'market_size', s.market_size,
        'moat', s.moat,
        'sam', s.sam,
        'tam', s.tam,
        'target_customer', s.target_customer
      )
      else '{}'::jsonb
    end
    ||
    case when coalesce(s.section_visibility->>'traction', 'on_request') = 'public'
      then jsonb_build_object(
        'customer_count', s.customer_count,
        'growth_rate', s.growth_rate,
        'key_metric', s.key_metric,
        'milestones', s.milestones,
        'traction', s.traction
      )
      else '{}'::jsonb
    end
    ||
    case when coalesce(s.section_visibility->>'financials', 'deal_room') = 'public'
      then jsonb_build_object(
        'burn_rate', s.burn_rate,
        'current_investors', s.current_investors,
        'previous_funding', s.previous_funding,
        'runway_months', s.runway_months,
        'unit_economics', s.unit_economics,
        'valuation', s.valuation
      )
      else '{}'::jsonb
    end
    ||
    case when coalesce(s.section_visibility->>'team', 'on_request') = 'public'
      then jsonb_build_object(
        'advisors', s.advisors,
        'cofounder_linkedin', s.cofounder_linkedin,
        'cofounder_name', s.cofounder_name,
        'founder_linkedin', s.founder_linkedin
      )
      else '{}'::jsonb
    end
  ) end
  from public.startups s
  where s.profile_slug = p_slug
    and s.profile_published = true
  limit 1;
$$;

grant execute on function public.get_public_founder_profile(text) to anon, authenticated;

comment on function public.get_public_founder_profile(text) is
  'Public /p/:slug lookup, callable by anon. Mirrors get_public_investor_profile(): SECURITY DEFINER, re-checks profile_published=true internally, returns the always-public field set (identity header fields including founder_name/why_now, plus founder_id for the page''s own owner-preview check) plus each conditional section''s fields where that row''s own section_visibility marks the section public. founder_email and pitch_deck_url are never returned under any condition -- they render under no visibility level on the page. Closes the 70-day exposure fixed 23 Aug 2026 (select(*) with the service-role key, gated client-side only).';
