# R15B step 5 — agreement upload + review cycle (logic, live DB)

lib/agreement-fn.ts (uploadAgreement / requestAgreementChanges / acceptAgreement)
+ TermClosingPanel UI. Verified against the live fixture room:

Cycle (lawyer is the designated uploader since a lawyer is a room member):
- lawyer uploads v1 (pending)
- founder requests changes with a required comment ("Clause 4 should say 12
  months, not 6") -> v1 status changes_requested, comment recorded
- lawyer uploads v2 -> v1 SUPERSEDED (preserved as history, not deleted), v2 pending
- founder accepts v2 -> awaiting investor
- investor accepts v2 -> BOTH accepted -> v2 status 'accepted' = FINALIZED

Confirmed: version history preserved (v1 superseded + v2 accepted, no overwrite),
change comment preserved, both-party acceptance required to finalize.

R15C ENTRY CONDITION (the terminal state R15C keys off):
  exists (select 1 from deal_room_agreements
          where deal_room_id = :id and status = 'accepted'
            and accepted_by_founder and accepted_by_investor)
-> READY. The finalized agreement row (+ its storage_path) is R15C's input.

Full adversarial (unauthorized uploader, unilateral accept, version deletion)
in step 6; full live UI walk (both lawyer + no-lawyer paths) in step 7.
