# The Register of Record — Design Constitution v2.0

**Document:** DESIGN-CONST-V2.0 · **Date:** 30 July 2026 · **Scope:** Authenticated application only · **Public surface:** Deferred to 80% build

> Paste this at the top of every build prompt that touches the authenticated application.

An interface for people who move other people's money. The operator works fast and dense; the partner reads a document with a reference number. Both are served by one system, and neither is asked to trust something that looks like a consumer app.

## Scope and precedence

This governs everything **behind sign-in**. The public site, marketing pages, pricing, brand identity and documentation are explicitly **out of scope** and remain on the existing system until the application is roughly 80% complete. Do not touch public-facing surfaces during application work.

Where this conflicts with the Foundation Document, the Foundation Document wins on *what* to build; this wins on *how it looks and reads*. `CLAUDE.md` wins on implementation discipline.

**This document supersedes v1 of the design constitution in its entirety.** v1 was built for a founder-facing product with a purple brand accent. That product no longer exists.

Precedence, restated:
- **Foundation Document** → what to build
- **DESIGN.md** (this file) → how the application looks and reads, behind sign-in
- **CLAUDE.md** → implementation discipline

---

## Contents

1. [The thesis](#1-the-thesis)
2. [Colour](#2-colour)
3. [Typography](#3-typography)
4. [Space and grid](#4-space-and-grid)
5. [The signature — the reference line](#5-the-signature--the-reference-line)
6. [Components](#6-components)
7. [State and status](#7-state-and-status)
8. [The document surface](#8-the-document-surface)
9. [Motion](#9-motion)
10. [Right-to-left and locale](#10-right-to-left-and-locale)
11. [Accessibility floor](#11-accessibility-floor)
12. [Interface writing](#12-interface-writing)
13. [Prohibitions](#13-prohibitions)
14. [Token reference](#14-token-reference)

---

## 1. The thesis

> **The one sentence.** Every screen is a page of a record that someone may one day have to defend. It should look like it knows that.

The reference vocabulary is not software. It is the documentary credit advice, the audit report, the term sheet, the register. These are the artifacts our buyer has trusted for their entire career: dense, ruled, numbered, unshowy, and completely unambiguous about what happened and when.

### 1.2 Two readers, one system

| Reader | Wants | Gets |
|---|---|---|
| **The operator** (analyst, associate, founder) | Speed. Density. Keyboard. No decoration between them and the task. | The interface: compact tables, inline status, persistent worklist, one-key navigation. |
| **The principal** (partner, principal, committee) | Something they can print, cite, initial and file. Proof of what was done. | The document surface: paginated export with reference number, parties, timestamps, signature block. |

> **Note 1.3 — Why not simply "clean and modern."** Every competitor in this category looks like enterprise SaaS from 2019: card grids, soft shadows, rounded corners, a blue accent, and a dashboard nobody asked for. Looking like them communicates nothing.
>
> The distinctive move available to us is **looking like the document the deal produces** rather than looking like software that manages documents. That is a real position, it is defensible, and it is what makes a sixty-year-old partner comfortable and a twenty-eight-year-old analyst fast at the same time.

---

## 2. Colour

Six values. Colour carries meaning or it is not used. There is no decorative colour anywhere in the application.

### 2.1 Surface and ink

| Token | Value | Use |
|---|---|---|
| `--surface` | `#F5F4F1` | Application background. A warm neutral, not white — reduces glare across an eight-hour working day and reads as paper rather than screen. |
| `--panel` | `#FFFFFF` | Working surfaces: tables, forms, document viewers. The place where content lives. |
| `--ink` | `#16181C` | Primary text, headings, table values. |
| `--ink-secondary` | `#464C58` | Body copy, descriptions, secondary values. |
| `--ink-muted` | `#6E7585` | Labels, captions, metadata, column headers. |
| `--rule` | `#D6D4CD` | Structural rules and borders. |
| `--rule-light` | `#E8E6E0` | Row separators, subtle divisions. |

### 2.2 The single accent

| Token | Value | Use |
|---|---|---|
| `--accent` | `#1B3A63` | Ledger blue. Primary actions, active navigation, focus rings, reference numbers, links. |
| `--accent-wash` | `#E8EDF4` | Selected row, active tab background, informational callout. |

> **Note 2.2.** A deep navy rather than a bright blue. Bright blue is the universal SaaS default and reads as software; deep navy reads as institution — it is the colour of ledger ink, bank stationery and legal binding. It also survives being printed, which the SaaS blue does not.

### 2.3 Semantic colour — meaning only

| Token | Value | Meaning — and nothing else |
|---|---|---|
| `--satisfied` | `#215B49` | A condition met, a term accepted, a request closed, evidence at preferred tier. |
| `--attention` | `#7A5310` | Awaiting action, expiring, evidence at minimum tier, unwarranted claim. |
| `--adverse` | `#7A2E2A` | Declined, overdue, discrepancy, failed condition, destructive action. |

> **Rule 2.4.** Semantic colour never appears as a background fill on a large area. It appears as: a 3px left rule on a row, a small text label, an inline dot, or an icon. A green banner or a red panel is a consumer pattern and is prohibited.

> **Caution 2.5 — Colour is never the only signal.** Every semantic state carries a text label alongside its colour. Status is readable in greyscale, by a colour-blind user, and on a printed page. This is not only accessibility — a printed record that loses meaning in monochrome fails its purpose.

### 2.6 Dark mode

Not in scope for the application. Institutional users work in lit offices, the document surface must match its printed output, and a second theme doubles every visual decision during a rebuild. Revisit after the first institutional customer asks.

---

## 3. Typography

Three faces, three jobs, no exceptions.

| Role | Face | Where |
|---|---|---|
| **Interface** | Archivo | Everything in the working interface: navigation, tables, forms, buttons, labels, headings. A grotesque with a tall x-height and narrow set — it stays legible at 13px in a dense table, which most humanist faces do not. |
| **Document** | Source Serif 4 | The document surface only: exports, sealed records, printed views, agreement text, long-form legal content. Serif because that is what the artifact looks like off-screen. |
| **Data** | JetBrains Mono | Reference numbers, monetary amounts, dates, hashes, identifiers, code. Anything that must align vertically or be read character by character. |

> **Rule 3.1 — Monospace is not decoration.** The monospace face marks *machine-verifiable content*: things with a check digit, a timestamp, an exact value, or a canonical form. If a human wrote it freely, it is not monospace. This distinction is load-bearing — a reader should be able to tell at a glance which values are asserted prose and which are system-generated fact.

### 3.2 Scale

```
/* Interface — Archivo */
--text-xs      11px / 1.45   500   +0.09em uppercase   — column headers, labels, eyebrows
--text-sm      12.5px / 1.5  400                       — captions, metadata, help text
--text-base    13.5px / 1.55 400                        — table cells, form values, body
--text-md      15px / 1.5    500                        — section headings, emphasis
--text-lg      19px / 1.35   600   −0.01em              — page titles
--text-xl      25px / 1.2    700   −0.02em              — rare. One per screen at most.

/* Data — JetBrains Mono */
--mono-xs      10.5px / 1.6  400   +0.04em              — reference numbers in table cells
--mono-sm      12px / 1.6    400                        — amounts, dates, identifiers
--mono-base    13px / 1.7    400                        — hashes, record entries

/* Document — Source Serif 4 */
--doc-body     15px / 1.65   400                        — export and agreement body
--doc-heading  20px / 1.3    600                         — export section headings
```

> **Caution 3.3 — 13.5px is deliberate.** Smaller than the consumer default of 16px, because this is a professional tool where information density serves the user. An analyst comparing fourteen diligence items wants them on one screen. Do not "improve readability" by scaling this up — it would halve the visible working set and make the product feel like a toy.
>
> The floor is 11px, used only for uppercase labels with letterspacing. Nothing goes below it.

### 3.4 Numerals

All numeric display uses **tabular lining figures** — `font-variant-numeric: tabular-nums`. Amounts in a column must align on the decimal. This is non-negotiable in a financial interface and is the single most common failure in competitor products.

---

## 4. Space and grid

### 4.1 The scale

A 4px base. Every margin, padding and gap is a multiple. No arbitrary values.

```
--s1 4px    --s2 8px    --s3 12px   --s4 16px
--s5 20px   --s6 24px   --s8 32px   --s10 40px
--s12 48px  --s16 64px
```

### 4.2 Density

| Context | Row height | Padding |
|---|---|---|
| Data table row | 36px | `--s2` vertical, `--s4` horizontal |
| Form field | 36px | `--s2` vertical, `--s3` horizontal |
| Navigation item | 32px | `--s2` vertical, `--s3` horizontal |
| Panel padding | — | `--s5` |
| Section separation | — | `--s8` |

### 4.3 Corners and elevation

> **Rule 4.3.** **Border radius: 2px maximum, anywhere.** Buttons, inputs, panels, badges — 2px. Never 4px, never 8px, never pill-shaped.
>
> **No shadows.** Depth is expressed by a 1px rule, never by a blur. The only exception is a modal overlay scrim, which is a flat `rgba(22,24,28,0.4)` with no blur.
>
> Rounded corners and soft shadows are the visual signature of consumer software. A register has edges.

### 4.4 Layout frame

```
┌──────────────────────────────────────────────────────────────┐
│ TOP BAR   48px · org name · reference search · account       │
├───────────┬────────────────────────────────────────────────────┤
│           │ CONTEXT BAR  40px                                │
│  NAV      │ breadcrumb · reference no. · lifecycle state     │
│  216px    ├──────────────────────────────────────────────────┤
│           │                                                  │
│  fixed    │ WORK SURFACE                                     │
│  never    │ max 1440px · left-aligned, never centred         │
│  collapses│                                                  │
│  on       │                                                  │
│  desktop  │                                                  │
└───────────┴────────────────────────────────────────────────────┘
```

**The context bar is mandatory on every screen inside a raise or room.** It carries the reference number and lifecycle state at all times. A user must never have to ask which deal they are looking at or what stage it is in.

### 4.5 Responsive

The application targets desktop. Below 1024px the navigation collapses to a drawer and tables become stacked definition lists — never horizontally scrolling tables, which are unusable on touch. Below 768px the application is functional but not optimised; the brief and the document surface are the only views that must be excellent on a phone, because those are what get forwarded.

---

## 5. The signature — the reference line

One memorable element. Everything else stays quiet.

Every citable object carries a reference number. That number is not metadata tucked in a corner — it is the most distinctive visual element in the product, and it appears in the same form everywhere: in the context bar, in table rows, on exports, in the record, and in notification emails.

**The reference line — always this form:**

```
ATLS01-ROM-2026-000042-31
DEAL ROOM · OPENED 14 MARCH 2026
```
(monospace, accent colour, 2px left rule in accent; the caption beneath is uppercase and muted)

> **Rule 5.1.** The reference line is always: monospace, accent colour, 2px left rule in accent, with an uppercase muted caption beneath naming the object type and its key date. This composition appears identically in every context. It is the one thing a user will remember about the interface, and it is the thing a partner will cite in an email.

The check digit is displayed, not hidden. A user who reads a reference aloud or types it into an email can be told immediately that they got it wrong. That is the visible proof that the system takes its own records seriously.

---

## 6. Components

### 6.1 Tables — the primary component

Most screens are a table. Get this right and most of the interface is right.

- Header row: `--text-xs` uppercase, muted, 1.5px bottom rule in `--ink`
- Body rows: 36px, separated by 1px `--rule-light`, no zebra striping
- Row hover: `--accent-wash` background, no transform, no shadow
- Selected row: `--accent-wash` plus a 2px left rule in `--accent`
- Status rows: 3px left rule in the semantic colour, plus a text label in the status column
- Numeric columns right-aligned with tabular figures; text columns left-aligned
- Column headers sortable where the data justifies it, never sortable for decoration

### 6.2 Buttons

| Variant | Treatment | Use |
|---|---|---|
| **Primary** | Solid `--accent`, white text, 2px radius, 32px height | One per screen. The single most likely next action. |
| **Secondary** | 1px `--rule` border, `--panel` background, `--ink` text | Everything else. |
| **Quiet** | No border, `--ink-secondary` text, underline on hover | Tertiary actions in dense contexts. |
| **Adverse** | 1px `--adverse` border, `--adverse` text, never solid fill | Destructive. Always requires confirmation. |

Button labels are verbs naming exactly what happens: *Accept term*, *Issue request batch*, *Release document*. Never *Submit*, *OK*, or *Continue*.

### 6.3 Forms

- Label above field, `--text-xs` uppercase muted
- Field: 1px `--rule` border, 2px radius, 36px height, `--panel` background
- Focus: 2px `--accent` outline with 1px offset — visible, never subtle
- Error: `--adverse` border plus a message below stating what is wrong and how to fix it
- Required fields marked on the label, never with a bare asterisk
- Help text below the field, `--text-sm` muted — never a tooltip for anything a user needs to complete the field

### 6.4 The evidence indicator

A pack field's evidence tier is shown inline, never in a separate view:

| Field | Value | Tier |
|---|---|---|
| Monthly recurring revenue | USD 18,400 | **Preferred** |
| Customer count | 42 | **Minimum** |
| Supply agreements | — | **Not provided** |

Three tiers, three words, never a percentage and never a score. The reader draws their own conclusion, which is the entire product philosophy expressed as a component.

### 6.5 The worklist

The overview screen is a worklist, not a dashboard. Three sections, in this order, nothing else above the fold:

1. **Waiting on you** — items requiring this user's action, sorted by deadline
2. **Waiting on them** — items issued and outstanding, with days elapsed
3. **Expiring** — anything with a deadline inside seven days

An empty worklist says *Nothing is waiting on you.* and nothing more. It does not suggest activities or display statistics.

---

## 7. State and status

### 7.1 Lifecycle display

The seven lifecycle states appear in the context bar as a compact horizontal sequence — completed states in muted ink, the current state in accent with a filled marker, future states in `--rule`. No progress percentage, no completion bar. A deal is at a stage; it is not 62% done.

### 7.2 Status vocabulary

| Colour | Label set |
|---|---|
| **Satisfied** (green) | Satisfied · Accepted · Closed · Signed · Preferred · Complete |
| **Attention** (amber) | Awaiting · Outstanding · Expiring · Minimum · Held · Unwarranted |
| **Adverse** (red) | Declined · Overdue · Discrepancy · Withdrawn · Not provided |
| **Neutral** (blue) | Draft · Circled · Presented · Archived |

These are the only status words in the application. A new state requires a decision about which set it belongs to, not a new word.

### 7.3 Empty, loading, error

- **Empty:** a single sentence naming what would appear here and one primary action. No illustration, ever.
- **Loading:** skeleton rows matching the real table geometry. No spinners on anything under 400ms.
- **Error:** what failed, what it affects, what to do. In the interface's voice. Errors do not apologise and are never vague.

---

## 8. The document surface

The second half of the dual surface. Every meaningful view has one.

> **Rule 8.1.** A document export is not a print stylesheet applied to a screen. It is a distinct rendering with its own layout: A4 proportion, Source Serif body, a header block carrying the reference number and both party names, page numbering in the form *Page 2 of 7*, generation timestamp, and a signature block where the artifact requires one.

### 8.2 Header block — identical on every export

```
ATLS01-ROM-2026-000042-31
Deal room record · Atlas Robotics FZ-LLC / Henderson Family Office
Generated 30 July 2026, 14:22 GST · Page 1 of 7
────────────────────────────────────────────────────
```

The export uses the serif face throughout, tabular figures for all values, and hairline rules. It is monochrome except for the reference number in accent. It must remain fully legible when printed on a monochrome office printer, which is how a substantial number of these will actually be read.

### 8.3 The sealed record

The sealed record export carries the full hash chain and its terminal hash, rendered in `--mono-base`, with each entry showing actor, actor type, timestamp, object reference and action. This is the most important document the product produces and it should look like the most serious one.

---

## 9. Motion

> **Rule 9.1.** Motion exists to explain a state change and for no other reason. Duration 120–180ms, easing `cubic-bezier(0.2, 0, 0.2, 1)`. Only `opacity` and `transform` animate.

| Permitted | Prohibited |
|---|---|
| Panel and drawer entry | Scroll-triggered reveals |
| Row insertion and removal | Hover lift, scale or shadow growth |
| Status change on a row | Page transitions |
| Focus ring appearance | Animated number counters |
| Toast entry and exit | Loading animations beyond skeletons |

`prefers-reduced-motion` is respected everywhere, with no exceptions and no "essential animation" carve-outs.

---

## 10. Right-to-left and locale

> **Rule 10.1 — Logical properties only.** Every directional value uses CSS logical properties from the first component written. `margin-inline-start`, never `margin-left`. `padding-inline-end`, never `padding-right`. `border-inline-start`, never `border-left`. `text-align: start`, never `text-align: left`.
>
> Arabic is a first-class direction, not a stylesheet override applied later. Retrofitting this costs a quarter; doing it from the start costs nothing.

### 10.2 What stays fixed under RTL

Reference numbers, monetary amounts, dates, hashes and identifiers remain left-to-right regardless of interface direction. These are canonical forms. Wrap them in `dir="ltr"` containers with `unicode-bidi: isolate`.

### 10.3 Locale formatting

- Numbers, currency and dates formatted through `Intl` from the first component. Never hand-formatted.
- Amounts always display currency code, never a bare symbol — `USD 18,400`, not `$18,400`. In a cross-border product, a lone dollar sign is ambiguous.
- Dates in the interface: `30 Jul 2026`. In documents: `30 July 2026`. Never numeric-only, which reverses meaning between regions.
- Every displayed monetary value shows its *as-of* date on hover or in an adjacent column, per the currency-of-record rule.

---

## 11. Accessibility floor

Not aspiration. A build with any of these failing is not complete.

- **WCAG 2.2 AA contrast** on all text and all interactive boundaries. Verified, not assumed.
- **Visible keyboard focus** on every interactive element — 2px accent outline, 1px offset. Never removed.
- **Full keyboard operation.** Every action reachable without a pointer. Tables navigable by arrow keys.
- **Semantic structure.** Real `<table>` for tabular data, real `<button>` for actions, one `<main>`, correct heading order.
- **Status never colour-alone.** Every semantic state carries a text label.
- **Live regions** for async status changes so a screen reader user learns that a batch was issued.
- **Reduced motion** respected without exception.
- **Touch targets** 44px minimum on touch viewports, even where the desktop row is 36px.

---

## 12. Interface writing

Words are design material. The register inside the application is institutional documentation, not marketing.

- Sentence case everywhere except `--text-xs` labels, which are uppercase.
- Active voice. A control names exactly what happens when used.
- An action keeps the same name through the entire flow: the button says *Release document*, the confirmation says *Release document*, the toast says *Document released*.
- Name things as the user controls them, never as the system implements them.
- No exclamation marks. No filler. Sentences under twenty words.

| Write | Never write |
|---|---|
| Asserted 4 March · evidence attached | Verified ✓ |
| Complete against the seed schedule | Investor-ready |
| 12 of 14 conditions satisfied | 86% complete |
| Extracted from page 4 — confirm or correct | AI analysed your document |
| Declined 2 June · reason recorded | Not a fit at this time |
| Nothing is waiting on you. | You're all caught up! 🎉 |
| Request batch could not be issued — the current batch is still open. | Something went wrong. Please try again. |

---

## 13. Prohibitions

Each of these has appeared in a competitor product or a previous version of this one. None appears again.

**Visual**
- Border radius above 2px
- Box shadows of any kind
- Gradients of any kind
- Card grids where a table would serve
- Illustrations, spot art, mascots
- Emoji anywhere in the interface
- Coloured background fills on large areas
- Progress bars against invented scores
- Avatar stacks and presence dots
- Decorative iconography

**Behavioural**
- Dashboards with unrequested metrics
- Gamification of any kind
- Mandatory product tours
- Tooltips carrying information needed to complete a task
- Auto-playing anything
- Infinite scroll in a records interface
- Optimistic UI on any consequential action
- The phrase "AI-powered" anywhere
- Marketing copy inside the application
- Any invented number presented as fact

> **Caution 13.1 — Optimistic UI.** Showing a term as accepted before the server confirms is acceptable in a chat application and unacceptable here. Consequential actions display a pending state until the record confirms. The interface never claims something happened that has not yet been written to the record.

---

## 14. Token reference

Paste into the Tailwind theme layer. These are the only values permitted; anything not here requires amending this document.

```
/* ── Colour ────────────────────────────────── */
--surface:          #F5F4F1
--panel:            #FFFFFF
--ink:              #16181C
--ink-secondary:    #464C58
--ink-muted:        #6E7585
--rule:             #D6D4CD
--rule-light:       #E8E6E0
--accent:           #1B3A63
--accent-wash:      #E8EDF4
--satisfied:        #215B49
--satisfied-wash:   #E6F0EC
--attention:        #7A5310
--attention-wash:   #F8F0E0
--adverse:          #7A2E2A
--adverse-wash:     #F7EAE9

/* ── Type ──────────────────────────────────── */
--font-ui:          Archivo, system-ui, sans-serif
--font-doc:         'Source Serif 4', Georgia, serif
--font-data:        'JetBrains Mono', ui-monospace, monospace

/* ── Space (4px base) ──────────────────────── */
--s1 4  --s2 8  --s3 12  --s4 16  --s5 20
--s6 24  --s8 32  --s10 40  --s12 48  --s16 64

/* ── Geometry ──────────────────────────────── */
--radius:           2px
--border:           1px
--border-emphasis:  1.5px
--rule-status:      3px
--shadow:           none

/* ── Dimensions ────────────────────────────── */
--h-row:            36px
--h-control:        36px
--h-nav-item:       32px
--h-topbar:         48px
--h-contextbar:     40px
--w-nav:            216px
--w-content-max:    1440px

/* ── Motion ────────────────────────────────── */
--dur-fast:         120ms
--dur-base:         180ms
--ease:             cubic-bezier(0.2, 0, 0.2, 1)
```

> **How to use this document.** Paste sections 2, 3, 4 and 14 at the top of any prompt that produces interface code. Paste the whole document when starting a new area of the application or when a build has drifted.
>
> If a build produces something that violates a prohibition in section 13, that is a defect, not a preference — revert it rather than negotiating it.

---

**DESIGN CONSTITUTION V2.0 · 30 JULY 2026 · APPLICATION INTERFACE ONLY**
**SUPERSEDES DESIGN CONSTITUTION V1 IN ITS ENTIRETY**
**PUBLIC SURFACE, BRAND IDENTITY AND MARKETING REMAIN OUT OF SCOPE UNTIL THE APPLICATION IS ~80% COMPLETE**
**FOUNDATION DOCUMENT GOVERNS WHAT TO BUILD · THIS GOVERNS HOW IT LOOKS AND READS · CLAUDE.MD GOVERNS IMPLEMENTATION**
