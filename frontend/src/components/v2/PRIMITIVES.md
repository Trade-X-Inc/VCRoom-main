# v2 primitives — the register of record

Shared components for the **Design Constitution v2** system (the navy/ledger
"register of record", `DESIGN.md` at repo root). These govern everything behind
sign-in as the application migrates off the v1 purple theme. **The app is
intentionally mixed v1/v2 during the rebuild** — these primitives must never
alter a still-v1 screen.

## The `--v2-*` / `v2-` naming convention — read this first

DESIGN.md §14 lists tokens with literal names (`--surface`, `--accent`, …). We do
**not** use those literal names, for one concrete reason: `--accent` already
exists in the v1 theme (`#FAFAFA`, used via `bg-accent`/`text-accent` on dozens
of live v1 screens). Defining `--accent: #1B3A63` at `:root` would silently
repaint every v1 screen.

So the **entire** v2 token layer is prefixed `--v2-*`, uniformly, no exceptions
(decided 5 Aug 2026 — only `--accent` actually collided, but prefixing the whole
layer means v2 adoption is greppable and the convention has zero special cases):

| DESIGN.md §14 name | Our CSS var | Tailwind utility |
|---|---|---|
| `--surface` | `--v2-surface` | `bg-v2-surface` |
| `--panel` | `--v2-panel` | `bg-v2-panel` |
| `--ink` / `--ink-secondary` / `--ink-muted` | `--v2-ink*` | `text-v2-ink`, `text-v2-ink-secondary`, `text-v2-ink-muted` |
| `--rule` / `--rule-light` | `--v2-rule*` | `border-v2-rule`, `border-v2-rule-light` |
| `--accent` / `--accent-wash` | `--v2-accent*` | `bg-v2-accent`, `text-v2-accent`, `bg-v2-accent-wash` |
| `--satisfied` / `--attention` / `--adverse` (+ `-wash`) | `--v2-*` | `text-v2-satisfied`, `bg-v2-adverse-wash`, … |
| `--font-ui/-doc/-data` | `--font-v2-ui/-doc/-data` | `font-v2-ui`, `font-v2-doc`, `font-v2-data` |

Values are **DESIGN.md §14 verbatim** — the names differ, the values do not. All
live in `src/styles.css` (`:root` for values, `@theme inline` for the utilities).

**Not turned into `--v2-*` tokens, deliberately:**
- **Spacing** — Tailwind v4's default scale is already the §14 4px base
  (`p-1`=4px … `p-16`=64px). Use native spacing utilities; they *are* the scale.
- **Type scale / dimensions** (`--text-*`, `--h-row 36px`, …) — applied per
  component (see each file), not as global overrides, so they can't touch v1's
  already-remapped `--text-sm`/`--text-base`.
- **Radius / shadow** — v2 uses `--v2-radius` (2px) where a radius is needed and
  simply never uses a shadow utility (stronger than a `none` token).

If v2 work needs a value that isn't in DESIGN.md §14, **amend DESIGN.md first** —
do not invent one here.

## Components

| Component | DESIGN.md | Notes |
|---|---|---|
| `ReferenceLine` | §5 | The signature element. **Returns `null` when `refNo` is absent** — never a placeholder. Reference numbering doesn't exist yet (§8.4 CLAUDE.md), so it renders nothing on the documents group today; wired call sites light up for free when numbering ships. Canonical number stays LTR under RTL. |
| `V2Button` | §6.2 | `primary` (solid accent, one per screen) · `secondary` · `quiet` · `adverse` (bordered, never solid fill). 32px, 2px radius, visible focus ring. Labels are verbs — caller's job. |
| `LedgerTable` + `LedgerHead`/`LedgerBody`/`Th`/`Tr`/`Td` | §6.1 | Real `<table>`. 36px rows, 1.5px ink header rule, `--v2-rule-light` separators, no zebra, `--v2-accent-wash` hover. `Tr selected` = 2px accent left rule; `Tr status="…"` = 3px semantic left rule. `numeric` cells right-align with tabular figures. |
| `StatusLabel` | §2.5 / §7.2 | Text label + colour, **never colour alone**. Closed word set (four tones). Small text + optional dot, never a banner. |
| `V2EmptyState` | §7.3 | Added 12 Aug 2026 (deal-room-core step 6). One sentence naming what would appear + one action, **no illustration** — replaces v1's illustrated `EmptyState` (`components/system/EmptyState.tsx`) on v2 surfaces. Narrower props than the v1 component (`text` + `action`, no `kind`/`description`) since §7.3 specifies exactly one sentence. |
| `V2Skeleton` / `V2SkeletonRows` | §7.3 / §9 | Added 12 Aug 2026. Static muted blocks matching real table row geometry — §9 permits no loading animation beyond skeletons themselves, so no spinner, no shimmer sweep. |
| `V2PageHeader` | §4.4 | Added 12 Aug 2026. Title/breadcrumb/actions block in v2 typography (`--text-lg` 19px, Archivo) — the v2-native replacement for v1's `PageFrame` (Syne 28px, v1 `design-tokens` colour module). Do not reuse `PageFrame` on a v2 surface. |
| `V2StatTile` | §2.5 / §13 | Added 30 Aug 2026 (deal-room overview bento rebuild). Labelled metric card — label + large value, optional `StatusTone` on the value only (never the tile background — §13 bans large-area colour fill). Pattern borrowed from a Figma design reference's "Active Mandates"/"Evidence Completeness" tiles; the reference's literal content (workflow, labels) was not ported, only the tile shape. |

## RTL and locale

All directional CSS uses logical properties (`border-inline-start`,
`padding-inline-start`, `text-align: start`) per §10.1. Reference numbers,
amounts and dates stay LTR (`dir="ltr"` + `unicode-bidi: isolate`) per §10.2.
Formatting through `Intl`, currency code always shown (`USD 18,400`) — the
caller's responsibility when passing values in.

## Prohibitions (§13) these primitives hold to

No radius > 2px, no shadows, no gradients, no coloured background fills on large
areas, no progress bars, no decorative iconography, no emoji. If a build using
these produces any of those, it's a defect — revert, don't negotiate.
