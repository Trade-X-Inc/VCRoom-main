-- R15B step 6 — honest summary-generation failure state.
--
-- Found in the step-6 pass: when summary auto-generation fails after terms lock,
-- the failure was only console.error'd; the UI showed "Summary is being
-- generated…" indefinitely — a blank/limbo panel that looks like nothing went
-- wrong. This adds a durable failure marker the UI can read, so it can show an
-- honest error state with a retry, instead of a permanent fake "generating".
--
-- The marker lives on deal_room_term_config (where the lock lives): set when
-- generation fails after lock, cleared on a successful generation. It is
-- read-only to clients via the existing config SELECT policy (principals) — the
-- lawyer reads the summary via dr_is_room_member; the config error flag is a
-- principal concern (they own retry), consistent with regenerateSummary being
-- principal-only.

alter table deal_room_term_config
  add column if not exists summary_error text,
  add column if not exists summary_error_at timestamptz;

comment on column deal_room_term_config.summary_error is
  'R15B: last summary-generation failure reason after a lock, or null. Set by '
  'buildSummaryForRoom on failure, cleared on success. Drives the UI honest '
  'error state (locked but no active summary + this set => show error + retry).';
