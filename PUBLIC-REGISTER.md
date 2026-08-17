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

### 3.6 Visual richness: screenshots, diagrams, and layout

**Correction to this document's own history.** §3.5 and §9 as originally written prohibited nearly all visual production value — no product screenshots, no diagrams, one column, no motion. That was correct for the six devices in §3.5, which exist because `DESIGN.md` §13's illustration ban is absolute *inside the authenticated app*, where a fabricated visual next to real data is a §3.8 violation waiting to happen. It was wrong to import that ban wholesale onto a marketing surface that has something the app never needs to show a stranger: the product itself. The reference sites this register now follows — chase.com, wellsfargo.com, worldbank.org, trademap.org, stripe.com — share a property this document previously mistook for austerity: **restraint with production value.** None of them are noisy. All of them are visually rich. This section corrects that.

**3.6.1 — Product screenshots are first-class content, not a device to permit grudgingly.**

The deal room, the diligence checklist, the conditions register, and the term sheet are dense, real, institutional-looking interfaces, and they are the single most persuasive asset this site has access to — more persuasive than any instrument table, because a table describes the product and a screenshot *is* it.

Rules, binding:
- **Real screens only, captured from the actual running application. Never mocked, never a Figma comp, never AI-generated.** A screenshot is a claim that this is what the software looks like; a fabricated one is a §3.8 violation with pixels instead of words.
- **Specimen data only, and labelled per Rule 3.3.1.** A screenshot showing a real party's name, a real amount, or a real reference number does not ship, ever — same standard as the reference-line specimen, extended to a wider canvas. Every screenshot needs its own **SPECIMEN** caption; a screenshot is not exempt from 3.3.1 just because it's an image rather than a rendered reference line.
- **Cropped to the mechanism under discussion, not the whole screen.** A screenshot illustrating the conditions register shows the conditions register — not a full browser chrome, not a sidebar unrelated to the point, not a stray notification. This keeps screenshots instrument-like (§3.4's "a real format," not a marketing hero shot) rather than decorative.
- **No browser chrome, no device frames, no drop shadows around the image itself.** The image is presented the way an instrument table is: on `--panel`, with a `--rule` border, captioned below. A screenshot wrapped in a glossy MacBook mockup is exactly the kind of production polish that reads as marketing rather than evidence, and it violates §9's shadow prohibition regardless of whether the shadow is on the frame or the content.
- **A screenshot is a fourth block type, joining prose and instrument in the cadence rule (§3.4).** It does not replace an instrument where a real table would serve the same claim better (§3.4's existing rule holds); it is used where the product's actual visual density — many fields, real structure, genuine complexity — is the point being made, and a table would flatten that into something that reads as invented.

**3.6.2 — Diagrams: process and architecture, drawn, not tabulated.**

Some real product mechanisms are sequences or structures better shown than listed. The closing pipeline — six gates, each requiring the last, several requiring both parties — is exactly this case: a table states the same facts an instrument already states well (§3.4 is right that a table stays the default), but a **sequence diagram** showing the two-party back-and-forth makes the mutual-confirmation claim visible in a way a table's "Both parties" column only asserts.

Rules, binding:
- A diagram states a real mechanism, exactly as built — same standard as an instrument. No diagram may show a step, an actor, or a data flow that doesn't exist in the shipped product.
- Constructed from the register's existing visual language: `--rule` hairlines, `--ink`/`--accent` for lines and nodes, `--v2-*` fills only (see 3.6.5 below for the extended palette this permits), Archivo for labels, no icon library, no isometric illustration style.
- A diagram earns its place only where it clarifies a *relationship* prose and an instrument table both struggle with — sequence, dependency, or hierarchy. It is not a default alternative to a table; most of this register's content is still better served by prose→instrument (§3.4 unchanged).
- Same motion restriction as everything else (3.6.4): a diagram may be static or may reveal at low amplitude on scroll; it never animates its own content (no flowing lines, no pulsing nodes).

**3.6.3 — Layout: genuine variety, not one centred column repeated.**

§4's fold rule and §3.4's cadence rule are unchanged and remain binding — one `--pub-display`, one action, prose→instrument alternation. What this section adds is permission for the *page*, not the section, to vary its structure:

- **Full-bleed sections** — a section may span the full viewport width with its content still measure-capped inside it, using a tonal panel (3.6.6) or a screenshot as the full-bleed element. This is a layout device, not a decoration; it exists to give a screenshot or diagram room to be legible.
- **Two-column splits** — prose in one column, a screenshot, diagram, or specimen in the other, at the section level. This is already the fold's structure (§4's "Recommended" pattern); this rule extends it to interior sections where a real asset justifies the split, not as a default two-column template applied everywhere.
- **Offset figures** — a screenshot or diagram may break the left-rule alignment described in §3.5 item 1 deliberately, to create visual rhythm across a long page. The left rule remains the *default* anchor; an occasional offset is the exception that makes the rule visible, not a replacement for it.
- **What this does not permit:** a card grid where a table would serve (§9, unchanged), a hero carousel, a masonry layout, or "variety" as an end in itself. Every layout choice still answers to §3.4's cadence and §4's fold rule — this section adds vocabulary, not license.

**3.6.4 — Restrained motion: purposeful only.**

`DESIGN.md` §9's floor is unchanged: no animation beyond what's listed here, and `prefers-reduced-motion` has no exceptions, ever, including for anything below.

Newly permitted, exactly this and nothing more:
- **Scroll-triggered reveal, low amplitude.** An element may fade and shift in by no more than 8px as it enters the viewport, once, no re-trigger on scroll-back. This is the only scroll-linked motion permitted anywhere on the public surface.

Still and permanently prohibited, unchanged from §8/§9: parallax, animated counters, auto-advancing carousels, looping background motion, hover-triggered scale/tilt effects, any animation whose purpose is to be noticed rather than to ease a state change.

**3.6.5 — A secondary palette, for diagrams and data visualisation only.**

`DESIGN.md` §2.2's single-accent rule (§3.5.1's "the accent is rationed") governs interface chrome — buttons, links, active navigation — and stays exactly as strict as written; this section does not touch it. It does not serve a diagram with multiple distinct lines, a multi-series chart, or a sequence diagram with several actors, where one navy exhausts itself immediately.

Four additional tones, derived from the existing v2 semantic and accent tokens rather than invented fresh — each is an existing token's hue at a different position, not a new colour decision:

```
--pub-viz-1   var(--v2-accent)        #1B3A63   ledger navy — primary series / primary actor
--pub-viz-2   #5B7A9E                            a lighter step of the same navy — secondary series / counterparty
--pub-viz-3   var(--v2-satisfied)     #215B49   confirmed / complete states in a diagram
--pub-viz-4   var(--v2-ink-muted)     #6E7585   inactive / pending / not-yet-reached states
```

Rules: this palette is for diagrams and charts only — never for buttons, links, badges, or any interface chrome, which stay single-accent per §3.5.1. No fill exceeds the tonal weight of `--panel`-on-`--surface` contrast already established; these are line and node colours, not backgrounds. `--pub-viz-2` exists specifically so a two-party sequence diagram (the closing pipeline's natural home) can distinguish founder from investor without inventing a second brand colour.

**3.6.6 — Depth where it aids structure.**

The 2px radius ceiling and the no-drop-shadow rule (`DESIGN.md` §13, inherited without variation per register §2) are unchanged and absolute. What's newly permitted:

- **1px rules as section dividers within a full-bleed block**, not just between prose sections — e.g., separating a screenshot from its caption, or dividing a two-column split.
- **Subtle tonal panels** — a section background may shift between `--surface` and `--panel` (the two tones already in the palette) to separate a full-bleed block from its neighbours, exactly as an instrument's table already sits on `--panel` against `--surface`. No new colour is introduced; this extends an existing contrast to section-level backgrounds.
- **No shadows, ever, on anything** — screenshots, diagrams, panels, cards. If something needs visual separation, it gets a `--rule` border or a tonal panel shift, never a shadow. This is the one place this amendment adds zero new permission, stated explicitly because screenshots are exactly where a shadow is most tempting.

**Theme, restated because it is the one thing that would be catastrophic to get wrong on a rebuild.** The site stays light. `--v2-surface` (`#F5F4F1`) and `--v2-panel` (`#FFFFFF`) are the only backgrounds anywhere on the public surface — no dark hero, no dark section, no dark theme toggle. Any visual reference to dark-canvas sites used for layout inspiration is for structure and signature only; their dark background is explicitly not adopted.

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

`DESIGN.md` §9 applies, extended by §3.6.4 only: a 120ms colour transition on interactive elements, plus one addition — scroll-triggered reveal at low amplitude (≤8px shift, fade in, no re-trigger on scroll-back), permitted nowhere else on the public surface and governed entirely by §3.6.4's rule, not by this section independently.

**Specifically prohibited, unchanged:** parallax, animated counters, auto-advancing anything, looping background motion, hover-triggered scale/tilt. `prefers-reduced-motion` has no exceptions, including for "essential" animation and including the scroll-reveal §3.6.4 permits.

---

## 9. Public-surface prohibitions

**Amended by §3.6** — screenshots, diagrams, layout variety, low-amplitude scroll reveal, and the §3.6.5 diagram palette are now permitted under the rules stated there. Nothing below is loosened by that amendment; §3.6 adds vocabulary within these limits, not exceptions to them.

In addition to every `DESIGN.md` §13 prohibition:

- Fabricated data of any kind, in any medium — text, table, screenshot, or diagram (§3.8, extended explicitly to visual content by §3.6.1)
- Traction claims — logos, user counts, testimonials, "trusted by" (see §6)
- Stock photography of people
- Decorative illustration, spot art, icon libraries used as ornament
- Card grids of features where a table would serve
- Comparison tables against named competitors
- Gamification — badges, streaks, progress-for-its-own-sake
- Pricing tables that hide a number behind "contact us"
- Any second brand accent used as interface chrome (§3.6.5's diagram palette is explicitly exempted, and is explicitly not chrome)
- Hero background images or video, carousels, sliders, auto-advancing anything, parallax, animated counters
- Chat widgets and popup capture
- Cookie banners beyond the legal minimum
- "AI-powered", "bank-grade", "banking-grade", "institutional-grade", or any phrase implying a certification nobody holds

---

## 10. Open questions — flagged, not decided

1. ~~**Logo and wordmark.** The current mark is v1 purple. A ledger-navy mark is implied by this register but not specified. Explicitly out of scope.~~ **Resolved 17 Aug 2026.** Icon/favicon: the reference-line monogram (an H built from the same rule-and-tick vocabulary as the reference-line specimen, §3.3) — the only one of three proposed directions that survives to 24px legibly. Header wordmark: Archivo Bold, tight tracking, no glyph — paired with the monogram rather than standing alone, since a wordmark has no icon-sized form by construction. Both ledger navy `#1B3A63` on `#F5F4F1`/transparent, single colour, no gradient. Assets at `frontend/public/favicon.svg` (monogram) and `frontend/src/components/brand/`.
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
