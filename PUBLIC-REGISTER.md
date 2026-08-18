# The Public Register — Marketing Surface Specification v2.0

**Document:** PUBLIC-REG-V2.0 · **Date:** 18 August 2026 · **Supersedes:** v1.0 (17 August 2026) · **Scope:** Every surface reachable without signing in

> Paste §2, §3, §5 and §9 at the top of any build prompt that touches a public page. Paste the whole document when starting a new public surface or when a build has drifted.

A stranger arrives owing us nothing. In about eight seconds they decide whether this is serious. Every competitor answers that with borrowed credibility — logos, counts, testimonials. We answer it by showing the instrument and letting them judge it, **in a page that looks like it was designed**.

Both halves of that sentence are load-bearing. v1.0 got the first half right and the second half badly wrong. See §11.

---

## Contents

1. [The thesis](#1-the-thesis)
2. [What is inherited — and what is not](#2-what-is-inherited--and-what-is-not)
3. [Typography](#3-typography)
4. [The hero](#4-the-hero)
5. [Section differentiation and rhythm](#5-section-differentiation-and-rhythm)
6. [Graphics — structural and evidential](#6-graphics--structural-and-evidential)
7. [Motion](#7-motion)
8. [Credibility without traction](#8-credibility-without-traction)
9. [Prohibitions](#9-prohibitions)
10. [Accessibility and locale](#10-accessibility-and-locale)
11. [Why v2.0 exists — the measured record](#11-why-v20-exists--the-measured-record)
12. [Open questions](#12-open-questions)

---

## 1. The thesis

> **The one sentence.** The marketing site shows the instruments the product produces, in a page confident enough that a partner at a fund reads it without deciding we are junior.

`DESIGN.md` §1 states the application's thesis: *every screen is a page of a record that someone may one day have to defend.* The public surface inherits that intent and adds one job the application never has — **persuading a stranger who owes us nothing, in eight seconds, before they have read a word.**

That is a visual job before it is a verbal one. A page can be entirely truthful and still fail it by looking like a memo.

**The audience is the calibration.** Founders, VCs and family offices use Linear, Stripe, Ramp, Mercury and Carta daily. Their baseline for "serious software" is set by those products. A page that reads as plainer than a bank's own marketing site does not read as more rigorous — it reads as less finished.

---

## 2. What is inherited — and what is not

### Inherited without variation

| Element | Value | Source |
|---|---|---|
| Interface face | **Archivo** | `DESIGN.md` §3 |
| Document face | **Source Serif 4** | §3 |
| Data face | **JetBrains Mono** | §3 |
| Ink ramp (starting point) | `#16181C` / `#464C58` / `#6E7585` | §2.1 |
| Ledger navy (working accent) | `#1B3A63` · wash `#E8EDF4` | §2.2 |
| Numerals | **Tabular lining figures** wherever data appears | §3.4 |
| Currency | **Code, never symbol** — `USD 25,000` | §10.3 |
| Semantic three | satisfied `#215B49` · attention `#7A5310` · adverse `#7A2E2A`, **only where status is genuinely communicated** | §2.3 |
| Accessibility floor | §11 entire, no carve-outs | §11 |
| Writing rules | §12 entire | §12 |

### Explicitly NOT inherited

**`DESIGN.md` §13 does not apply to the public surface, in any part.** Not the 2px radius ceiling, not the shadow ban, not the gradient ban, not the coloured-fill ban, not the card-grid rule, not the motion limits.

Those rules are correct behind sign-in, where a gradient beside a real cap table competes with the record for attention. They are wrong as marketing constraints, and inheriting them wholesale is what produced v1.0's failure. `DESIGN.md`'s own scope section was corrected on 18 August 2026 to say so.

---

## 3. Typography

### 3.1 The scale

```
--pub-display    clamp(44px, 6vw, 72px)   400–500   −0.02em    Archivo
--pub-title      clamp(28px, 3.5vw, 44px) 500       −0.015em   Archivo
--pub-subtitle   24px / 1.3               500       −0.01em    Archivo
--pub-lead       21px / 1.5               400                  Source Serif 4
--pub-prose      17px / 1.65              400                  Source Serif 4
--pub-caption    13px / 1.5               400                  Archivo
--pub-label      11px / 1.45              500       +0.09em    Archivo, uppercase
```

Three deliberate changes from v1.0, each with a measured reason (§11):

1. **Display is fluid, 44–72px.** v1.0 capped at a fixed 40px. Linear ships 64px, Stripe 48px, Mercury 45px. A 40px headline against 16px body is a 2.5× ratio; Linear runs 4.3×. Scale contrast is most of what reads as "designed."
2. **Display weight drops from 700 to 400–500.** This is the single highest-leverage change in the document. Measured: Stripe 300, Mercury 480, Linear 510. v1.0 specified 700 — heavier than any comparable — and heavy weight at large size is exactly what reads as *document heading* rather than *hero*.
3. **A real lead at 21px enters the scale**, matching Mercury's measured figure, sitting between display and prose. Prose rises 16px → 17px.

**Rules.** One `--pub-display` per page — the hero, nothing else. That restraint is genuine and survives from v1.0. `--pub-title` opens a section. `--pub-label` is the same token as the application's `--text-xs`, deliberately: it is the visual rhyme a returning reader recognises first.

### 3.2 Measure

Prose caps at **66–72 characters**. This is unchanged and non-negotiable — it is the difference between a page that can be read and a page that is merely short.

Measure applies to **prose**. It does not apply to display lines, section headers, tables, or graphics, which may run to whatever width the layout gives them. v1.0's failure was partly applying one narrow column to everything on the page.

### 3.3 Alignment is a per-page choice

Centered, left-aligned, and asymmetric are all permitted, chosen per section, on purpose.

Measured in every comparable: Mercury centers its h1 and h2 then left-aligns further down; Stripe runs a 56px centered h2 among 32px left-aligned siblings; even Chase centers h3 at 36px against a left-aligned h1. **Not one of them is uniformly left-aligned.** v1.0 never said alignment was a choice, and only ever described a left rail — which is what produced the uniform column.

---

## 4. The hero

> **Rule 4.1 — The tagline is the visual anchor of the page. Give it room.**

**Minimum 60vh.** Contains: one `--pub-display` statement, one `--pub-lead` supporting line, one primary action, and optionally one supporting element — a reference-line specimen, a structural graphic (§6.1), or a single instrument extract.

Centered or asymmetric is a per-page decision, made deliberately and stated in the page's own comment header.

**Prohibited in the hero — the complete list:** fabricated data, invented statistics, fake customer logos, testimonials, user counts. That is all. Background treatments, colour blocks, structural graphics and generated fields are permitted and encouraged.

---

## 5. Section differentiation and rhythm

> **Rule 5.1 — Sections must be visually distinguishable from their neighbours.** A reader scrolling at speed should be able to tell, without reading, that they have entered a new section.

v1.0 permitted exactly one differentiator — a 1px rule — and prohibited every other mechanism. That is why the site read as one continuous document.

### 5.2 The neutral ramp — the primary mechanism

Section differentiation on a light surface comes first from **tone**, not colour. The ramp below is deliberately denser than seems necessary; that density is what lets a light page build depth without reaching for shadows or gradients.

```
--pub-n-00   #FFFFFF   panel white — instruments, tables, cards
--pub-n-02   #FCFBFA
--pub-n-04   #F9F8F6
--pub-n-06   #F5F4F1   base surface (inherited --v2-surface)
--pub-n-09   #F0EEEA
--pub-n-12   #E8E6E0   (inherited --v2-rule-light)
--pub-n-18   #DEDBD4
--pub-n-24   #D6D4CD   (inherited --v2-rule)
--pub-n-38   #B4B1A8
--pub-n-52   #8A8880
--pub-n-6e   #6E7585   ink muted
--pub-n-46   #464C58   ink secondary
--pub-n-16   #16181C   ink primary
--pub-n-0d   #0D1420   deep — the dark-section ground (§5.5)
```

Named by hex value, unambiguously — adopted from the textmode extension's ramp, the one genuinely transferable idea in that reference. Steps are uneven on purpose: dense at the light end where section grounds live, sparser through the mid-tones.

**A section ground is any of `--pub-n-00` through `--pub-n-12`.** Adjacent sections must not share one.

### 5.3 Permitted differentiators

- Alternating grounds from the ramp above
- Full-bleed colour blocks in signal blue (§5.4) or deep ground (§5.5)
- Tonal panels, inset or full-bleed
- Gradient fields where they serve depth or hierarchy — subtle, within-family, never rainbow
- Structural dividers beyond a 1px rule: tonal steps, angular transitions, ruled fields
- Generous asymmetric whitespace as a device in its own right

> **Rule 5.3.1 — At most four distinct section treatments per page.** Differentiation must read as a system, not as variety for its own sake. Four is the ceiling; three is usually better.

### 5.4 Signal blue — the saturated accent

```
--pub-signal      #2D6BD4    saturated, same family as ledger navy, brighter
--pub-signal-deep #1E4FA3    for gradient partners and hover states
```

Derived from ledger navy `#1B3A63` by raising luminance and saturation while holding hue in the same blue family, so a page using both reads as one palette rather than two brands.

**Where signal blue may appear:**
- Full-bleed section blocks
- Hero treatment — background fields, structural graphics, gradient partners
- Large-format graphic elements

**Where it may never appear:**
- Anywhere in the authenticated application
- Body text, prose, or any running copy
- As a second interface chrome colour — buttons, links and active navigation stay **ledger navy**, single-accent, per `DESIGN.md` §2.2

Ledger navy remains the working accent. Signal blue is a **field colour**, not a chrome colour. If both appear on one page, navy is doing interface work and signal is doing surface work.

### 5.5 Dark sections — one per page, maximum

A single deep full-bleed section on `--pub-n-0d` is permitted per page.

**One. Not two.** One deep section on a light page is punctuation — it marks the moment the page wants weight. Two make it a dark site with light interruptions, which is a different product and not this one. The site is light.

Inside a dark section, the ink ramp inverts (`--pub-n-00`/`--pub-n-04` for text on `--pub-n-0d`) and the accessibility floor in §10 applies unchanged — contrast is measured, not assumed.

### 5.6 Section headers — the eyebrow convention

Every major section opens with a **monospace eyebrow label** above its title:

```
DISCLOSURE / SCHEDULE
CLOSING / PIPELINE
RECORD / CHAIN
```

`--pub-label` scale, JetBrains Mono, `TOPIC / SUBTOPIC` form, uppercase.

> **Rule 5.6.1 — Eyebrows are stated factually.** They name the section's actual subject. They are not jokes, not slogans, not system-boot theatrics. The device is adopted from a browser-extension marketing page the founder reviewed; **that page's playful retro-terminal voice, its dark theme, and its copy register are explicitly not adopted.** It is a free open-source tool talking to hobbyists; we are an institutional fundraising platform talking to people who move other people's money. The structural device transfers. Nothing else about it does.

---

## 6. Graphics — structural and evidential

Two distinct categories, governed differently.

### 6.1 Structural graphics — abstract, no claim

Permitted: geometric compositions, grid fields, line systems, gradient meshes, generated or animated structural SVG/canvas, calm mathematical fields.

> **Rule 6.1.1 — A structural graphic may not encode data.** The moment it resembles a chart, a metric, a count or a score, it must be a real one from real data or it must not exist. An abstract field is decoration in the honest sense: it makes no claim, so it cannot make a false one.

**A live generated graphic is permitted in the hero.** It must be calm and geometric, must carry no data claim, and must sit on the light surface — the reference that suggested this device runs a noisy dark treatment, which is not adopted. Respect `prefers-reduced-motion` by rendering a static frame.

### 6.2 Evidential graphics — screenshots, diagrams, specimens

These make claims, so they carry the §9 rules in full.

- **Real screens only**, captured from the running application. Never mocked, never a comp, never generated.
- **Specimen data only, labelled.** Every reference number, party name and amount uses reserved specimen values and is marked **SPECIMEN** prominently enough to register before the eye reaches the figures — a corner tag on the image itself, not only a caption beneath it.
- **Cropped to the mechanism** being discussed.
- **A diagram states a real mechanism, exactly as built.** No step, actor or transition that does not exist in the shipped product.
- Presented on a panel ground with a rule; device frames and browser chrome are unnecessary, though a shadow is no longer prohibited if it genuinely aids separation.

### 6.3 The reference line

`DESIGN.md` §5 calls this "the one thing a user will remember about the interface." On the public surface it is the proof-of-artifact device: monospace, accent, 2px accent left rule, uppercase caption beneath.

Three permitted contexts: as a captioned specimen, as a section marker demonstrating format, or inside a document specimen exactly as it appears on that artifact.

> **Rule 6.3.1 — Specimen data must be self-evidently specimen.** A public reference number must never resolve to a real record. This is §9's first prohibition applied to a design element: an unlabelled realistic record is fabricated data even when the format is genuine.

### 6.4 The diagram palette

For diagrams and data visualisation only — never interface chrome.

```
--pub-viz-1   var(--v2-accent)      #1B3A63   primary series / primary actor
--pub-viz-2   #5B7A9E                         counterparty / secondary series
--pub-viz-3   var(--v2-satisfied)   #215B49   confirmed / complete
--pub-viz-4   var(--v2-ink-muted)   #6E7585   pending / not reached
```

---

## 7. Motion

Purposeful motion is permitted. `prefers-reduced-motion` is absolute and has no exceptions.

**Permitted:** entrance transitions on scroll (fade and ≤16px shift, once, no re-trigger), staged reveal of related elements, hover states with real feedback, subtle parallax on structural graphics only, live generated graphics per §6.1.

**Prohibited:** auto-advancing carousels and sliders, animated counters (fabrication-adjacent — a number ticking up implies measurement), looping attention-seeking motion, anything whose purpose is to be noticed rather than to ease a change of state.

---

## 8. Credibility without traction

> **Rule 8.1.** No customer logos. No user counts. No transaction volumes. No testimonials. No case studies. No "trusted by." No press strip. **None of these exist, and inventing or implying them is §9's first prohibition.**

What substitutes, in measured order of strength:

1. **The published schedule** — a real document schedule, readable in full, no account required. No competitor publishes theirs.
2. **Mechanism provenance** — every core workflow named with its origin in established practice:

| Mechanism | Stated origin |
|---|---|
| Single-notice diligence | Documentary credit examination (**UCP 600**) |
| The conditions register | Secured lending practice |
| The evidence ladder | Insurance underwriting practice |
| Soft-circle tracking | Syndicate practice |
| The check digit | **ISO 7064 MOD 97-10** — the IBAN algorithm |

> **Rule 8.2 — Provenance is stated as fact, never as endorsement.** "Adapted from documentary credit examination practice" is permitted. "Bank-grade" is not: it implies a standard nobody certifies and borrows authority instead of citing a source. The test is whether a reader could check the claim. An origin is checkable; a grade is not.

3. **The reference format** — specimen numbers with visible check digits, and why they exist.
4. **The record** — how the append-only chain works, with a real chained segment.
5. **Published prices** — firm numbers, and a stated engagement route where a number would misrepresent what we can deliver.
6. **The refusals** — what the product will not do. Foundation §15's exclusions read as conviction precisely because they cost us features.

> **Note 8.3.** These are stronger than a logo wall for this buyer. A partner who has run diligence for twenty years is not persuaded by other people's logos. They are persuaded by seeing the instrument and recognising it as correct.

---

## 9. Prohibitions

**This is the complete list. Everything not on it is a design decision.**

### 1. Fabricated data of any kind, in any medium

Invented statistics. Fake customer logos. Made-up testimonials. User counts, transaction volumes, growth figures. Screenshots of screens that do not exist. Diagrams of mechanisms that are not built. Specimen data presented without a specimen label (§6.3.1).

### 2. Claims about features that do not exist

Including features that were built and removed, features described in a roadmap, and features a reasonable reader would infer from the copy but that the product does not have.

### 3. Phrases implying a certification nobody holds

"AI-powered." "Bank-grade," "banking-grade," "institutional-grade." "Enterprise-grade" where no enterprise standard is held. "DIFC regulated" while no DFSA licence exists. "Verified" as a product claim while no verification system exists.

---

**That is the entire prohibition list.**

Gradients, shadows, radii above 2px, coloured section blocks, card grids, centered text, large display type, generated graphics, scroll motion, dark sections and saturated accents are **design decisions, not compliance questions**. If a page using them looks bad, that is a design failure and the fix is better design. It is not a rule violation and must not be reported as one.

> **Rule 9.1 — Do not cite `DESIGN.md` §13 against public-surface work.** It governs the authenticated application only. That conflation caused v1.0's failure and is corrected in `DESIGN.md`'s scope section.

---

## 10. Accessibility and locale

`DESIGN.md` §11's floor applies unchanged: WCAG AA minimum, visible focus rings, full keyboard operation, no colour-only signalling, `prefers-reduced-motion` respected without carve-outs.

Public-specific:
- Prose contrast targets **AAA (7:1)** where the measure allows.
- **Contrast is measured on every new ground**, including signal blue and the dark section. A section background is not permitted until its text contrast has been checked against it.

**Measured ratios for the grounds this document introduces** (computed 18 August 2026, not estimated):

| Foreground on ground | Ratio | Verdict |
|---|---|---|
| `#FFFFFF` on `--pub-signal` `#2D6BD4` | **5.04** | AA only — **display and large text only, never body prose** |
| `#FFFFFF` on `--pub-signal-deep` `#1E4FA3` | 7.77 | AAA — safe for body text |
| `#FFFFFF` on `--pub-n-0d` `#0D1420` | 18.45 | AAA |
| `--pub-n-04` on `--pub-n-0d` | 17.39 | AAA |
| `--pub-n-16` ink on `--pub-n-06` surface | 16.16 | AAA |
| Ledger navy on `--pub-n-06` | 10.42 | AAA |

> **Rule 10.1 — Body prose never sits on `--pub-signal`.** At 5.04 it clears AA and fails AAA. Use `--pub-signal-deep` (7.77) for any signal-coloured block carrying running text, and reserve `--pub-signal` for display type, structural fields and large-format elements.

> **Pre-existing defect, recorded not inherited silently: `--v2-ink-muted` `#6E7585` on the base surface `#F5F4F1` measures 4.2 — it fails AA for normal text.** This value comes from `DESIGN.md` §2.1 and predates this document; it is flagged here because §10 requires measurement and measuring it surfaced the problem. Do not use muted ink for anything a reader must actually read at body size on the light surface — captions at 13px are the practical limit, and even those are borderline. Fixing the token itself is a `DESIGN.md` decision affecting the authenticated application, not a public-surface change, and is raised rather than unilaterally altered here.
- Every specimen table is a real semantic `<table>` with proper header cells.
- Structural graphics are `aria-hidden`; evidential graphics carry a full description conveying the mechanism in words.
- `DESIGN.md` §10's RTL rules apply: logical properties throughout; reference numbers, amounts and dates stay LTR under `dir="ltr"` with `unicode-bidi: isolate`.

---

## 11. Why v2.0 exists — the measured record

v1.0 produced a public site the product owner described as **"a PDF page"** — uniformly left-aligned, no hero, no section differentiation, no visual system. This section records why, with the evidence, so the correction is not re-litigated from taste.

**The mechanical cause was one clause.** `DESIGN.md`'s scope section stated that this document inherits *"every §13 prohibition without variation."* §13 bans radius above 2px, all shadows, all gradients, and coloured background fills on large areas. Those are correct for a dense operational interface and wrong for a marketing page. v1.0 then permitted exactly one differentiator — a 1px rule — while prohibiting every other mechanism that produces visual presence. The output was the arithmetic consequence.

**Measured against comparables, 18 August 2026.** Computed styles read off live DOM, not recalled:

| | Hero h1 | Weight | Body | Ratio | Gradients | Shadows | Distinct radii | Section grounds |
|---|---|---|---|---|---|---|---|---|
| Linear | 64px | 510 | 15px | **4.3×** | 11 | 66 | 9 | dark canvas |
| Stripe | 48px | **300** | 16px | 3.0× | **25** | 6 | 9 | **12** |
| Mercury | 45px, centered | 480 | 21px lead | 2.1× | 1 | 6 | 6 | **11** |
| Chase | 32px | 700 | 16px | — | 12 | 16 | 4 | 6 |
| **v1.0 (ours)** | 40px, capped | **700** | 16px | 2.5× | **0 — banned** | **0 — banned** | **1 — 2px** | **2** |

Three findings drove the rewrite:

1. **Heaviest display weight of any comparable.** 700 against Stripe's 300 and Mercury's 480. Heavy weight at display size reads as a document heading.
2. **Zero of every differentiation mechanism.** Even Chase — the most conservative regulated institution named — ships full-saturation blue and green section blocks, 12 gradients and 4 radii.
3. **Uniform left alignment.** No comparable does this. Mercury, Stripe and Chase all mix centered and left-aligned headings deliberately.

**Supporting reference, narrower.** The textmode ecosystem was reviewed for structural logic. Finding: `textmode.art` is an unmodified Mantine app with no `h1`, `h2` or `h3` on the page; `code.textmode.art` is stock VitePress. Neither contains a marketing design system. The one genuinely transferable idea was the browser extension's **dense hex-named neutral ramp** (16 steps, 15 in live use), adopted as §5.2 — the mechanism for light-surface section differentiation without gradients. A separate browser-extension marketing page contributed two structural devices only, §5.6's eyebrow labels and §6.1's live hero graphic, with its visual style, dark theme and playful copy voice explicitly not adopted.

**What did not change, and why that matters.** The prohibition on fabricated data, invented features and borrowed certifications is unchanged and unweakened. v1.0's honesty was never the problem. The problem was mistaking austerity for integrity — a page can be entirely truthful and still fail the eight seconds. v2.0 keeps the first and fixes the second.

---

## 12. Open questions

1. ~~**Logo and wordmark.**~~ **Resolved 17 Aug 2026.** Reference-line monogram as icon/favicon, Archivo wordmark for the header, both ledger navy.
2. **`/p/$slug` and `/i/$slug` public profiles.** Publicly reachable but data-bearing — closer to application surfaces than marketing pages. Which register governs needs its own decision.
3. **Blog.** Notion-backed; content lives outside this repository. Whether §12's writing rules bind externally-authored content needs an editorial answer.
4. **Docs.** 36 pages, currently on v1 styling. Adopting this register is a migration pass of its own size.
5. **OG image.** Currently v1 purple. Needs redrawing under this register.

---

> **How to use this document.** Paste §2, §3, §5 and §9 at the top of any prompt that produces a public page. Paste the whole document when starting a new public surface or when a build has drifted.
>
> If a build violates §9, that is a defect — revert it. If a build merely looks wrong, that is a design problem: fix it with better design, and do not reach for a prohibition that does not exist.

---

**PUBLIC REGISTER V2.0 · 18 AUGUST 2026 · PUBLIC SURFACE**
**DERIVED FROM DESIGN CONSTITUTION V2.0 — ONE FAMILY, NOT ONE RULESET**
**DESIGN.md §13 DOES NOT BIND THIS SURFACE**
**NO FABRICATED DATA · NO UNBUILT FEATURES · NO BORROWED CERTIFICATIONS · EVERYTHING ELSE IS A DESIGN DECISION**
