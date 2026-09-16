-- Library — the private document container, stage 1 of 3 (Library -> Data
-- Pack -> Information Vault). New table, not a rename/reuse of
-- founder_documents — confirmed via live RLS read that founder_documents
-- carries a real cross-owner share path (investor_read_approved_docs),
-- architected for eventual sharing, the opposite of Library's
-- never-shareable premise. founder_documents is untouched by this
-- migration.
--
-- Scope of this pass (3a-i): the container only. No AI, no analysis, no
-- cross-document anything, no digital-doc builder. analysis_status is
-- deliberately NOT added here — it belongs with 3a-ii/3b's analysis work,
-- and will land as an additive ALTER TABLE, not a redesign.
--
-- Single-owner isolation is the load-bearing §15/§25 constraint: RLS
-- below is EXACTLY one policy, keyed only on owner_id = the caller's own
-- resolved uid. No team-permission policy (explicit product decision —
-- single-user only, unlike founder_documents' team-access model). No
-- policy of any kind joins to deal_rooms, discovery_requests, or any
-- other user's identity — any future PR introducing such a join here is
-- a matching-surface violation on sight, not a narrow-it-later item.
--
-- No pack_api authz_* helper is used or created: every existing
-- authz_* primitive is deal-room- or startup-scoped (confirmed by
-- reading all ten live definitions before writing this migration) and
-- none applies to a table with no deal_room_id/startup_id at all.
-- Matching this codebase's own real convention for single-owner tables
-- with no such scope (advisor_messages_own, activities_own, vc_leads'
-- "Founders can read own vc_leads" — all inline auth.uid() predicates,
-- no helper function), the policy below is written inline.
--
-- Reconciled against pg_get_functiondef/information_schema of the LIVE
-- applied table before this file was finalized (CLAUDE.md §7.2) — the
-- live apply is stricter than this file's first draft in four places,
-- all real improvements, all folded in here rather than left as drift:
-- file_size is bigint (not int4, matching founder_documents/documents'
-- own file_size columns more closely than this file's original int4
-- guess); content/created_at/updated_at are NOT NULL (the draft relied
-- on the column default alone); and scan_status carries an explicit
-- CHECK constraint (the draft had none, following founder_documents'
-- own precedent of no CHECK on that column — the live apply chose to
-- add one here instead, which is stricter and correct, not a drift to
-- paper over).

create table public.library_documents (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('founder', 'investor')),
  owner_id uuid not null,
  source text not null default 'uploaded' check (source in ('uploaded', 'builder_created')),
  category text not null check (category in (
    'company', 'legal', 'finance', 'operations', 'product', 'team', 'market', 'other'
  )),
  scan_status text not null default 'pending' check (scan_status in ('pending', 'clean', 'quarantined')),
  visibility text not null default 'private',
  file_path text,
  file_name text,
  file_size bigint,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.library_documents is
  'Stage 1 of the document lifecycle (Library -> Data Pack -> Information Vault). Private, single-owner, never shareable — visibility is always ''private'' by construction (Library code writes no other value; there is no CHECK constraint forcing this, matching founder_documents'' own precedent, but no write path in this table''s owning code ever sets a different value). owner_type/owner_id together identify either a founder or an investor''s own private document store. analysis_status is deliberately NOT a column here — it lands with the 3a-ii/3b analysis work as an additive column.';

comment on column public.library_documents.owner_id is
  'The document owner''s own auth.uid() directly — never a startup_id indirection (unlike founder_documents). Always the resolved caller identity from their own token; a caller-supplied owner_id is never trusted (CLAUDE.md §7.1).';

comment on column public.library_documents.scan_status is
  'pending | clean | quarantined. Same convention as founder_documents/documents (migration 20260916000000). Set by the upload-security-gate edge function (magic-byte + scan-stub pipeline). A pending or quarantined row must never be surfaced as usable — the Library list query filters on scan_status=''clean'' in addition to RLS''s owner_id scoping.';

comment on column public.library_documents.source is
  '''uploaded'' (this pass) or ''builder_created'' (3a-iii, the digital document builder — not built yet). This pass writes only ''uploaded''.';

comment on column public.library_documents.category is
  'Fixed 8-value enum, owner-agnostic (covers both founder and investor document types), deliberately distinct from the founder-pitch-specific 5-category convention already live in founder_documents (market/financials/team/product/legal, stored as free text inside content->>''category'' there) — that existing code''s own comment records being burned once by "a category enum that never matched this app''s categories"; this column is a real CHECK constraint specifically to avoid repeating that drift.';

-- ── RLS ───────────────────────────────────────────────────────────────────
alter table public.library_documents enable row level security;

create policy library_documents_own
  on public.library_documents
  for all
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- No other policy. No team-permission policy (explicit decision — single-
-- user only, unlike founder_documents). No cross-owner read of any kind.
