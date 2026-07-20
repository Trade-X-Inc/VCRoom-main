# R15B step 4 — re-open flow verification (logic, live DB)

The re-open flow lives in lib/agreement-fn.ts (requestReopen / resolveReopen) and
the re-open UI in components/app/TermClosingPanel.tsx. Verified against the live
fixture room (11111111-...):

- Mutual-confirm guard: founder requests -> resolver must be a PRINCIPAL and
  != requester. Confirmed: founder self-approval would be blocked
  (requested_by = caller); investor (!= requester) can approve.
- Approval effect (investor approves founder's request): terms unlock
  (deal_room_term_config.locked_at -> null; 0 locked terms), active summary
  -> archived (reason "terms re-opened for renegotiation"), open agreement
  versions -> superseded, request -> consumed.
- Lawyer cannot resolve (resolveReopen rejects role='lawyer').

Full adversarial verification (unilateral attempt via the real fns + UI) is in
the step-6 security pass and the step-7 live re-open walk.
