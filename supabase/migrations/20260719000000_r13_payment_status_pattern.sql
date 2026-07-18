-- R13 step 1 — the reusable payment-placeholder pattern. Audit found
-- roast_sessions.payment_status already exists ('comp'/'pending'/'paid'),
-- added in the original Founder Roast migration with the Stripe gate
-- explicitly deferred (roast-fn.ts:266 comment). Rather than build a
-- parallel column, this migration widens the existing enum to the full
-- 4-state vocabulary this task specifies, so every future paid feature
-- (deal-close fee, etc.) can reuse the exact same value set on its own
-- table's own payment_status column:
--
--   not_required   — this row/feature never needed payment (default for
--                    features that aren't fee-gated; not currently used
--                    by roast, since every roast level has a fee, but
--                    kept in the shared vocabulary for future features)
--   pending_payment — fee owed, not yet confirmed
--   paid            — confirmed via the placeholder (or, later, a real
--                    Stripe PaymentIntent)
--   waived          — comped/free, explicitly granted (renames roast's
--                    existing 'comp' value — same meaning, standardized
--                    name so all future features share one vocabulary)
--
-- TODO(stripe): every payment_status write site in this migration and
-- the code that follows it is a PLACEHOLDER — replace with a real Stripe
-- PaymentIntent confirmation once the Hockystick entity is registered
-- and Stripe is wired (CLAUDE.md §22/§32). Search the codebase for this
-- exact TODO string to find every site that needs the swap.

alter table roast_sessions drop constraint roast_sessions_payment_status_check;
alter table roast_sessions alter column payment_status drop default;
update roast_sessions set payment_status = 'waived' where payment_status = 'comp';
update roast_sessions set payment_status = 'pending_payment' where payment_status = 'pending';
alter table roast_sessions alter column payment_status set default 'pending_payment';
alter table roast_sessions add constraint roast_sessions_payment_status_check
  check (payment_status in ('not_required', 'pending_payment', 'paid', 'waived'));
