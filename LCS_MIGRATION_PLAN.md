# LCS Migration Plan — Groups 5+

Generated 4 Sep 2026, by a step-0 audit (Explore agent, Opus) of the current repo state, re-run because the original 11-group plan for the internal (authenticated) UI migration to LCS was delivered as chat output in an earlier session and never saved to a file — this document exists specifically so that gap doesn't recur for whoever scopes the next group. See CLAUDE.md's amendment log (27 Aug – 4 Sep 2026 entries) for the history of Groups 0–4, already closed.

**Read this before starting any group below.** Each group still needs its own structural-fit report (per the standing discipline: report before building if anything doesn't map cleanly onto the 10 LCS primitives) and its own live verification pass, exactly as Groups 0–4 were done. This document is the *inventory and ordering*, not a substitute for that per-group discipline.

**This ordering is not exclusive.** Per CLAUDE.md §7.4's standing rule (added 4 Sep 2026): a page rendering v1 purple theme found incidentally during *any* work — testing, an unrelated feature build, live verification of something else — gets flagged and migrated on the spot, regardless of which group it's assigned to below or whether that group has started. Content stays unchanged, only the visual system changes, same restyle-only discipline as every group here. This document still governs the deliberate, scheduled sequence; it doesn't gate an incidental fix.

---

## Method

Full inventory of `src/routes/app.*.tsx` and `src/routes/app.investor.*.tsx` (100 files scanned), excluding the `deals-preview.*`/`app.advisor-preview.*`/`app.lcs-preview.tsx` sandbox (never v1 — built directly against LCS, unauthenticated, no nav, not part of this migration) and the already-migrated files from Groups 0–4. Every file classified as: still v1 (real work), already on the intermediate v2 tokens (tracked-open elsewhere, not in scope here), already LCS, or a thin alias/redirect (no styling of its own — covered for free once its target component is migrated).

## Totals

| Class | Count |
|---|---|
| v1 route files remaining (real work) | 35 |
| Thin aliases / redirects (no double-count) | 31 |
| v2 tokens (tracked-open, not in scope here) | 15 routes + 6 components |
| Already LCS (Groups 0–4) | 9 routes + 3 components |
| Excluded sandbox | 4 |

Two shared **v1 primitive layers** underpin nearly everything and are the real blockers:
- `components/system/` (`PageFrame.tsx` 122L, `EmptyState.tsx` 75L, `Illustration.tsx` 134L, `StatusDot.tsx` 45L, `Button.tsx` 38L, `SectionLabel.tsx` 27L, `index.ts`) — imported by **26 route files**.
- `lib/design-tokens.ts` (147L, hardcoded `#7C3AED` etc.) — imported by 8 routes + `PageFrame.tsx` + `StatusDot.tsx` + `RequestAccessButton.tsx` + `PaymentConfirm.tsx`.

**Total remaining work: ~26,350 lines of v1 across 35 route files and ~20 component files, plus ~2,780 lines of v2 pulled into Group 6 by decision (see below) — ~29,130 lines total across Groups 5–10.**

---

## Group 5 — Shared v1 primitive layer — **CLOSED 4 Sep 2026**

**Ordered first: pure dependency — 26 routes import these.**

> **CLOSED.** `components/system/` (all 6 files + `index.ts`) and `lib/design-tokens.ts` deleted; all 28 real importers (one more than this document's original 26-count — `components/app/PermissionGate.tsx` imported via a deep path, `@/components/system/EmptyState`, invisible to the barrel-import grep that built the original list) migrated to real `@/components/lcs` primitives directly, using the exact mapping rules recorded below. One file, `routes/i.$slug.tsx`, turned out to be a **public-facing** route importing `design-tokens.ts` directly (out of scope for this internal-app migration per CLAUDE.md §9) — its two used values (`color`, `font` subsets) were inlined as a local const rather than touched structurally; verified live, side-by-side against production, pixel-identical before/after.
>
> The two Group-6-scoped deal-room files (`app.deal-rooms.$id.diligence.tsx`, `app.deal-rooms.$id.qa.tsx`) and the Group-10-scoped `app.roast.index.tsx` got **only** the mechanical primitive-import swap, confirmed by diff size (4-line diffs for the two deal-room files) — their broader v1 styling is untouched, left for their respective groups.
>
> **Verified:** `tsc` 55/55, error SET diffed against the pre-group baseline (not count alone) — every diff line was a pure line-number shift from added imports, zero new errors, confirmed independently by the orchestrating session, not just by the agent's self-report. Build clean, gzip 0.73 MB, action-split guard passed. Full-repo grep confirmed zero remaining references to either deleted module. Live-verified with real founder and investor sessions across multiple pages exercising the new primitives with real production data (`DealFlowHome`'s `LcsStatusPill` tone mapping, `app.investor.startups.tsx`'s watchlist table, `app.connections.tsx`'s empty state) — zero console errors throughout.
>
> **One real defect found and fixed during the swap, not a regression:** `app.investor.profile.tsx` had a pre-existing dead ternary, `color.ink === "#0A0A0B" ? "#7C3AED" : "#7C3AED"` — both branches already identical before the token substitution, so it was a no-op condition even in the original v1 code. Collapsed to the constant `"#7C3AED"` during the swap; behavior-identical, confirmed by reading both branches' literal values before accepting the change.
>
> No LCS primitive exists for `PageFrame`'s breadcrumb (`PageBreadcrumb`) or for `SectionLabel` — both inlined per-callsite as plain styled elements on `--lcs-*` tokens (the `SectionLabel` pattern matches the one already used in `app.messages.tsx`'s "CHANNELS"/"SECTIONS" labels), not built as new shared components, per instruction not to invent new primitives.

| File | Lines |
|---|---|
| `components/system/PageFrame.tsx` | 122 |
| `components/system/EmptyState.tsx` | 75 |
| `components/system/Illustration.tsx` | 134 |
| `components/system/StatusDot.tsx` | 45 |
| `components/system/Button.tsx` | 38 |
| `components/system/SectionLabel.tsx` | 27 |
| `components/system/index.ts` | — |
| `lib/design-tokens.ts` | 147 |

**~588 lines.** Every one of these has a direct LCS equivalent already shipped (`PageFrame`→`LcsPageShell`/`LcsPageHeader`, `EmptyState`→`LcsEmptyState`, `Button`→`LcsButton`, `StatusDot`→`LcsStatusPill`).

**DECIDED, 4 Sep 2026: delete `components/system/` and `lib/design-tokens.ts` outright; swap all 26 importers to the real `@/components/lcs` primitives directly.** Not restyle-in-place, not a compatibility wrapper — one primitive library, no leftover parallel import path. Reasoning: a wrapper keeps a second, redundant import path alive permanently, exactly the `components/v2/`-alongside-`components/lcs/` problem this same document flags below as an existing issue; restyling in place would mean reimplementing what's already built and proven through Groups 3–4, for no benefit over pointing importers at the real thing.

Each of the 26 importing route/component files still needs its own touch (import swap + any prop-shape differences between the old and new primitive) and its own byte-identical-logic verification — this decision settles the *target*, not the per-file mechanics, which still need the same structural-fit discipline as every prior group.

---

## Group 6 — Deal Room shell + Commit-class tabs

**Ordered second on both risk and dependency: real stage transitions / NDA signing / document release / closing, and `app.deal-rooms.$id.tsx` is the v1 shell all its tabs render inside via `<Outlet/>`.**

| File | Lines | State |
|---|---|---|
| `routes/app.deal-rooms.$id.tsx` | 439 | v1 — shell: header, `StageTabBar`, Activity drawer, AI slide-over |
| `routes/app.deal-rooms.$id.diligence.tsx` | 799 | v1 (58 hits) |
| `routes/app.deal-rooms.$id.information.tsx` | 754 | **hybrid** — v2 base, 58 v1 hits remaining |
| `routes/app.deal-rooms.$id.qa.tsx` | 590 | v1 (52 hits) |
| `routes/app.deal-rooms.$id.nda.tsx` | 353 | v1 (16 hits) — NDA signing, Commit-class |
| `routes/app.deal-rooms.$id.overview.tsx` | 609 | **hybrid** — v1(9) + v2(25) |
| `components/app/DealRoomTimeline.tsx` | 43 | v1 |
| `components/ai/AIChat.tsx` | 158 | v1 — rendered by the shell's AI slide-over |
| `components/app/DDAnalysisPanel.tsx` | 209 | v1 |
| `components/app/Stage2Gate.tsx` | 25 | v1 — kept from Group 0's `DealRoomWorkflow.tsx` extraction |
| `components/app/MutualDisclosure.tsx` | 400 | hybrid — v1(2) + v2(2) |
| `components/app/RequestAccessButton.tsx` | 191 | v1 + `design-tokens` |

**~4,570 lines, plus the pulled-in v2 tabs below. Largest and riskiest group.**

**DECIDED, 4 Sep 2026: pull all four already-v2 sibling tabs into this group's scope** — `documents` (1347L), `meetings` (749L), `term-sheets` (523L), `close` (161L), ~2,780 more lines, bringing the group total to **~7,350 lines**. Reasoning: restyling only the shell would ship the single most visible mixed-design-system surface in the app — a user moving tab-to-tab inside one deal room would see the chrome's design language change underneath them. Same precedent as Group 1's AppShell/MemberShell call (a mismatched pair judged worse than delaying either). Every tab — the five genuinely-v1 ones (shell, diligence, qa, nda, overview/information hybrids) and the four pulled-in v2 ones — gets the same structural-fit report before building and byte-identical-logic verification. **Live verification for this group must additionally cover the tab-to-tab navigation experience itself, not just each tab checked in isolation** — the seam being fixed is specifically about the transition, so a per-tab-only check would miss the actual defect this decision exists to prevent.

**Structural-fit concerns:**
- `app.deal-rooms.$id.tsx` has its own internal tab rail (`StageTabBar`) plus two slide-over drawers (Activity, AI) — same shape as Group 4's `app.settings.tsx`/`app.messages.tsx`. **Report structural fit before building.**
- `information.tsx` and `overview.tsx` are genuine v1/v2 hybrids (partially converted already) — audit per-file, don't blind-sweep.
- The four pulled-in v2 tabs are on the *intermediate* v2 tokens, not v1 — their restyle work is v2→LCS, a different starting point than the v1→LCS work on the rest of the group. Confirm each one's actual v2-token surface before assuming the conversion is mechanically identical to the v1 files.
- `app.deal-rooms.$id.activity.tsx` is 16 lines with no markup — check whether it's a stub worth deleting before restyling it.

### Group 6 recon — full structural-fit report, 4 Sep 2026

A full read-through recon (Explore agent, Opus) of all 9 tab files plus `DealRoomTimeline.tsx`, `LawyerRoomView.tsx`, and `AIChat.tsx` was run before any code was touched, per the standing discipline. Confirmed real line counts (some differ slightly from the table above, which was grep-estimated): `$id.tsx` 439, diligence 799, information 754, qa 590, nda 353, overview 609, documents 1347, meetings 749, term-sheets 523, close 161, `DealRoomTimeline.tsx` 49, `LawyerRoomView.tsx` 192, `AIChat.tsx` 158 — **6,724 lines read in full**, plus the shell.

**`LawyerRoomView.tsx` is added to Group 6's scope** (it was already listed above but under-weighted) — it renders *instead of* the tab Outlet for the lawyer role, sharing the avatar-square and card patterns with the tabs a lawyer can't reach, so restyling only the tabs would leave the lawyer's view visibly divergent from everything else.

**`AIChat.tsx` is explicitly OUT of Group 6's scope**, flagged for its own separate pass. It renders inside the shell's AI slide-over but is also mounted app-wide (pipeline, leads, advisor, documents, meetings contexts) — a full restyle here is an app-wide change that happens to be reachable from this group, not a Group 6 change. It has genuinely LCS-hostile structure (rounded chat bubbles, a Tailwind Typography `prose` scale with no LCS equivalent, 5 shadow usages, 3 gradients) that needs its own scoped decision, not a side-effect fix. It also carries the route-string bug logged in CLAUDE.md §19l — not fixed here either.

**Six Phase-0 decisions, all resolved before build, recorded here so the reasoning survives independent of chat history:**

1. **`V2Skeleton` and `ReferenceLine` (v2 primitives used only in overview.tsx, no LCS equivalent) → build as real new LCS primitives**, `LcsSkeleton` and `LcsReferenceLine`, in `components/lcs/`, documented in `PRIMITIVES.md` with the same rigor as the original 10. This makes LCS a 12-primitive system as of Group 6, not 10 — update any prior "10 primitives" language encountered elsewhere to reflect this once built.
2. **`StatusLabel`'s `neutral`/`adverse` tones and its `dot?` toggle → extend `LcsStatusPill` itself** with an optional `dot?: boolean` prop (default `true`, preserving every existing caller's appearance), and map `neutral → pending`, `adverse → attention` (LCS's established "no red, amber covers errors too" fallback, consistent with every prior group).
3. **`V2PageHeader`'s breadcrumb + flexible `actions` slot (used by meetings.tsx, term-sheets.tsx) → do NOT extend `LcsPageHeader`.** Its contract stays exactly as documented ("no breadcrumbs, no stat tiles, no tabs baked in"). Breadcrumbs render as a small inline element directly above the real `LcsPageHeader` call (same pattern as Group 5's `PageBreadcrumb` inlining and `app.investor.analysis.tsx`'s existing precedent). term-sheets' custom stat-card `actions` content becomes a separately positioned flex element, never forced into the header's single-primary-button `action` slot.
4. **9 independent avatar-initial implementations (2 shapes, 2 token systems, across overview/LawyerRoomView/qa) and 4 different sequence/stepper grammars (overview's horizontal dots, meetings' vertical numbered cards, close's collapsing gates, the Activity drawer's timeline spine) → restyle each individually in place on `--lcs-*` tokens, preserving exact current shape/size/behavior.** No new shared component built as part of Group 6. **Logged as an explicit future proposal in `PRIMITIVES.md`**: once Group 6 lands and all 9+4 instances exist side-by-side on LCS tokens, a deliberate consolidation pass can compare them and decide what a real shared `AvatarInitial`/`Stepper` primitive should look like — inventing one mid-restyle was rejected as scope creep into primitive design.
5. **Two decorative multi-color palettes exceeding the 4-status budget:**
   - **diligence.tsx's 6-color `DD_CATEGORY_COLORS`** (Team/Market/Financials/Legal/Product/Traction — category labels, not states) → **plain `--lcs-ink-muted` text chip with a border, no color-coding at all.** Color-coding categories would falsely imply some are "more attention" than others.
   - **information.tsx's document-request states** (pending/fulfilled/declined — genuine states) → **direct map onto `pending`/`satisfied`/`attention`**, a real 1:1 fit.

**Two live, non-styling bugs found incidentally during recon, logged in CLAUDE.md §19l, deliberately NOT fixed by Group 6:**
- `documents.tsx`: the Stage-2 document-gating block is permanently unreachable (the query never selects the column its own filter depends on).
- `AIChat.tsx`: deal-room page-context detection checks `/deal-room/` (singular) against real `/deal-rooms/` (plural) routes — never matches, degrades every deal-room AI interaction to a worse context.

**Risk ranking (Commit-class write density × structural-fit difficulty), highest risk first:** nda.tsx (legally-binding signature, zero test hooks, unique standalone shape) → diligence.tsx (9 writes incl. 2 unconfirmed-destructive, worst palette problem, 2 full pages in one file) → documents.tsx (~14 writes, most in the group, zero test hooks, the Stage-2 bug) → term-sheets.tsx (7 negotiation writes incl. a mutual reset that wipes all terms) → information.tsx (4 writes + 1 destructive delete, plus 3 fake `console.log`-only controls already flagged as dead in an earlier session pass) → meetings.tsx (9 writes incl. real third-party video-room creation/destruction) → qa.tsx (5 writes, but the best test-hook coverage in the group) → overview.tsx (1 write, blocked only on the new-primitive decisions above) → close.tsx (0 direct writes — orchestrates the highest-consequence flow via 4 shared child components it explicitly must NOT restyle).

**Recommended build order — 5 phases, not one pass, given ~6,900 lines across 12 files (9 tabs + shell + Timeline + LawyerRoomView, AIChat excluded):**

- **Phase 1 — low-risk, establishes the new patterns (~1,010 lines):** `close.tsx` → `DealRoomTimeline.tsx` → `LawyerRoomView.tsx` → `overview.tsx`. `close.tsx` first because it's nearly free and forces the "don't touch shared children" discipline early (its own source comment already states `LawyerGate`/`TermClosingPanel`/`ClosingPipeline`/`ExitDeal` are explicitly out of scope for this file's pass). Timeline + LawyerRoomView settle the avatar/card patterns on small surfaces before overview applies them at scale and exercises the two new primitives for the first time.
- **Phase 2 — v2→LCS mechanical, once mappings are proven (~1,272 lines):** `term-sheets.tsx` → `meetings.tsx`. Both clean v2 with documented tone vocabularies; term-sheets first since it's smaller and its own `STATUS_CHIP` comment already documents the tone-collapse reasoning that becomes the template for meetings.
- **Phase 3 — the large v2 file, alone (~1,347 lines):** `documents.tsx`, its own build step. 18% of the group by volume, the most write actions, zero test hooks, plus an orphaned `pendingDeletes` ref and the logged Stage-2 bug — bundling it with anything else makes the diff unreviewable.
- **Phase 4 — the shell + hardest v1 files, last (~4,180 lines):** `app.deal-rooms.$id.tsx` (the shell itself) → `qa.tsx` (best test-hook coverage, no palette problem) → `information.tsx` → `diligence.tsx` (the two unresolved-until-now palette collapses, highest v1 token density, now resolved by decision 5 above). The shell moves here rather than first because its `StageTabBar`/header restyle is easiest to get right once every tab it links to already renders correctly on LCS tokens — restyling the shell before its children would produce a working-shell/broken-tabs intermediate state for the whole group's duration.
- **`nda.tsx` is deliberately its own single-file step, not batched into any phase above** — highest legal consequence in the group (its `buildPreviewNdaText` output is recorded verbatim as the signed agreement), zero test hooks, and a shape that matches no other file (a standalone centered signing page, not a tab). Slot it at the end of Phase 4, reviewed alone.

**Per-file conditional/write/test-hook inventories from the recon are extensive** (every `isInvestor`/`isFounder`/`isLawyer` branch, every Commit-class write call site, every `data-testid`, every dead-code flag) — not reproduced in full here to keep this document navigable; re-run the same recon-agent prompt shape against the specific file about to be built if the inventory is needed again, rather than trusting memory of this summary.

### Phases 1–3 — CLOSED

`close.tsx` → `DealRoomTimeline.tsx` → `LawyerRoomView.tsx` → `overview.tsx` (Phase 1), `term-sheets.tsx` → `meetings.tsx` (Phase 2), `documents.tsx` alone (Phase 3) all built, tsc-verified (55/55 exact error-set match held at every step), and live-verified against real fixture data. Two items surfaced during these phases and are tracked here rather than fixed inline, since fixing either would mean editing a shared primitive mid-restyle:

- **`LcsButton`'s `text-link` variant unconditionally applies `text-decoration: underline` via its className, with no way to suppress it via the `style` prop (`text-decoration` isn't something the inline `style` merge can override cleanly against a class-level `underline` utility).** Found during `documents.tsx`'s Phase 3 build: every icon-only button converted from `V2Button variant="quiet"` (Preview/Download/Remove/etc.) inherits this. Checked live via computed styles — `getComputedStyle(btn).textDecorationLine` is genuinely `"underline"` on every icon-only instance — but it produces **zero visible artifact** in every case checked, because an SVG child with no text sibling gives the underline nothing to render under. Not urgent, since nothing currently looks wrong, but it's a latent contract gap: a future icon-only button that also carries an aria-label rendered as visible text, or a browser/renderer that draws underlines differently for icon-only inline boxes, could expose it. **Tracked fix, next time `LcsButton` itself is touched:** either add a dedicated icon-only variant (no underline, tighter default padding) or conditionally suppress the underline class when the button has no text child (e.g. check `children` shape, or require callers to pass an explicit `aria-label`-only "icon" flag).
- Confirmed (not a defect): `LcsStatusPill`'s `dot?: boolean` extension (Phase-0 decision 2) shipped clean — additive-only, default `true`, zero effect on Phase 1/2's existing call sites, verified by tsc before touching `documents.tsx` further.

`documents.tsx`'s `PlatformDocList`/`Stage2Gate` sub-path was **not live-verified with real data** — neither fixture deal room has a `founder_documents` row with `visibility='deal_room'`, and manufacturing one would have meant a live write outside this pass's scope. Structurally low-risk (same icon-tile/text/status-pill/button pattern already verified elsewhere in the same file), but flagged here as a residual gap rather than claimed as covered.

### Phase 4 — CLOSED (shell → qa.tsx → information.tsx → diligence.tsx; nda.tsx is its own separate step, not yet started)

All four files built, tsc-verified (55/55 exact error-set match held at every step, including two intentional 1-line simplification/restoration cycles below), and live-verified against real fixture data.

- **Shell (`app.deal-rooms.$id.tsx`) — scope expanded mid-file by direct instruction.** The user flagged that v1 purple had been visible across multiple sessions and asked for a full removal in this file specifically (not deferred again). Beyond the shell's own planned restyle, this also removed `STAGES`' two decorative emoji icons (`⬛`/`🔒`, in the shared `lib/deal-room-stages.ts`) — `⬛` dropped, `🔒` replaced with a real Lucide `Lock` icon rendered by `StageTabBar` itself, keyed off its own existing `canAccess()` check rather than the data file. A full-repo grep for `hs-gradient`/`#7C3AED`/`gradient-brand` found **47 files** carrying the same markers, including `styles.css` itself and most of the app outside this migration — confirmed with the user this was **shell file only, right now**; the other 46 are tracked as their own future dedicated pass in CLAUDE.md §19m, not silently expanded into here.
- **`qa.tsx` — one collapse reverted after review.** The initial pass collapsed `isAnswered ? "border-border/60" : "border-border"` (a two-strength border) onto a single token, on the assumption it was decorative noise duplicating the "Open"/"Answered" status pill. On review this was confirmed **not** purely decorative — the two opacities are a real independent visual-prominence signal (open questions read with a stronger border than answered ones), distinct from what the status pill's text conveys. Restored using `color-mix(in srgb, var(--lcs-line) 60%, transparent)` for answered rows; verified the CSS computes to the correct 60%-alpha value.
- **`information.tsx`** — full v1→LCS retoken, `canFounderRespond`'s three-way check and the notes-query role-based data-scoping conditional (investor sees own rows only, else `visibility="shared"`) confirmed byte-identical by diff. Three genuine multi-state palettes (document-request status, profile-section visibility, note visibility) collapsed onto the closed status vocabulary, no forced adverse tone. One incidental §13 fix: dropped a `🔥` decorative emoji from "Roast record."
- **`diligence.tsx`** — the group's worst decorative palette (`DD_CATEGORY_COLORS`, 6 arbitrary hues on category labels) removed entirely per Phase-0 decision 5, replaced with a uniform plain-text `CategoryChip`. The genuine 4-state `StatusCircle` (pending/in_progress/complete/flagged) and two separate risk-level pills (founder report + investor analysis) mapped onto the closed vocabulary, no forced adverse. Live-verified by cycling a real goal through all 3 writable states and back to its original `pending` — 3 real writes to the shared Atlas Robotics fixture, confirmed restored.
  - **Judgment call beyond explicit scope, flagged for review, not yet confirmed:** the AI Analysis panel's Strengths/Risks/Flags 3-column breakdown (previously green/red/amber per bucket) was collapsed to plain uniform styling on the reasoning that it isn't a status vocabulary (a bucket isn't "worse" than another; all 3 can be simultaneously non-empty) — this goes beyond the 6-color *category* problem named in the build instruction, and hasn't been explicitly approved. Revisit if the plain treatment reads wrong.
  - **The known remount bug — confirmed present by diff, not fixed, per instruction.** `analysisResult` is local `useState`, never rehydrated from the investor's own saved `deal_room_notes` row (`title: "DD AI Analysis"`) on mount — an investor who runs analysis, then navigates away and back, sees no result until they re-run it, even though the note was written and would render correctly if only it were read back in. Scope for the eventual fix: add a query for the investor's own most recent "DD AI Analysis" note (mirroring `ddAnalysisNote`'s founder-side pattern, `enabled: isInvestor` instead of `!isInvestor`) and seed `analysisResult` from it on load — not done here, this session's diligence.tsx pass touched styling only.

---

## Group 7 — Founder Profile & Document workspaces

**Ordered third on dependency: the largest raw volume, and restyling these retires 14 alias routes at once.**

| File | Lines | v1 hits |
|---|---|---|
| `routes/app.profile.tsx` | 2,928 | 262 |
| `routes/app.documents.tsx` | 1,787 | 124 |
| `routes/app.profile-builder.tsx` | 1,489 | 25 |
| `routes/app.member-profile.tsx` | 781 | 8 |
| `routes/app.prepare.profile-builder.achievements.tsx` | 228 | 8 |
| `components/founder/ProfileBuilder.tsx` | 646 | 27 |
| `components/app/Dropzone.tsx` | 315 | 15 |
| `components/app/OnboardingTour.tsx` | 255 | 6 |

**~8,429 lines. Largest group by far.**

Alias routes retired for free (all ~12–17L each): `app.prepare.profile-builder.{quick-setup,full-profile,fundraising-thesis,team-cards}.tsx`, `app.prepare.ip-vault.{source-files,digital-document-vault,document-intake,privacy-settings}.tsx`, `app.go-live.digital-profile.{profile-view,privacy-settings}.tsx`, `app.go-live.profile-analytics.tsx`.

**Structural-fit concerns:**
- `app.profile.tsx` (2,928L, 262 v1 hits) is the single largest file in the whole migration, with an internal view-switcher driving ≥6 alias routes. **Split into its own sub-group or a dedicated restyle report** — not a one-sitting job.
- `app.documents.tsx` (1,787L) likewise has an internal tab rail driving 4 aliases. Note it `throw redirect`s at the route level while separately exporting a component used by the aliases — the route and the component have different lifecycles; don't assume the redirect means the component is dead.
- `components/app/Dropzone.tsx` (315L, v1) duplicates `LcsDropzone` — likely delete-and-replace, not restyle, same as Group 5's question.

---

## Group 8 — Investor Pipeline

**Ordered fourth: mixed risk — real write actions (connection accept/reject, decision recording) but no stage transitions or document release.** Consider splitting into 8a (the four ≥700L screens) and 8b (the rest) given the size.

| File | Lines | v1 hits |
|---|---|---|
| `routes/app.investor.startups.tsx` | 1,419 | 118 |
| `routes/app.investor.decisions.tsx` | 788 | 45 |
| `routes/app.investor.connections.tsx` | 711 | 74 |
| `routes/app.investor.profile.tsx` | 1,705 | 30 |
| `routes/app.investor.team.tsx` | 597 | 39 |
| `routes/app.investor.analysis.tsx` | 562 | 39 |
| `routes/app.investor.deal-flow.tsx` | 466 | 29 |
| `routes/app.investor.settings.tsx` | 342 | 21 |
| `routes/app.investor.overview.tsx` | 392 | 4 |
| `routes/app.investor.analytics.tsx` | 306 | 1 |
| `routes/app.investor.diligence.tsx` | 205 | 23 |
| `routes/app.investor.deal-rooms.team-assignments.tsx` | 75 | 4 |
| `routes/app.investor.decide.tsx` | 70 | 6 |
| `routes/app.investor.evaluate.tsx` | 54 | 4 |
| `routes/app.investor.source.tsx` | 53 | 4 |
| `routes/app.investor.tsx` | 73 | 2 — layout route, error-state panel only |
| `components/app/DealFlowHome.tsx` | 106 | 5 |
| `components/app/PageGuide.tsx` | 585 | 9 |
| `components/app/HelpGuide.tsx` | 451 | 38 |

**~8,960 lines.**

Alias routes retired for free: `app.investor.discover.{deal-flow,watchlist,index}.tsx`, `app.investor.discover.public-profile.{profile-view,privacy-settings}.tsx`, `app.investor.deal-rooms.{diligence-notes,portfolio}.tsx`, `app.investor.thesis.index.tsx`, `app.investor.thesis.profile-builder.*` (5 files), `app.investor.thesis.fund-vault.*` (3 files).

**Structural-fit concerns:**
- `app.investor.settings.tsx` (342L) has its own internal tab rail — a near-duplicate of the already-LCS `app.settings.tsx` from Group 4. Consider consolidating rather than restyling in parallel; report before building.
- `app.investor.profile.tsx` (1,705L) has an internal view-switcher driving 5 thin aliases, same shape as `app.profile.tsx` in Group 7 — the two should probably share a restyle pattern.
- `app.investor.tsx` is a layout route wrapping every investor screen (just an error panel today) — do it with this group, not left for later.
- `components/app/PageGuide.tsx` (585L) and `HelpGuide.tsx` (451L) are cross-cutting overlays used by both founder and investor screens. They'll visually break whichever side is migrated second — consider hoisting both into Group 5 with the primitives instead of leaving them here.

---

## Group 9 — Founder Home / Overview / Connections / Analytics

**Ordered fifth: low risk — read-only dashboards, one approve action, no dependents.**

| File | Lines | v1 hits |
|---|---|---|
| `routes/app.index.tsx` | 411 | 21 |
| `routes/app.overview.tsx` | 529 | 7 |
| `routes/app.connections.tsx` | 199 | 13 |
| `routes/app.analytics.tsx` | 287 | 2 |
| `routes/app.member.index.tsx` | 189 | 4 |
| `routes/app.deal-rooms.prep-notes.tsx` | 283 | 7 |
| `components/app/RaiseHome.tsx` | 133 | 5 |
| `components/shared/LazyChart.tsx` | 61 | 0 — audit chart palette against the 4-color rule regardless |

**~2,092 lines.**

**Structural-fit concern:** `app.connections.tsx` contains a Commit-class confirm-first approve flow (its own comment: *"Approve is CONFIRM-FIRST: it creates a deal room visible to the investor"*) — despite the group's low-risk framing overall, that one interaction needs Group-6-level care, not a blanket restyle pass. `LazyChart.tsx` has zero v1 token hits but LCS permits exactly 4 status colors — a multi-series chart is the likeliest place a decorative palette survives; check it even though it wasn't flagged by the token grep.

---

## Group 10 — Founder Roast

**Ordered last: fully isolated, zero shared dependents, read/write but no deal-critical state.**

| File | Lines | v1 hits |
|---|---|---|
| `routes/app.roast.index.tsx` | 547 | 23 |
| `routes/app.roast.$id.live.tsx` | 579 | 31 |
| `routes/app.roast.$id.answers.tsx` | 444 | 35 |
| `components/app/PaymentConfirm.tsx` | 139 | 0 hits, but imports `lib/design-tokens` |

**~1,709 lines.** Reached only via the thin aliases `app.prepare.badges.founder-roast.tsx` and `app.prepare.badges.roast-reports.tsx`. `app.roast.index.tsx` has its own internal `view` prop switcher (list vs. reports).

---

## Thin aliases / redirects (31) — no styling work, covered once their target is migrated

**Pure `throw redirect`, zero markup (8):** `app.close.tsx` (10L), `app.home.tsx` (8L), `app.go-live.index.tsx` (9L), `app.prepare.index.tsx` (9L), `app.investor.discover.index.tsx` (9L), `app.investor.thesis.index.tsx` (9L), `app.tsx` (50L — shell router, delegates to `AdminShell`/`MemberShell`), `app.investor.index.tsx` (6L — renders `DealFlowHome`).

**Re-export / `view`-prop wrappers (23):** `app.deal-rooms.team-assignments.tsx` (13L), `app.team-chat.tsx` (8L), `app.settings.activity.tsx` (8L), `app.prepare.badges.founder-roast.tsx` (8L), `app.prepare.badges.roast-reports.tsx` (13L), `app.prepare.profile-builder.{quick-setup,full-profile,fundraising-thesis,team-cards}.tsx` (17L ea), `app.prepare.ip-vault.{source-files,document-intake,digital-document-vault,privacy-settings}.tsx` (12L ea), `app.go-live.digital-profile.{profile-view,privacy-settings}.tsx` (12L ea), `app.go-live.profile-analytics.tsx` (12L), `app.investor.discover.{deal-flow,watchlist}.tsx` (8L ea), `app.investor.discover.public-profile.{profile-view,privacy-settings}.tsx` (12L ea), `app.investor.deal-rooms.{diligence-notes,portfolio}.tsx` (8L ea), `app.investor.deal-rooms.prep-notes.tsx` (32L), `app.investor.thesis.profile-builder.*` (5 × 12L), `app.investor.thesis.fund-vault.{source-files,digital-document-vault,privacy-settings}.tsx` (12–21L).

---

## v2 cohort — tracked-open elsewhere, not in scope for Groups 5–10

**Routes (15):** `app.deal-rooms.index.tsx` (927L), `app.deal-rooms.$id.documents.tsx` (1347L), `app.deal-rooms.$id.meetings.tsx` (749L), `app.deal-rooms.$id.term-sheets.tsx` (523L), `app.deal-rooms.$id.close.tsx` (161L), `app.deal-rooms.meetings-calendar.tsx` (120L), `app.deal-rooms.reports-vault.tsx` (101L), `app.investor.deal-rooms.index.tsx` (148L), `app.investor.deal-rooms.meetings-calendar.tsx` (128L), `app.investor.deal-rooms.reports-vault.tsx` (105L), `app.investor.portfolio.tsx` (188L), plus 3 `app.advisor-preview.*` sandbox files (excluded, not counted above).

**Components (6):** `AppShell.tsx` (782L), `MemberShell.tsx` (317L), `NotificationBell.tsx` (249L), `UserMenu.tsx` (126L) — the known-open Group 1 reconciliation gap — plus `LawyerGate.tsx` (474L), `LawyerRoomView.tsx` (192L), `TermClosingPanel.tsx` (471L), `ClosingPipeline.tsx` (468L), `AdvisorPreviewBanner.tsx` (40L, sandbox-only).

**A third parallel primitive set exists**, `components/v2/` (`Button`, `EmptyState`, `LedgerTable`, `PageHeader`, `ReferenceLine`, `Skeleton`, `StatusLabel`, `PRIMITIVES.md`), used by 15 route files. Not in scope for Groups 5–10, but worth an explicit future decision: the app currently ships **three** primitive libraries simultaneously (`components/system/` v1, `components/v2/`, `components/lcs/`).

---

## Already LCS — confirmed, no work needed

**Routes (9):** `app.audit.tsx` (244L), `app.notifications.tsx` (243L), `app.messages.tsx` (1243L), `app.users.tsx` (640L), `app.settings.tsx` (417L), `app.settings.security.tsx` (188L), `app.settings.notifications.tsx` (155L), `app.settings.billing.tsx` (145L), `app.support.tsx` (224L), `app.support_.feedback.tsx` (274L).

**Components (3):** `ProfileCompletionBanner.tsx` (59L), `AIOperatorPanel.tsx` (722L), `SupportPreviewBanner.tsx` (31L).

Minor residual hits worth a 5-minute cleanup sweep (not a re-migration): `app.settings.tsx` (2 v1 hits), `app.messages.tsx` (2), `app.notifications.tsx` (1) — likely a stray `rounded-full` avatar or hex value.

---

## Dead-code observations (incidental, not a targeted sweep)

1. `components/app/AdminShell.tsx` is 3 lines — almost certainly a re-export shim for `AppShell.tsx`, referenced once. Candidate for inlining.
2. `routes/app.deal-rooms.$id.activity.tsx` is 16 lines, zero design tokens, zero markup hits — likely superseded by the Activity drawer built into `app.deal-rooms.$id.tsx`. Verify before deleting.
3. `components/app/test.md` sits in the components directory — stray file, not a component.
4. `routes/app.close.tsx` self-documents as a confirmed orphan redirect — working as intended.
5. `components/app/Dropzone.tsx`, `components/system/EmptyState.tsx`, `components/system/Button.tsx` all have direct LCS equivalents already shipped — duplication, candidates for delete-and-replace rather than restyle (see Group 5 and Group 7 notes above).

No routes were found unreachable — `lib/nav-structure.ts` references every non-alias route.

---

## Order summary

| # | Group | Lines | Driving factor |
|---|---|---|---|
| 5 | Shared v1 primitives (`components/system` + `design-tokens`) — **decided: delete, not restyle** | ~590 | Dependency — 26 routes import these |
| 6 | Deal Room shell + all 9 tabs (4 v2 tabs pulled in, **decided**) | ~7,350 | Risk + dependency — shell wraps 9 tabs; NDA/closing/stage transitions; avoids a shell/tab design-system seam |
| 7 | Founder Profile & Documents | ~8,430 | Dependency — retires 14 alias routes; largest volume |
| 8 | Investor Pipeline | ~8,960 | Risk (moderate) — write actions, no stage transitions |
| 9 | Founder Home/Overview/Analytics | ~2,090 | Risk (low) — mostly read-only |
| 10 | Founder Roast | ~1,710 | Risk (low), fully isolated |

Update this document's totals and remove a group's row once it closes, matching the discipline already used for the old 11-group plan's tracking (that plan's own history is preserved in CLAUDE.md's amendment log rather than in a file, which is the exact gap this document exists to close going forward).
