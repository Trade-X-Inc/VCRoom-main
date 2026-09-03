# lcs primitives — the register of record

Shared components for the **Lengdon Component System (LCS)** — the approved
internal design system (`Lengdon Component System.pdf`, 1 Sep 2026),
now design truth for the authenticated application. Supersedes Design
Constitution v2 (`DESIGN.md`) entirely — CLAUDE.md §0, amendment 1 Sep 2026.

## The `--lcs-*` naming convention — read this first

Same reasoning as v2's `--v2-*` prefix (`src/components/v2/PRIMITIVES.md`):
the app now runs **three** coexisting token layers during migration — v1
(purple, pre-rebuild), v2 (navy/Archivo, `AppShell`/`MemberShell`/
`NotificationBell`/`UserMenu` as of 27 Aug 2026), and LCS (this one, for
every new internal screen from 1 Sep 2026 forward). Prefixing the whole
LCS layer `--lcs-*` guarantees zero collision with either prior layer,
greppable, no special cases — same convention, extended by one generation.

| PDF token | Our CSS var | Tailwind utility |
|---|---|---|
| `#FFFFFF` | `--lcs-white` | `bg-lcs-white` |
| `#F6F5F2` | `--lcs-surface` | `bg-lcs-surface` |
| `#DDDBD6` | `--lcs-line` | `border-lcs-line` |
| `#57544E` | `--lcs-ink-muted` | `text-lcs-ink-muted` |
| `#1A1A19` | `--lcs-ink` | `text-lcs-ink` |
| `#1F4E8C` accent | `--lcs-accent` | `bg-lcs-accent`, `text-lcs-accent` |
| Pending / In progress / Satisfied / Attention (+ wash) | `--lcs-pending*` / `--lcs-progress*` / `--lcs-satisfied*` / `--lcs-attention*` | `text-lcs-satisfied`, `bg-lcs-attention-wash`, … |
| IBM Plex Sans / IBM Plex Mono | `--font-lcs-ui` / `--font-lcs-data` | `font-lcs-ui`, `font-lcs-data` |

Base palette + accent are the PDF's literal hex values. **The four status
"-wash" tint values are NOT given literal hex codes in the PDF** — derived
as a light tint of each solid tone, flagged in `styles.css`'s own comment;
replace with exact values if the founder supplies them.

**Not turned into `--lcs-*` tokens, deliberately:**
- **Spacing** — 4px base unit is Tailwind's default scale (`p-1`=4px…);
  use native spacing utilities.
- **Radius** — `--radius-lcs-control` (3px) for buttons/inputs/pills only.
  Cards, table containers, and modals are sharp (0px) — never reach for a
  larger radius utility on structural elements.
- **Table row height (34px), control height (28px)** — applied per
  component, see each file.

If LCS work needs a value not in the PDF, ask before inventing one — same
rule §0a already states for layout.

## Components

| # | Component | File | Notes |
|---|---|---|---|
| 01 | Page shell | `PageShell.tsx` | `LcsPageShell`. Fixed 200px sidebar, collapses to 52px icon rail via bottom toggle only (persisted to `localStorage`, wrapped in try/catch — private-window safe). 48px top bar, search left-aligned not centred, notification dot (attention tone, no baked-in count), user menu = initials in a plain circle. Content region has **no max-width** — fills available width, 24px padding only. Corrected 1 Sep 2026 (Deals hub §2 review): a first version hardcoded `max-width: 1120px`, copied from the PDF page 2 screenshot's caption ("content region — 24px padding, max-width 1120px"). That caption describes one example screenshot's rendered size in the design tool — the primitive's own written spec text names no max-width. Found live: at 1600px viewport width, the cap left 280px of dead space (growing on wider screens) while the content inside was already using its own available width correctly. If a genuine reading-width constraint is wanted later, it belongs on prose content specifically, not as a blanket cap on every screen's content region. |
| 02 | Sidebar nav item | `NavItem.tsx` | `LcsNavItem` (default/hover/active), `LcsNavGroup` + `LcsNavSubItem` (nested/grouped — parent is a label, not a page, when it has children). Active state uses `border-inline-start` (mirrors under RTL automatically). Icon prop is caller-supplied — no icon set shipped yet, callers pass a placeholder glyph. |
| 03 | Page header | `PageHeader.tsx` | Title + optional one-line description + optional single primary action. Nothing else — no breadcrumbs, no stat tiles, no tabs. |
| 04 | Table / list row | `Table.tsx` | `LcsTable`/`LcsTableHead`/`LcsTh`/`LcsTableBody`/`LcsTr`/`LcsTd`/`LcsExpandableRow`. Real `<table>`. 34px rows, hairline dividers, header sits on a tinted band (no divider under it). Hover = subtle tint only. `numeric` columns are `text-end` with mono figures in both LTR and RTL (tabular figures never mirror). |
| 05 | Status pill | `StatusPill.tsx` | `LcsStatusPill`. Exactly four states: `pending`/`in-progress`/`satisfied`/`attention`. Always dot + label — never colour alone. |
| 06 | Card / section container | `Card.tsx` | `LcsCard`. Header (title + optional count badge + optional "View all", 42px tall) · body holds a table/list directly, no inner padding. 1px border, flat, no shadow. |
| 07 | Empty state | `EmptyState.tsx` | `LcsEmptyState`. One plain sentence naming what would appear. No illustration, no mascot. Single optional action. |
| 08 | Form field set | `FormField.tsx` | `LcsTextField`/`LcsSelectField`/`LcsTextareaField`/`LcsDropzone`. Label above input always, 11px gray helper text below. Error state: border + helper switch to attention tone, label stays neutral — no red anywhere. Inputs 32px tall, flat, sharp corners. |
| 09 | Button set | `Button.tsx` | `LcsButton` with `variant`: `primary` (filled accent, one per view — the only place accent fills a shape) / `secondary` (outlined neutral) / `destructive` (outlined amber, never filled) / `text-link` (accent, no border). |
| 10 | Modal / slide-over | `Modal.tsx` | `LcsModal`. Header (task name only) · body (context + form fields) · footer (right-aligned: cancel, then primary/destructive, in that order). `variant="slide-over"` anchors to the inline-end edge, full height. Escape key closes. |

## RTL and multi-language — built in from the start, not retrofitted

- No fixed-width text containers that would clip a longer string —
  components use flexible widths with `truncate` (ellipsis), never hard
  clipping. Wrap a `LcsTd`/nav-item label in a `title=` attribute at the
  call site if a tooltip-on-overflow is needed for a specific long value.
- Directional CSS uses logical properties (`border-inline-start`,
  `ps-`/`pe-` padding, `text-start`/`text-end`) throughout — never
  hardcoded `left`/`right`. Verified in `PageShell` (sidebar border, user
  menu notification dot position), `NavItem` (active rule), `Table`
  (numeric column alignment, expandable-row indent).
- No meaning is conveyed by an icon alone — every icon in `NavItem`,
  `PageShell`'s notification bell, and the search icon sits beside a text
  label or has an `aria-label`.
- Status pills (`StatusPill`) and reference/mono codes (`LcsTd mono`,
  `LcsCard`'s count badge) are visually LTR always via `--font-lcs-data`
  (tabular figures) — CLAUDE.md §8.4 (reference numbers) and this system's
  own "REF ... always in mono" spec agree on this; neither component sets
  an explicit `dir="ltr"` override yet because no caller has supplied a
  real reference number through them — add `dir="ltr"` at the point a real
  `{ORG}-{TYP}-{YYYY}-{SEQ}-{CD}` value is wired in, not preemptively on
  every mono span.
- Chevron/arrow glyphs (sidebar collapse toggle `«`/`»`, user-menu caret
  `▾`) are placeholder text arrows pending a real icon set — flagged here
  as needing RTL mirroring (`«`→`»` swap) when a real icon component
  replaces them; not yet wired to `dir` detection.

## Responsive — real spec, added 1 Sep 2026, not inherited from the PDF

The approved Component System PDF documents every primitive as a fixed-
pixel desktop layout (200px sidebar, 34px table rows, fixed card grids)
with no breakpoint behavior specified anywhere. Per CLAUDE.md §0a, an
undesigned surface is something to flag and design deliberately, not
extrapolate — this section is that deliberate design, confirmed with the
founder before any code was written, not an improvisation to work around
the PDF's silence. Breakpoints use Tailwind's existing default scale
(`sm`=640px, `md`=768px, `lg`=1024px), already in use elsewhere in this
build (the sector-picker grid), rather than a new scale invented for this
addendum alone.

**Sidebar (`PageShell`) — drawer below `md` (768px).** Below 768px the
sidebar stops reserving permanent width and becomes an off-canvas drawer,
closed by default, opened via a hamburger icon replacing the search bar's
leading position in the 48px top bar; opening it overlays content with the
same scrim `Modal` already uses (`rgba(26,26,25,0.4)`), slides in from the
inline-start edge, and closes on nav-item selection. **Why drawer over the
existing always-visible 52px icon rail:** the icon rail is a desktop
density optimization — more content width while nav stays reachable. At
phone width, 52px of permanent icon-only rail is a much larger fraction of
the screen and still forces horizontal scrolling on wide tables underneath
it; an overlay reclaims full width for content, which matters more at this
size than permanent nav visibility does. Above 768px, unchanged.

**Tables (`Table.tsx`) — horizontal scroll with a frozen first column
below `md` (768px), NOT stacked cards.** The table's wrapper gets
`overflow-x-auto`; the first column (whichever is the row's primary
identifier — ref, name, term) gets `position: sticky; inset-inline-start:
0` with the table's own background, so it stays visible while the rest
scrolls. **Why scroll+frozen-column over stacking into label/value cards:**
every table in this build (transaction list, NDA signatures, documents,
diligence checklist, terms) has a small, fixed, independently-scannable
column set where columns are meant to be directly compared across rows —
stacking into cards would destroy that comparability and roughly double
vertical scroll length for the same information. A frozen key column
solves the actual failure mode of naive horizontal scroll alone (losing
row identity once scrolled past column 1) without giving up
side-by-side comparison. `LcsExpandableRow`'s detail strip needs no
change — it's already a flex-wrap label/value list, not tabular, so it
already reflows correctly. Above 768px, unchanged.

**Forms (`FormField.tsx`) — no change needed.** Every field primitive
(`LcsTextField`/`LcsSelectField`/`LcsTextareaField`/`LcsDropzone`) is
already single-column and `w-full`; there's no breakpoint-dependent
layout to break, since no caller currently arranges multiple fields in a
row. If a future screen needs a multi-field-per-row form layout, that
layout should default to `grid-cols-1 md:grid-cols-2` at the call site —
noted here as forward guidance, not built preemptively.

**Modals (`Modal.tsx`) — full-screen sheet below `sm` (640px).** Below
640px, both `variant="centered"` and `variant="slide-over"` render
identically: full viewport (`inset-0`, no margin, no `max-w`), same
header/body/footer anatomy. **Why collapse the two variants instead of
keeping them visually distinct:** the centered-vs-slide-over distinction
only reads differently when there's room for either affordance to look
like what it's named — a "slide-over" that fills the entire narrow
viewport is visually indistinguishable from "centered" full-screen, so
preserving the distinction at this width would be maintaining a difference
nobody can perceive. Collapsing them is the correct simplification, not a
compromise. Above 640px, unchanged.

**Closing sequence (six gates) — vertical stepper below `md` (768px),
current gate expanded, others collapsed to one line.** This screen is
deliberately NOT governed by the generic table rule above, even though it
could technically render as a 6-column table. Below 768px, gates render as
a vertical list in `CLOSING_GATE_ORDER`; the gate matching the
transaction's actual position (first `not-started`/`in-progress`, or the
last `done` if all are complete) renders fully expanded; every other gate
collapses to one row (number, name, `StatusPill` only), tappable to expand
— one gate open at a time, accordion-style. **Why a stepper instead of
inheriting the table pattern:** the table rule assumes rows that are
independently meaningful and worth comparing side-by-side — true for a
documents list, false here. The six gates are strictly sequential and
mutually dependent (Counsel → Agreement → Conditions → Signing → Payment →
Close, per the real product's closing-gate model this build follows); the
real question at any moment is "what's the current gate's state and what's
next," not "let me compare gate 3 against gate 5." A wide scrolling table
would present the gates as parallel/comparable when they aren't, and would
force Gate 1's actual content (real form fields for the counsel/
accountant-onboarding flow, not just a status) into a cramped fixed-width
cell — a worse fit than a full-width expanded row. **Desktop equivalent
(above 768px) is deliberately left open** — likely a horizontal six-segment
progress indicator with the active gate's content below it, following the
same expand-current/collapse-others logic sideways — but that's the
closing-checkpoint content build's own decision against real gate content,
not a responsive-only-pass decision to lock in now.

## Z-index — PROPOSED, not yet applied

Audited 3 Sep 2026 during the internal-UI migration's Group 3 (AppShell →
LcsPageShell adoption), as prep work ahead of the full AppShell rewrite —
not tied to any observed bug. No `--z-*` token exists anywhere in
`styles.css` today; every real shell file (`AppShell.tsx`, `MemberShell.tsx`,
`LcsPageShell`, LCS `Modal.tsx`) uses ad-hoc Tailwind arbitrary z-index
values that happen to agree by convention, not by a documented scale.

**The real, found convention, low → high:**

| Layer | Observed value | Where |
|---|---|---|
| Sticky table header/column | `z-10` | `LcsTable`'s sticky column and header row |
| Account-menu click-outside catcher | `z-30` | `UserMenu`'s invisible `fixed inset-0` overlay — deliberately *below* the dropdown/drawer layer, so it only catches clicks outside its own menu |
| Mobile backdrop scrim | `z-40` | AppShell/MemberShell mobile-drawer backdrop; `LcsPageShell`'s mobile drawer wrapper |
| Notification/user-menu dropdowns | `z-40` | `NotificationBell`, `UserMenu` popovers |
| Sidebar / drawer itself | `z-50` | AppShell/MemberShell `<aside>` (desktop-collapsible and mobile-slide-in share the class) |
| Sticky header bar | `z-20` | AppShell/MemberShell `<header>` |
| Full-screen modals | `z-50` | AppShell's search modal, MemberShell's `FeedbackModal`, LCS `Modal.tsx` |

**One real inconsistency found, not yet fixed:** `LcsPageShell`'s own
mobile drawer wrapper is `z-40`, one tier below AppShell/MemberShell's
`z-50` sidebar convention. Harmless today (the two never render inside
the same document), but exactly the kind of drift a shared shell adoption
should not silently inherit as if it were intentional.

**Proposed token scale**, formalizing the above rather than inventing new
values — same naming pattern as every other `--lcs-*` token:

| Token | Value | Replaces |
|---|---|---|
| `--z-lcs-sticky` | `10` | `LcsTable` sticky column/header |
| `--z-lcs-scrim` | `30` | Click-outside catchers and backdrop scrims (unifies `UserMenu`'s `z-30` catcher with the `z-40` backdrops below it — same conceptual layer, was inconsistently numbered) |
| `--z-lcs-dropdown` | `40` | `NotificationBell`/`UserMenu` popovers, `LcsPageShell`'s mobile drawer wrapper (bumped to match the sidebar convention) |
| `--z-lcs-drawer` | `50` | AppShell/MemberShell `<aside>` |
| `--z-lcs-modal` | `50` | Full-screen modals (shares `50` with drawer today; modals and the drawer never coexist, so no ordering conflict — kept as one tier rather than splitting further) |

**Status: proposed only.** Not added to `styles.css`, not applied to any
component. This is documented here so it becomes real scope for the full
AppShell rewrite (Group 3, subsystems 2-4) rather than a decision made
once in a chat report and then lost. Whoever does that rewrite should
apply this scale (or a deliberately revised version of it) across
`AppShell.tsx`, `MemberShell.tsx`, `NotificationBell.tsx`, `UserMenu.tsx`,
and `LcsPageShell`/`Modal.tsx` together, in one pass — not per-file, since
the whole point is a shared, consistent scale.

## Nested nav — `LcsNavGroup` does not model the app's real L2→L3 pattern

Found 3 Sep 2026, Group 3 subsystem 2, while checking AppShell's sidebar
against the LCS pattern before restyling it further. **This is a gap in
the primitive, not a defect in AppShell** — recorded here so it isn't
silently treated as non-conformance to be "fixed" by a future pass that
hasn't read this note.

`LcsNavGroup`/`LcsNavSubItem` (above) model exactly one shape: a group
label that's always visible, with its children always visible beneath
it, indented, connected by a hairline rule. No toggle, no collapse
state, no route-dependent content swap.

**AppShell's real sidebar does something categorically different, and
has for as long as this nav has existed (R9/R12, pre-dating the LCS
migration):**
1. **Route-dependent single-swap, not nesting.** The sidebar shows
   *either* the flat top-level (L2) list *or*, once navigation enters a
   section, an entirely different second-level (L3) list plus a "Back
   to Dashboard" link — the sidebar's content changes based on where
   you are, not "some items in one list happen to be grouped."
   `LcsNavGroup` has no concept of this; it assumes one static list for
   the life of the shell.
2. **Click-to-expand/collapse groups within the L3 list**, with
   auto-open-on-navigate and "never auto-close a group the user is
   looking at" logic (`expandedGroups` state, a chevron toggle). Real,
   deliberate interaction behavior — some L3 sections have enough
   children that showing all of them unconditionally (`LcsNavGroup`'s
   only mode) would be a materially worse sidebar, not a neutral
   restyle.

**Disposition, confirmed 3 Sep 2026: restyle-only, no structural
change.** Subsystem 1 already ported this logic byte-identical into
`LcsPageShell`'s `sidebar` render-prop, with LCS tokens/type applied to
its existing markup — the correct move, since forcing the real
navigation onto `LcsNavGroup`'s always-expanded shape would mean
inventing a worse pattern purely to satisfy a primitive that was never
designed for this case, not fixing a real inconsistency.

**If a true LCS-conformant nested-nav primitive is ever wanted**, closing
this gap is new primitive design work — a route-swap-capable,
accordion-capable nav pattern — not a follow-up edit to AppShell. Until
that primitive exists, AppShell's hand-rolled L2/L3 logic (now LCS-token-
styled, unchanged in structure) is the correct implementation of real
product navigation, not technical debt against this file.
