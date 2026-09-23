# PAGE_PATTERNS.md — page-level composition for the Lengdon Component System

Sibling to `PRIMITIVES.md`. That file is the 13 primitives (component-level:
`LcsPageShell`, `LcsTable`, `LcsCard`, `LcsPageContainer`, …). This file is
one level up — how a whole PAGE is composed from those primitives, so CC
can build a uniform, in-house dashboard page without a Figma frame for
every screen (§0a's "CC does not design" still governs anything this file
doesn't already answer — read a page's actual archetype off this file
first; invent nothing not covered here).

**Read this before building or restyling any dashboard/workflow page.**

---

## 1. Width — always via `LcsPageContainer`, never a hand-rolled `max-w-*`

Confirmed by the Step A dashboard IA recon (Sep 2026): `LcsPageShell`'s own
content wrapper has no width cap (a prior fix removed a hardcoded 1120px
cap that was wasting space on wide viewports) — but ~50 route files then
each independently reinvented their own `max-w-*` + `mx-auto` on their page
root, with no shared value and no shared reasoning. That is the founder's
"centered/narrow instead of using device width" complaint, and it is
scattered across ~50 files, not one shell-level bug.

**The fix is one primitive, not one CSS value:**

```tsx
import { LcsPageContainer } from "@/components/lcs";

export default function SomePage() {
  return (
    <LcsPageContainer width="standard">
      {/* page content */}
    </LcsPageContainer>
  );
}
```

Four tiers — pick the one that matches the page's actual content shape, not
habit:

| Tier | Max-width | Use for |
|---|---|---|
| `wide` | 1600px | Table/data-dense screens — deal-room documents, investor deal-flow, any screen whose main content is a wide table or a multi-column data grid. |
| `standard` (default) | 1360px | Most dashboard pages. The emergent consensus value from the pre-existing ~50 files. |
| `narrow` | 960px | Genuinely single-column form/confirm shapes — a settings tab, a modal-adjacent page, anything that would look unfinished stretched wide. |
| `full` | none | Single-purpose utility screens that intentionally fill the shell. `library.tsx`'s standalone layout is the reference case (it doesn't use `LcsPageContainer` at all — it IS the full-width case). |

**Do not introduce a fifth value or a one-off pixel width without asking**
— same standing rule as §0a for layout in general. If a real page genuinely
doesn't fit any of the four, that's a design question for the founder, not
a CC judgment call.

**Migrating an existing page:** map its current `max-w-*` value to the
nearest tier as a literal swap first — zero visual regression, not a
re-tuning pass. Making every "standard" page actually converge on exactly
1360px (rather than the various 1024/896/672 values currently labeled that
way) is a second, separate, explicitly-reviewed pass — don't fold the two
together.

---

## 2. The five page archetypes

Every dashboard/workflow page built from here forward is one of these five,
composed from the 13 primitives in `PRIMITIVES.md`. Pick the archetype
before writing a line of JSX.

### Worklist / control-tower

One `LcsTable`, one row per open item, grouped/sorted by urgency, each row
carrying an `LcsStatusPill` and linking through to detail — never inline
detail. This is the Home/Overview archetype (§3 below is the concrete
spec for this codebase's Home).

### List + detail

An `LcsTable` list (left column or top section) plus a detail region
(right column or below) rendering the selected item via `LcsCard` +
`LcsFormField`s. The founder deal-room list → deal-room detail relationship
is an informal instance of this today; a true List+Detail page keeps both
halves on one route rather than a full navigation.

### Form / builder

Sequential `LcsFormField` groups inside `LcsCard` sections, a persistent
save-state indicator, `LcsStatusPill` per section for completion. Each of
Profile Builder's real sub-pages (Quick Setup, Full Profile, Team Cards,
Achievements, Fundraising Thesis) is already a correct, small instance of
this archetype — the anti-pattern is collapsing several of these into one
file (see §4).

### Tabbed hub

An `LcsPageHeader` with a tab strip, each tab rendering one instance of
another archetype (usually Form/Builder or List+Detail) inside it. This is
the FIX for the two mega-pages named in §4, not a pattern to avoid — the
defect in `app.documents.tsx`/`app.profile.tsx` was never "having tabs," it
was hand-rolling the tab switch inline in one 1800–3000-line file instead
of a real hub composition.

### Read-only record

`LcsCard` + `LcsReferenceLine`, no edit affordances. The Advisor
record-preview screen and any eventual real closed-deal record view are
this archetype. Never render a fabricated-looking value (a hash, a
signature) on a Read-only Record page over data that isn't real — see
CLAUDE.md §7.4's standing rule on this, established building exactly this
archetype.

---

## 3. The control-tower Home — spec

The founder's Home (`/app/overview`, `app.overview.tsx`) is a **Worklist /
control-tower** page, not a vanity-stat dashboard. Its job: for every open
deal room, surface what's actually blocking progress — not restate data
the user already knows.

**What the current data model can answer today** (build against these now):

- What's missing — founder/profile completeness fields (`profileCompleteness.ts`).
- What changed recently — the `activities` table (`account_id`/`target_id`-scoped, per §19j's corrected query pattern — never `deal_room_id`, that column doesn't exist on `activity_log`).
- Which side is blocking the prep gate — `deal_rooms.prep_status` +
  the two-sided-AND checklist state (`deal-room-prep-fn.ts`, this
  session's Build Step 2).
- What's ready for the founder's own Commit — any Prepare-class action's
  draft sitting unconsumed (the action layer's own class distinction,
  §8.2, is exactly this signal — it has just never been surfaced as a
  worklist row before).

**What is NOT answerable yet — build the row as a visible "coming soon"
placeholder, never fabricate the underlying signal** (Foundation §3.8):

- Per-condition evidence requirements — no schema for this exists.
- Who has authority to satisfy a specific condition — `deal_room_members.role`
  exists; no explicit condition→authorized-role mapping exists.
- Overdue/SLA timers (24/48/72h) — no staleness computation exists anywhere
  in the schema today. This is real future work, not a display change.

**Structure:** `LcsPageContainer width="wide"` → one `LcsTable`, one row
per open item across every deal room the founder is in, `LcsStatusPill`
per row for urgency tier, sourced from a new cross-room aggregation query
(not yet built) rather than reusing `app.overview.tsx`'s current
per-metric-tile layout.

---

## 4. The two mega-pages — the hub/tab fix

`app.documents.tsx` (4 internal views: document-intake, source-files,
digital-document-vault, privacy-settings — currently switched by local
component state in one ~1800-line file) and `app.profile.tsx` (5 internal
tabs: quick/full/privacy/preview/analytics — one ~3000-line file) are both
the Tabbed Hub archetype, built wrong: the switch lives inline instead of
being a real hub composition.

**The fix, when scoped as its own pass (not done as a side effect of
anything else):** a thin hub file (`LcsPageHeader` + tab strip + the active
tab's component, typically under ~150 lines) with each tab's content in
its own file, each one a clean instance of Form/Builder or List+Detail.
Net effect: one ~1800–3000-line file becomes ~5–6 files of 200–500 lines
each, independently testable, independently reviewable.

**Do not build this as a side effect of an unrelated page touch.** It's a
real, scoped refactor with its own step-0 audit (confirm every internal
tab's actual data dependencies before splitting) — see CLAUDE.md §1.

---

## 5. What this file does NOT cover

- Visual design (colors, spacing, radii) — that's `PRIMITIVES.md`.
- Nav structure / sidebar ordering — that's `src/lib/nav-structure.ts`, a
  single typed config file, not covered by this doc at all.
- Anything a real Figma frame already specifies — §0a's rule stands: a
  frame always wins over a pattern described here.
