# TRANSACTION-PRINCIPLES.md

**INTERNAL — build-criteria only. NEVER surface in the public changelog, docs,
marketing copy, or any public-facing surface.** This file exists to give the
vertical build of each deal-room stage a fixed target to build against. It is
not a product description and must never be quoted, paraphrased, or referenced
outside this repository's own build process.

Sibling to `CLAUDE.md` (process) and `ARCHITECTURE.md` (system-as-built).
Same precedence rule as `ARCHITECTURE.md` §0: this file does not govern
anything on its own — `CLAUDE.md` wins on process, the Foundation Document
wins on product. This file is the design criteria that both of those apply to
the deal-room build specifically.

---

## A. The 11 continuous questions

Lengdon must always be able to answer these eleven questions, for any open
transaction, at any stage. They are the design criteria for the control-tower
Home and for each stage's vertical build — a stage is not "done" until the UI
can answer every one of these for that stage, not just render a status.

1. What is missing?
2. What changed?
3. Who is blocking the transaction?
4. Which condition is unsatisfied?
5. What evidence is required?
6. Who has authority to approve it?
7. What happens if nothing happens in 24/48/72 hours?
8. What downstream transactions are affected?
9. What can be automatically prepared?
10. What requires human authorization?
11. What is preventing this transaction from reaching the next valid state?

Use this list as a checklist per stage during the vertical build — not as a
survey to run once. A stage that can answer 8 of 11 today and stops there is
an incomplete build, not a finished one deferred.

---

## B. Control-tower principle

The Home / worklist is an **exception queue**, not a dashboard. Its job is to
surface only what needs a human's attention right now:

- Blocked conditions
- Missing evidence
- Expired verification
- Pending authorization
- Approaching or passed deadlines
- What changed since the user's last review

**Optimize for human attention, not for display.** A row that restates
something the user already knows (a static fact, a count, a vanity metric)
does not belong here. Every row on this page should answer one or more of the
11 questions above for a specific open transaction — if a candidate row
doesn't map onto any of the 11, it's the wrong kind of content for this page.

---

## C. Commitment boundary — Deal Mode vs Transaction Mode

Two distinct modes govern how a deal room behaves, and the shift between them
is deliberate, not gradual:

**Deal Mode** — flexible negotiation, incomplete information tolerated.
Parties are still finding out whether there's a deal at all. Low ceremony,
few hard gates, information can be partial or provisional.

**Transaction Mode** — controlled states, explicit conditions, authorization,
evidence, auditable transitions. Once a transaction enters this mode,
everything tightens: state changes are enumerated and validated (not
freeform), every condition that must be satisfied is explicit and checkable,
every consequential action requires a specific authorized party, evidence is
required rather than assumed, and every transition is recorded, not just
displayed.

**Entry to Transaction Mode is where determinism and authorization tighten.**
This is not a cosmetic UI change — it's the point at which the system stops
being permissive about state and starts enforcing it.

**Mapping onto the existing three-axis lifecycle** (`CLAUDE.md §7.4`'s
documented axes on `deal_rooms`):

| Axis | Deal Mode | Transaction Mode |
|---|---|---|
| `status` | `new` / `pending` (free-text, unconstrained, write-only today) | `active` → `closed`, trigger-guarded (`enforce_deal_room_close_guard`), mutually-confirmed (`finalize_deal_close`) — already the correct shape for Transaction Mode |
| `workflow_stage` | n/a — this axis only exists once a room is created | The canonical 5-stage sequence (`nda_signed → qa → diligence → term_sheet → closing_confirmed`), server-validated adjacency (`advance_workflow_stage`, `enforce_workflow_stage_order`) |
| `prep_status` | `in_prep` — the two-sided-AND checklist gate before a room is even usable | `live` — the room has cleared prep and entered the real workflow |

A room's transition from `prep_status: in_prep` into the real workflow_stage
sequence is the practical entry point into Transaction Mode for this
codebase's existing schema. This mapping is descriptive of the current
schema, not a new axis to build — the axes already exist; what's often
missing (per the record found in `CLAUDE.md`'s deal-room recon) is the
determinism and the audit trail that Transaction Mode is supposed to imply.

---

## D. Vertical-build mandate

**Build each workflow stage to its top level — fully, deeply — before
spreading horizontally.** A stage that answers all 11 questions for founder,
investor, and counsel, with a real audit trail, is a finished stage. Five
stages that each answer 3 of the 11 is not five-fifths of a finished product;
it's a wide, shallow surface that looks more complete than it is.

**Every commit-class event must write an append-only record entry through
the gateway.** No exceptions for "it's just a stage advance" or "the RPC
already has its own authorization check." If the event changes committed
state — a stage advances, a term is accepted, counsel is invited or waived,
a deal closes — it goes through `runAction` (`CLAUDE.md §8.1`/`§20.11`) and
the record chain (`CLAUDE.md §8.3`) captures it, or it isn't done. A
commit-class event that bypasses the gateway is not a shortcut; it's a hole
in the one property (`what happened, when, by whom`) the whole system exists
to guarantee.

---

## E. Qualification Gate ("Alignment Check"; working fallback "Fit Check")

**LOCKED SPEC — build criteria only. Not built yet; see build sequence
below.** Recorded here under this file's own standing rule (see the header
note at the top of this document): never surfaces in public changelog, docs,
marketing copy, or any public-facing surface. Internal build target only.

**Position.** The earliest deal-room stage; **precedes** the `deal_rooms`
row itself. Mutual Proceed triggers creation of a new deal room via the
existing room-creation path (`prep_status`). The append-only record chain
(`CLAUDE.md §8.3`) **starts here** — the gate needs its own recordable
object that links to the `deal_room` on Proceed, so the audit trail is
continuous from first contact through close, not just from room creation
onward.

**Purpose.** Two-sided, self-run mutual qualification before serious data is
shared. Reduces misunderstanding, mismatch, and premature decisions.

**HARD RULE (Foundation §15/§25).** Never platform matching, scoring,
ranking, recommendation, or fit-verdict. Each side checks the other against
**their own** criteria; the system only structures the exchange and echoes
facts; the human decides. This is the same boundary already enforced
elsewhere in this codebase — see `CLAUDE.md §19a`/`§19h`/`§19i` for the
pattern of violations this rule exists to prevent from recurring here.

**Object.** A Criteria Card per party. Each criterion is typed
(numeric-threshold / enum / boolean / short-text / evidence-required) and
tagged **Must** or **Prefer**.

**Authoring modes.** Pre-designed (a reusable card saved on the party's
profile) OR on-spot (built/tweaked ad hoc inside the connection). Same
object either way — the authoring mode is metadata on the card, not a
different schema.

**Reveal model.** Open and symmetric — both parties exchange criteria, then
each discloses against the other's criteria, and disclosures are visible to
the counterparty.

**AI role — permitted, narrowly:**
- Draft criteria from plain-English input (Prepare-class, per `CLAUDE.md
  §8.2`'s tool-class table).
- Normalise a disclosure into the criterion's declared unit, plus a
  completeness-flag.
- Discrepancy-flag a disclosure against the party's own profile or
  already-shared documents.
- Neutral threshold echo — a factual restatement ("your bar X vs. their
  disclosure Y"), never a verdict.

**AI role — never:** aggregate score, percentage, rank, good/bad-fit
label, recommendation, or auto-decision of any kind. Same boundary as §10's
AI-usage table (`CLAUDE.md`) — extraction and completeness-checking are
permitted, scoring and recommendation are not.

**Decisions per side.** Proceed / Hold / Decline. Both Proceed → the deal
room opens. Anything else → a single shared mutual Connection object,
retained until deleted by a party.

**Connection states — soft labels only, in every language, no exceptions.**
Hold → "Potential". Decline → "Parked / revisit later". No hard words
("rejected", "declined", "failed") anywhere, in any language — this is a
platform-wide copy rule (see below), not specific to this gate.

**Completeness gate.** A party cannot be prompted to Proceed until the
counterparty has disclosed against **all** of that party's Must criteria.
Gaps are shown explicitly, never guessed or silently treated as satisfied.

**Re-request — server-enforced, every duration configurable, none
hardcoded.**

| Outcome | Cooldown |
|---|---|
| Hold | Allowed once the stated re-trigger condition is met; default 14 days otherwise |
| Decline | Default 30 days |
| Any sent re-request | Expires after 5 days if not acted on |

Deleting the connection cancels any pending re-request and removes the
connection entirely.

**Copy and localization rule — platform-wide, not scoped to this gate.**
Every user-facing string is soft, polite, and professional, in every
language. Tone is reviewed per-language deliberately; never left to raw
auto-translation. This generalises the Connection-state soft-labels rule
above into a standing platform convention.

**Answers to the 11 continuous questions (§A above), natively, at the
earliest point of contact** — before any `deal_rooms` row exists:
- **Q3** (who's blocking) — whichever party hasn't yet disclosed against
  the counterparty's Must criteria.
- **Q4** (which condition is unsatisfied) — the specific undisclosed or
  unmet Must criterion.
- **Q5** (what evidence is required) — any criterion tagged
  evidence-required and not yet satisfied.
- **Q11** (what's preventing the next state) — the completeness gate
  itself, stated plainly rather than left implicit.

**BUILD SEQUENCE.** Build only **after** the Closing-stage record-chain
substrate (the atomicity work already proven live per `CLAUDE.md`'s
deal-room record-atomicity entry, 24 Sep 2026) is settled. Not before — this
gate needs the same append-only record mechanism, proven once rather than
re-derived a second time for an earlier stage.
