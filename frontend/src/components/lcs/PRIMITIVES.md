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
