# The Public Register — Marketing Surface Specification v1.0

**Document:** PUBLIC-REG-V1.0 · **Date:** 17 August 2026 · **Scope:** Every surface reachable without signing in

> Paste this at the top of every build prompt that touches a public page. Paste `DESIGN.md` §2, §3 and §13 alongside it — this document inherits them and does not restate their values.

A stranger arrives owing us nothing. In about eight seconds they decide whether this is serious. Every competitor answers that with borrowed credibility. We answer it by showing the instrument and letting them judge it.

## Scope and precedence

This governs the **public surface**: marketing pages, pricing, documentation, tools, and every route reachable without authentication.

It is **derived from `DESIGN.md`, not parallel to it.** The two are one system in two dialects. Everything in §2 below is inherited without variation; only §3's five differences are new, and they exist because a reader with a question is served differently from an operator with a task.

Precedence:
- **Foundation Document** → what to build, and what we refuse to build
- **DESIGN.md** → how the application looks and reads, behind sign-in
- **PUBLIC-REGISTER.md** (this file) → how the public surface looks and reads
- **CLAUDE.md** → implementation discipline

Where this conflicts with `DESIGN.md` on anything not enumerated in §3, `DESIGN.md` wins and this document is wrong.

**Out of scope:** brand identity — logo and wordmark. The current mark is v1 purple and needs redrawing under this register; that is a separate decision (§10.1).

---

## Contents

1. [The thesis](#1-the-thesis)
2. [What is inherited, unchanged](#2-what-is-inherited-unchanged)
3. [What differs, and why](#3-what-differs-and-why)
4. [The fold](#4-the-fold)
5. [Content rules](#5-content-rules--binding-on-every-word)
6. [Credibility without traction](#6-credibility-without-traction)
7. [Accessibility and locale](#7-accessibility-and-locale)
8. [Motion](#8-motion)
9. [Public-surface prohibitions](#9-public-surface-prohibitions)
10. [Open questions](#10-open-questions--flagged-not-decided)

---

## 1. The thesis

> **The one sentence.** The marketing site is the first page of the record — it shows the instruments the product produces, and lets the reader judge them.

`DESIGN.md` §1 states the application's thesis: *every screen is a page of a record that someone may one day have to defend.* The public surface inherits that and adds one job the application never has — **persuading a stranger who owes us nothing.**

Every competitor answers that with borrowed credibility: customer logos, user counts, testimonials, a press strip. We have none of those, and Foundation Document §3.8 prohibits inventing them.

So this register answers it differently: **by showing the artifact.** A real reference number with a visible check digit. A real document schedule. A real conditions register. The reader is never told the product is rigorous; they are shown a rigorous document and left to draw the conclusion themselves.

That is not a workaround for having no traction. It is a stronger position for this buyer than a logo wall, and it is only available to a product that genuinely produces documents.

---

## 2. What is inherited, unchanged

These are **not** re-decided here. Divergence breaks the continuity between marketing site and application that this register exists to create.

| Element | Value | Source |
|---|---|---|
| Interface face | **Archivo** | §3 |
| Document face | **Source Serif 4** | §3 |
| Data face | **JetBrains Mono** | §3 |
| Surface / panel | `#F5F4F1` / `#FFFFFF` | §2.1 |
| Ink ramp | `#16181C` / `#464C58` / `#6E7585` | §2.1 |
| Rules | `#D6D4CD` / `#E8E6E0` | §2.1 |
| Single accent | `#1B3A63` ledger navy · wash `#E8EDF4` | §2.2 |
| Semantic three | satisfied `#215B49` · attention `#7A5310` · adverse `#7A2E2A` | §2.3 |
| Radius ceiling | **2px** | §13 |
| Shadows, gradients | **None, ever** | §13 |
| Numerals | **Tabular lining figures**, always | §3.4 |
| Currency | **Code, never symbol** — `USD 25,000` | §10.3 |
| Semantic colour | Never a large fill; a text label always accompanies the colour | §2.4, §2.5 |
| Monospace meaning | Marks machine-verifiable content only — never decoration | §3.1 |

**Every `DESIGN.md` §13 prohibition carries over in full**, including: no card grids where a table would serve, no illustrations or spot art, no emoji, no decorative iconography, no avatar stacks, no progress bars against invented scores, no coloured background fills on large areas, and the phrase "AI-powered" nowhere.

---

## 3. What differs, and why

Five things change. Nothing else does.

### 3.1 Reading measure — the largest single difference

The application optimises **density**: 13.5px body, because an analyst comparing fourteen diligence items wants them on one screen (`DESIGN.md` §3.3).

Marketing prose optimises **sustained reading**. A visitor reads paragraphs, not table rows.

| | Application | Public |
|---|---|---|
| Prose size | 13.5px | **16px** |
| Prose line-height | 1.55 | **1.65** |
| Measure | full panel width | **66–72 characters, hard cap** |
| Prose face | Archivo | **Source Serif 4** |

**Why the serif for prose.** In the application, Source Serif 4 marks the document surface — the thing that gets printed, cited and filed (`DESIGN.md` §3, §8). On the public site, the argument *is* the document. Setting marketing prose in the document face makes the site read as a prospectus rather than a landing page, and it means a reader has already met the typeface before they ever see their first export.

**This is the one genuine departure from application practice, and it is deliberate.** Archivo is retained for every non-prose element: navigation, labels, buttons, table headers, eyebrows, captions. A reader never sees Source Serif 4 doing interface work, and never sees Archivo set as long-form prose.

### 3.2 Hierarchy for a scanning reader

`DESIGN.md` §3.2 allows `--text-xl` (25px) "rare, one per screen at most." A marketing page needs a genuine top note and clear section entries.

```
--pub-display   40px / 1.15   700  −0.02em   Archivo          Page-defining statement. ONE per page.
--pub-title     25px / 1.25   600  −0.01em   Archivo          Section entry.
--pub-lead      19px / 1.5    400            Source Serif 4   Standfirst under a display line. Optional, one per section.
--pub-prose     16px / 1.65   400            Source Serif 4   Body.
--pub-caption   12.5px / 1.5  400            Archivo          Figure captions, footnotes, source lines.
--pub-label     11px / 1.45   500  +0.09em   Archivo          UPPERCASE eyebrows, table headers, kickers.
```

**Rules.**
- One `--pub-display` per page — the fold promise, and nothing else.
- `--pub-title` opens a section and never appears twice consecutively without prose between.
- `--pub-label` is **the same token as the application's `--text-xs`**, deliberately. It is the visual rhyme a returning reader recognises first.

### 3.3 The reference line in a marketing context

`DESIGN.md` §5 calls this "the one thing a user will remember about the interface." On the public surface it does more work: **it is the proof-of-artifact device.**

**Form is unchanged** — monospace, accent colour, 2px accent left rule, uppercase muted caption beneath. Three permitted contexts, and no others:

1. **As a specimen.** Shown at rest, captioned, demonstrating the format the product issues. The check digit is visible and explained. This is the single strongest element the site has: a stranger sees immediately that objects here have citable identities.
2. **As a section marker.** A page section may carry a reference-formatted identifier as a *format demonstration* — never a fabricated record.
3. **Inside a document specimen.** Where a page shows an export or schedule extract, the reference line appears exactly as it appears on that artifact.

> **Rule 3.3.1 — Specimen data must be self-evidently specimen.** Every reference number, party name and amount shown publicly uses a reserved specimen organisation code and is labelled **SPECIMEN** in its caption. A public reference number must never resolve to a real record. This is Foundation Document §3.8 applied to a design element: an unlabelled realistic record is a fabricated signal even when the format is genuine.

### 3.4 Prose sections and dense tables — the alternating rhythm

The public page has two block types, and alternates them. That alternation **is** the page's visual interest.

**Prose block.** Measure-capped, Source Serif 4, generous vertical space, single column offset from the page's left rule. No background fill, no border, no card. Separated from its neighbours by space alone.

**Instrument block.** A real table at application density — 13.5px, 36px rows, 1.5px `--ink` header rule, `--rule-light` separators, tabular figures, no zebra striping. Sits on `--panel` white against the `--surface` warm neutral. It is visually *tighter* than the prose around it, and that contrast is the point: **the reader sees the product's actual texture beside the argument about it.**

> **Rule 3.4.1.** An instrument block shows a real format — a fee schedule, a conditions register, a document schedule, a record extract. It is never a "features" table, never a comparison against named competitors, and never a pricing table dressed up as a feature grid.

**Cadence.** Prose → instrument → prose → instrument. Three or more consecutive prose blocks and the page has become a brochure. Two consecutive tables and it has become a spec sheet.

### 3.5 Visual interest without illustration

`DESIGN.md` §13 prohibits illustrations, spot art and decorative iconography. Six devices supply interest instead. Every one is content, not ornament.

1. **The rule.** A 1px `--rule` hairline is the primary structural device — full-measure section separators, and a persistent left rule anchoring the content column. This is the register's most recognisable page-level gesture.
2. **The specimen.** A real document extract, ruled and captioned, set on `--panel`. The most visually distinctive element on any page — and it is the product itself.
3. **Density contrast.** 16px prose against a 13.5px table is a strong visual rhythm at zero decorative cost.
4. **Tabular figures in column.** A column of aligned amounts is genuinely handsome, and communicates precision directly rather than claiming it.
5. **The reference line.** Monospace navy against warm neutral, used sparingly — the accent's principal appearance on the page.
6. **Deliberate whitespace.** Prose capped at ~68 characters on a wide viewport leaves substantial open field. That asymmetry is the layout, not an accident of it.

> **Rule 3.5.1 — The accent is rationed.** On a public page the navy appears in: the reference line, links, one primary action, and active navigation. Nothing else. A page where navy appears more than about six times has started decorating.

---

## 4. The fold

> **Rule 4.1 — One promise, no feature grid.**

Above the fold: **one** `--pub-display` statement of what the product does, **one** primary action, and at most **one** supporting `--pub-lead` line.

**Prohibited above the fold:** feature grids, three-column benefit rows, statistic strips, logo rows, carousels, background imagery, and any second competing call to action.

**Recommended:** the promise, the action, and a single reference-line specimen. The reader's first impression is one sentence and one real object.

---

## 5. Content rules — binding on every word

`DESIGN.md` §12 applies in full to public copy. Restated because these are the rules marketing writing routinely breaks:

- Sentence case throughout, except `--pub-label`, which is uppercase.
- **Active voice. No passive constructions.**
- **No exclamation marks.**
- **Sentences under twenty words.**
- No filler, no buzzwords.
- An action keeps one name everywhere it appears.

**The Never-say column carries over verbatim and is binding here:**

| Write | Never write |
|---|---|
| Asserted 4 March · evidence attached | Verified ✓ |
| Complete against the seed schedule | Investor-ready |
| 12 of 14 conditions satisfied | 86% complete |
| Extracted from page 4 — confirm or correct | AI analysed your document |
| Declined 2 June · reason recorded | Not a fit at this time |
| Nothing is waiting on you. | You're all caught up! |

**Public-surface additions:**

| Never write | Because |
|---|---|
| "Trusted by…", "Join thousands…", any user or customer count | No traction exists — §3.8, and see §6 |
| "AI-powered", "seamless", "effortless", "revolutionise" | `DESIGN.md` §13 and the buzzword rule |
| "Verified founders and investors" | No verification system exists — Foundation §15/§25 |
| "DIFC regulated" | No DFSA licence is held — Foundation §20.7 |
| "Contact sales" | Foundation §20.3 requires a published band |
| "Bank-grade", "banking-grade", "institutional-grade" | Implies a standard nobody certifies — see Rule 6.3 |

---

## 6. Credibility without traction

> **Rule 6.1.** No customer logos. No user counts. No transaction volumes. No testimonials. No case studies. No "trusted by." No press strip. **None of these exist, and inventing or implying them violates Foundation Document §3.8.**

**What substitutes, in order of strength:**

### 1. The published schedule
A real document schedule, readable in full by anyone, no account required. No competitor publishes theirs.

### 2. Mechanism provenance
**Every core workflow is named together with its origin in established practice.** The mechanisms carry a track record measured in decades; we adopt them, and we say where they came from.

| Mechanism | Stated origin |
|---|---|
| Single-notice diligence | Documentary credit examination practice (**UCP 600**) |
| The conditions register | Secured lending practice |
| The evidence ladder | Insurance underwriting practice |
| Soft-circle tracking | Syndicate practice |
| The check digit | **ISO 7064 MOD 97-10** — the algorithm behind IBAN |

**Reasoning.** This is the direct answer to *"why trust a product with no track record."* The track record belongs to the mechanisms, not to us, and stating their origin is **verifiable rather than persuasive** — a reader who knows UCP 600 can check whether we have described it correctly, and a reader who does not can look it up. Neither is being asked to take our word for anything.

It also enforces Foundation Document §3.7's language rule from the other side: **we adopt proven process, and never adopt terminology implying we are a bank, a broker, or a licensed intermediary.**

> **Rule 6.3 — Provenance is stated as fact, never as endorsement.** "Adapted from documentary credit examination practice" is permitted. "Banking-grade" is not: it implies a standard that nobody certifies, and it borrows authority instead of citing a source. The test is whether a reader could check the claim. An origin is checkable; a grade is not.

### 3. The reference format
Specimen numbers with visible check digits, and the explanation of why they exist. A reader who types one wrong is told immediately — that is the visible proof the system takes its own records seriously.

### 4. The conditions register
The actual structure a condition moves through, with its real status vocabulary.

### 5. The record
How the append-only chain works, what an entry contains, and what it proves.

### 6. Published prices
Foundation §20.3's firm numbers, and the institutional band with its stated engagement process — itself a credibility signal in a category that hides pricing.

### 7. The refusals
What the product will not do, stated plainly. Foundation §15's exclusions read as conviction precisely because they cost us features.

> **Note 6.2.** These are stronger than a logo wall for this buyer. A partner who has run diligence for twenty years is not persuaded by other people's logos. They are persuaded by seeing the instrument and recognising it as correct.

---

## 7. Accessibility and locale

`DESIGN.md` §11's floor applies unchanged: WCAG AA contrast minimum, visible focus rings in the accent, full keyboard operation, no colour-only signalling, and `prefers-reduced-motion` respected with no carve-outs.

Public-specific:
- Prose contrast targets **AAA (7:1)** where the measure allows. `--ink` on `--surface` clears it.
- Every specimen table is a real semantic `<table>` with proper header cells — never a grid of divs.
- `DESIGN.md` §10's RTL rules apply: logical properties throughout; reference numbers, amounts and dates stay LTR under `dir="ltr"` with `unicode-bidi: isolate`.
- `DESIGN.md` §10.3 formatting: `Intl` throughout, currency code always shown.

---

## 8. Motion

`DESIGN.md` §9 applies without extension: no animation beyond a 120ms colour transition on interactive elements.

**Specifically prohibited:** scroll-triggered reveals, parallax, animated counters, auto-advancing anything. `prefers-reduced-motion` has no exceptions, including for "essential" animation.

---

## 9. Public-surface prohibitions

In addition to every `DESIGN.md` §13 prohibition:

- Hero background images or video
- Carousels and sliders
- Logo walls (see §6)
- Statistic strips and animated counters
- Chat widgets and popup capture
- Cookie banners beyond the legal minimum
- Card grids of features
- Comparison tables against named competitors
- Pricing tables that hide a number behind "contact us"
- Any second brand accent
- Stock photography of people

---

## 10. Open questions — flagged, not decided

1. **Logo and wordmark.** The current mark is v1 purple. A ledger-navy mark is implied by this register but not specified. Explicitly out of scope.
2. **`/p/$slug` and `/i/$slug` public profiles.** Publicly reachable but data-bearing — closer to application surfaces than marketing pages. Which register governs needs its own decision.
3. **Blog.** Notion-backed; content lives outside this repository. Whether §5's writing rules bind externally-authored content needs an editorial answer.
4. **Docs.** 36 pages, currently on v1. Adopting this register means a migration pass of its own size.
5. **OG image.** Currently v1 purple. Needs redrawing under this register.

---

> **How to use this document.** Paste §2, §3 and §5 at the top of any prompt that produces a public page. Paste the whole document when starting a new public surface or when a build has drifted.
>
> If a build produces something that violates a prohibition in §9 or a content rule in §5, that is a defect, not a preference — revert it rather than negotiating it.

---

**PUBLIC REGISTER V1.0 · 17 AUGUST 2026 · PUBLIC SURFACE**
**DERIVED FROM DESIGN CONSTITUTION V2.0 — ONE SYSTEM, TWO DIALECTS**
**BRAND IDENTITY (LOGO, WORDMARK) REMAINS OUT OF SCOPE**
**NO TRACTION CLAIMS EXIST OR MAY BE INVENTED · CREDIBILITY COMES FROM THE ARTIFACT AND THE MECHANISM'S PROVENANCE**
