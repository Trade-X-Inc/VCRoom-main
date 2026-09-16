-- Per-doc clarity check (3a-ii) — two additive columns on library_documents,
-- deferred from 3a-i's container migration for exactly this pass.
--
-- analysis_status is SEPARATE from scan_status (3a-i) and carries the §7.4
-- "plausible-wrong" lesson explicitly: a document with zero clarity flags
-- must be distinguishable, at read time, between "analyzed, genuinely
-- nothing found" (analysis_status='analyzed') and "never checked at all"
-- (analysis_status='unanalyzed'). The UI branches on this column FIRST,
-- never on clarity_feedback's flag-array length — this is the exact
-- completeness_score=0 mistake (founder_documents) this migration exists
-- to not repeat.
--
-- 'analyzing' is a real, held state, not a client-only optimistic flag: it
-- is set server-side by the clarity-check action the instant the AI call
-- begins (before the OpenAI request is issued), so a concurrent reader
-- (a second tab, a page refresh mid-check) sees a genuine "in progress"
-- state, not a stale 'unanalyzed' that would misleadingly suggest nothing
-- is happening. On any failure of the AI call (throw, timeout, non-2xx,
-- parse failure), the action resets this back to 'unanalyzed' — it must
-- never be left stuck at 'analyzing' (a permanently-spinning button in the
-- UI). This migration only adds the column; the reset-on-failure guarantee
-- is enforced in the action's own handler, not by any DB constraint (no
-- server-side timeout mechanism exists at the SQL layer to force this).

alter table public.library_documents
  add column analysis_status text not null default 'unanalyzed'
    check (analysis_status in ('unanalyzed', 'analyzing', 'analyzed'));

-- clarity_feedback is a DEDICATED column, deliberately not the existing
-- `content` jsonb column — `content` is reserved (per the 3a-i migration's
-- own comment) for 3a-iii's digital-doc-builder field data, a materially
-- different concept (structured field values a human edits) from
-- AI-generated read-only feedback. Nullable, no default: NULL
-- unambiguously means "no feedback stored," distinct from '{}'::jsonb
-- (which could be misread as "checked, found nothing" — the same
-- ambiguity analysis_status exists to prevent, so clarity_feedback's own
-- null-ness must not quietly reintroduce it). Replaced wholesale on
-- every re-run, never merged or appended — a stale prior result must
-- never linger alongside a new one.
alter table public.library_documents
  add column clarity_feedback jsonb;

comment on column public.library_documents.analysis_status is
  'unanalyzed | analyzing | analyzed. Set by the library-clarity-check pack_api action. The UI MUST branch on this column before ever looking at clarity_feedback''s contents — a document with zero flags and analysis_status=analyzed is a real "nothing found" result; the same zero flags with analysis_status=unanalyzed means "never checked." Never infer analysis state from clarity_feedback alone (CLAUDE.md §7.4).';

comment on column public.library_documents.clarity_feedback is
  'AI-generated clarity feedback for this ONE document only (summary/flags/recommendations, no scoring fields — §15/§25). NULL until a clarity check has actually run. Replaced wholesale on every re-run. Never entered into the append-only record (§8.3/§10) — the record for this action carries only a minimal fact ({checked: true}), never this column''s contents.';
