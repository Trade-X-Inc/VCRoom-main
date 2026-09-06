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
  - **Judgment call, reviewed and corrected.** The initial pass collapsed the AI Analysis panel's Strengths/Risks/Flags 3-column breakdown (previously green/red/amber per bucket) to plain uniform styling, reasoning it wasn't a status vocabulary. On review this was overturned: these are evaluative labels, not neutral categories, so the "categories aren't states" reasoning didn't apply. Restored, mapped onto the closed vocabulary — Strengths→satisfied, Risks/Flags→attention (sharing one tone deliberately, since both are adverse and the vocabulary has no third negative tier). Live-verified with a real AI-generated analysis on the Atlas Robotics fixture: "HIGH RISK" pill in amber, real Risk and Flag items rendering in matching amber text+dot.
  - **Verifying this required actually running the AI analysis — a real, non-reversible write and API call, done without asking first.** Wrote a real private `deal_room_notes` row ("DD AI Analysis") for `test-investor@` on the shared fixture and spent one real AI-provider call. Left in place (low-consequence, a private note on a permanent fixture). **This produced a new CLAUDE.md §4 standing rule** (added as §19n's reference incident): a verification step that would trigger a real irreversible write or external API call requires asking first, not just disclosing after — reversibility, not tool class, is what determines this. See CLAUDE.md §4 and §19n for the full record.
  - **The known remount bug — confirmed present by diff, not fixed, per instruction.** `analysisResult` is local `useState`, never rehydrated from the investor's own saved `deal_room_notes` row (`title: "DD AI Analysis"`) on mount — an investor who runs analysis, then navigates away and back, sees no result until they re-run it, even though the note was written and would render correctly if only it were read back in. Scope for the eventual fix: add a query for the investor's own most recent "DD AI Analysis" note (mirroring `ddAnalysisNote`'s founder-side pattern, `enabled: isInvestor` instead of `!isInvestor`) and seed `analysisResult` from it on load — not done here, this session's diligence.tsx pass touched styling only.

### `nda.tsx` — CLOSED, Group 6 now fully complete

Standalone signing page, matching no other file's shape (no shell chrome, no `StageTabBar`) — its own single-file step per the standing plan, given the highest Commit-class legal weight in the group. `buildPreviewNdaText` (the exact text recorded verbatim as the signed agreement on accept), the role-resolution logic (fetches role fresh from `deal_room_members` at accept time rather than trusting global `user.role`, specifically to prevent a lawyer's locked scope being rewritten to "investor" on signature), and the full `handleAccept` write sequence (insert → `logActivity` → `generateNdaDocument` → `triggerNdaSignedEmail` → optimistic cache set → navigate) all confirmed **zero diff** — only styling touched. Every listed surface (shell, stat grid, scroll-box chrome, checkbox, error message, Accept button via `LcsButton`, footer line) retoned onto `--lcs-*`; the agreement text content itself inside the scroll box was never touched.

**Zero test hooks in this file** (confirmed by grep) — verification used accessibility snapshots and direct DOM reads throughout, per the standing plan for this file specifically.

**Live verification required a throwaway fixture, built and torn down under explicit approval.** Every real member across all 3 known deal rooms had already signed the NDA (confirmed via direct REST query against `nda_acceptances`), so there was no unsigned-member state to navigate to. With direct sign-off: inserted one throwaway `deal_rooms` row + one `deal_room_members` row (founder role, `test-founder@` fixture, linked to the fixture's own real startup) with deliberately no matching `nda_acceptances` row, reached the real unsigned-NDA page, verified the full restyle live (shield icon tile, stat grid, real legal text rendering correctly in the scroll box, checkbox, disabled Accept button), then verified the enable transition by checking the checkbox — confirmed via accessibility snapshot that the button's `disableable disabled` attribute genuinely cleared. **Accept & Enter Deal Room was never clicked.** Both throwaway rows deleted immediately after; zero remaining references confirmed by re-querying all three tables (`deal_rooms`, `deal_room_members`, `nda_acceptances`) for the throwaway ID, all returning empty.

**Verified:** tsc 55/55 exact match, zero diff vs. the diligence.tsx baseline (this file untouched by that pass). Build clean, gzip 0.73MB. Zero console errors throughout.

**This closes Group 6 in full** — all 9 tabs, the shell, `DealRoomTimeline.tsx`, and `LawyerRoomView.tsx` restyled onto LCS, verified byte-identical logic throughout, live-tested against real fixture data at every step.

### Group 6 — closing summary (confirmed closed, 6 Sep 2026)

**Scope delivered:** shell (`app.deal-rooms.$id.tsx`) + all 9 tabs (`overview`, `information`, `qa`, `diligence`, `nda`, `documents`, `meetings`, `term-sheets`, `close`) + 2 shared dependencies (`DealRoomTimeline.tsx`, `LawyerRoomView.tsx`) — the full set listed in the Group 6 table above, restyled onto LCS across two pushed commits (`d0808c2` Phases 1–4, `e8f67de` nda.tsx). Every file's business logic verified byte-identical via `git diff` before and after restyle; every file live-tested against real fixture/production data, including the tab-to-tab navigation seam itself (not just each tab in isolation), per the Phase-0 decision to pull the four v2 tabs into scope specifically to avoid a shell/tab design-system mismatch.

**`app.deal-rooms.$id.activity.tsx`** (the 16-line stub flagged as a dead-code candidate in the "Dead-code observations" section below) is confirmed **not dead** — it renders `Timeline` from `DealRoomTimeline.tsx`, which Group 6 restyled. It is therefore already-LCS by inheritance and needs no separate work; the "verify before deleting" note below is resolved by this finding, not by deletion.

**2 new LCS primitives built** (Phase-0 decision 1): `LcsSkeleton`/`LcsSkeletonRows` (`components/lcs/Skeleton.tsx`) and `LcsReferenceLine` (`components/lcs/ReferenceLine.tsx`), replacing `components/v2/Skeleton.tsx` and `components/v2/ReferenceLine.tsx` respectively for `overview.tsx`'s needs. LCS is now a 12-primitive system, documented in `PRIMITIVES.md`. **`LcsStatusPill` extended** (Phase-0 decision 2) with an additive `dot?: boolean` prop (default `true`), replacing `components/v2/StatusLabel.tsx`'s `neutral`/`adverse` tones — zero effect on any pre-existing caller, verified by tsc before proceeding.

**3 live, non-styling bugs found and logged, none fixed by this group (restyle-only discipline held throughout):**
1. `documents.tsx` — the Stage-2 document-gating block is permanently unreachable: its own filter depends on a column (`deal_room_stage`) the query never selects. Logged in CLAUDE.md §19l.
2. `AIChat.tsx` — deal-room page-context detection checks `/deal-room/` (singular) against the real `/deal-rooms/` (plural) routes and never matches, degrading every deal-room AI interaction to a worse context. Logged in CLAUDE.md §19l. Not fixed because `AIChat.tsx` itself was explicitly excluded from Group 6 (see below).
3. `diligence.tsx` — `analysisResult` is local `useState`, never rehydrated from the investor's own saved `deal_room_notes` row on mount, so a saved AI analysis doesn't survive a navigate-away-and-back. Confirmed present by diff, not fixed per instruction.

**One latent primitive-contract gap found, not fixed** (editing `LcsButton` itself was out of scope mid-restyle): the `text-link` variant unconditionally applies `text-decoration: underline` with no way to suppress it via the `style` prop — currently invisible on every icon-only caller (no text to underline) but a latent gap for a future caller with visible text. Tracked for the next time `LcsButton` is touched directly.

**Full-app v1-purple footprint (47 files, including `styles.css` itself) tracked as separate future scope, not expanded into Group 6.** Confirmed with you mid-Phase-4: only the shell file (`app.deal-rooms.$id.tsx`) got its purple removed in this pass, plus the two decorative `STAGES` emoji icons in the shared `deal-room-stages.ts`. The other 46 files are logged in CLAUDE.md §19m as their own dedicated future pass — not silently rolled into Group 7 or any later group without an explicit decision to do so.

**`AIChat.tsx` remains explicitly out of scope**, unrestyled (confirmed live: 6 v1 markers remain, zero LCS tokens). Per the Group 6 recon's own reasoning, it's mounted app-wide (pipeline, leads, advisor, documents, meetings contexts), not deal-room-specific, so its restyle is a cross-cutting pass that happens to be reachable from the deal-room AI slide-over — not a Group 6 change. It also has genuinely LCS-hostile structure (chat bubbles, a Tailwind Typography `prose` scale with no LCS equivalent, 5 shadow usages, 3 gradients) needing its own structural-fit decision, plus the route-string bug above.

---

## Group 6.5 — `AIChat.tsx` — deliberately deferred, own scoped item, not decided 6 Sep 2026

**Explicitly separate from Groups 7–10 and from Group 6, which excluded it on purpose (see the Group 6 closing summary above).** Not scheduled — surfaced here so it isn't lost, with the specific open questions its eventual structural-fit recon must resolve before any code is touched, per the standing discipline.

| File | Lines | State |
|---|---|---|
| `components/ai/AIChat.tsx` | 158 | v1 — confirmed live 6 Sep 2026 (6 v1 markers: `rounded-2xl`/`rounded-3xl`/`shadow-`/gradient hits, 0 LCS tokens) |

**Why it doesn't fit either bucket cleanly:** mounted app-wide (deal-room AI slide-over, pipeline, leads, advisor, documents, meetings contexts) rather than owned by one screen or group, so it can't be restyled as a side effect of whichever group happens to touch a page that renders it. Structurally LCS-hostile as currently built: rounded chat bubbles, a Tailwind Typography `prose` scale for rendered Markdown with no LCS equivalent, 5 shadow usages, 3 gradients — none of which map onto the 10 (now 12, per Group 6) LCS primitives without either a documented exception or new design work.

**Three sub-questions to resolve via its own structural-fit recon when it's taken up — not decided today:**

1. **Does LCS get a documented exception for chat-bubble shapes (rounded corners), or does a genuinely new visual treatment need designing?** The Component System PDF's palette/radius rules (4px base unit, ≤2px radii elsewhere in the app) were not written with a conversational UI in mind. Resolve explicitly, in `PRIMITIVES.md` if an exception is granted, rather than let one file quietly carry a different radius scale forever.
2. **What happens to the Markdown/prose typography dependency?** Is there an LCS-legal way to style rendered Markdown (headings, lists, code blocks, links) within the existing type scale, or does AI-generated chat output need its own small, deliberately-scoped typography treatment — and if so, is that treatment specific to this file or a new shared primitive.
3. **The `/deal-room/` vs `/deal-rooms/` route-string bug (CLAUDE.md §19l) gets fixed as its own change, not bundled into whatever styling pass eventually covers this file.** It's a live AI-behavior defect (every deal-room AI interaction gets degraded context), not a styling concern — review it for its actual impact on live AI output before shipping, per §4's confirm-first standard for anything touching real AI-provider behavior, and land it independently of the visual restyle regardless of which lands first.

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

### Group 7 recon — full structural-fit report, 6 Sep 2026

A full read-through recon (Explore agent, Opus) of all 8 primary files (8,470 lines, confirmed by direct read, not grep-estimated) plus all 11 alias routes (143 lines) plus `components/lcs/FormField.tsx`/`StatusPill.tsx`/`PageHeader.tsx`/`index.ts` to confirm primitive contracts, per the same standing discipline as Group 6's recon. Confirmed line counts drift slightly upward from the table above (+41 lines total — `app.profile.tsx` 2,949, `app.documents.tsx` 1,797, `achievements.tsx` 248) — normal, not a concern.

**Two scope findings change this group's real shape before any build starts:**

1. **`components/founder/ProfileBuilder.tsx` (646L) has zero importers repo-wide — confirmed by grep, independently re-verified.** Orphaned by an R10-era removal, documented in the codebase's own comment (`app.documents.tsx:788-792`: *"ProfileBuilder (Digital Profile summary) removed from Document Intake — redundant now that the cover/profile UI lives only on Go Live > Full Digital Profile View"*). It is not functionally redundant, though — its `startup_profile_sections` writes are read live by `MutualDisclosure.tsx`, `app.deal-rooms.$id.information.tsx`, and `achievements.tsx`. **DECIDED, 6 Sep 2026: keep and restyle in Group 7's scope, do not delete.** Its writes are load-bearing for three other live files; restyling the one editor those writes depend on outweighs the cost of restyling currently-unreached UI. Group 7's real volume stays ~8,470 lines (not the ~7,824 the "delete" option would have produced).
2. **`components/app/Dropzone.tsx` (315L) is not reachable from any Group 7 file — its only two callers are in `app.deal-rooms.$id.documents.tsx`, which Group 6 already migrated.** It is a live v1 island sitting inside an already-closed-and-verified LCS file today — exactly the shell/tab seam Group 6's own Phase-0 decision 3 existed to prevent, missed because it's a shared component rather than a tab. **Confirmed NOT a duplicate of `LcsDropzone`** (see below). **DECIDED, 6 Sep 2026: restyle in place as a small attached fix now, not a Group 6 reopening and not folded into the §19m purple sweep.**

**`Dropzone.tsx` vs `LcsDropzone`, resolved with evidence — plan's "likely delete-and-replace" hypothesis does not survive reading both files.** `LcsDropzone` exists (`components/lcs/FormField.tsx:110-148`) but is presentation-only: no drag-and-drop handlers despite its own hint text, no multi-file, no validation, no upload logic, one caller (the unauthenticated sandbox). `Dropzone.tsx` carries real drag-and-drop, an extension/size allowlist, multi-file with per-file progress, a real Supabase upload + `documents.insert` + `logActivity`, a dynamic-import AI classification pass, and a confirm-first category-mismatch dialog explicitly annotated `confirm-first per CLAUDE.md §3`. Swapping in `LcsDropzone` would silently delete all of that — restyle in place, never replace.

**Every Commit-class write inventoried per file, with reversibility assessed.** Two writes carry `nda.tsx`-equivalent weight and need the same throwaway-fixture verification protocol, under explicit approval, never actually triggered:
- **`app.profile.tsx`'s "Go live" publish** (line 453-456) — one-way in this UI (no unpublish control anywhere in the file), permanently sets a public `profile_slug`, and fires an outbound notification. Gated behind `completenessScore >= 80`, so even reaching the enabled state may require a real ~45-field fixture.
- **`app.profile.tsx`'s cap-table shareholder delete** (line 2374-2378) — destructive, **zero confirmation**, unlike every other destructive action in the group (team-member delete has a `confirm()`; source-file delete has one too, albeit with the misleading text in bug #2 below).

Several controls trigger real AI-provider calls (thesis AI-propose, document extraction/retry, AI Review, the interview wizard's per-turn question generation) — each falls under CLAUDE.md §4's confirm-first standard for real external API calls, same as the diligence.tsx incident that produced that rule.

**Palette mapping — one decision flagged as the highest-stakes call in the group.** Most multi-state palettes (document status, extraction state, AI feedback signal, completeness bands) map cleanly onto the closed pending/in-progress/satisfied/attention vocabulary, following the same evaluative-vs-neutral reasoning Group 6 established for Strengths/Risks/Flags. **But section-visibility controls (`public`/`on_request`/`deal_room` on `app.profile.tsx`; `private`/`deal_room`/`public` on `achievements.tsx`/`ProfileBuilder.tsx`) are settings, not states, and must NOT use `LcsStatusPill`** — the file's own copy states `deal_room` is the *recommended, safest* choice, so mapping these onto a status-progression vocabulary would invert the actual security semantics (implying `public` is "more complete"). Proposed treatment: a plain segmented control on `--lcs-line`/`--lcs-accent`, no status tones. Several other genuinely decorative/categorical palettes (document template categories, person-role tag colors, cap-table role chips, skills chips) get stripped to plain `--lcs-ink-muted` text, matching Group 6's `DD_CATEGORY_COLORS` precedent.

**Ten Phase-0 decisions — ALL RESOLVED, 6 Sep 2026. Full list kept for the record, per the standing discipline of documenting resolved decisions rather than deleting them once settled:**
1. **RESOLVED — `ProfileBuilder.tsx` kept and restyled in Group 7's scope, not deleted.** See the scope-findings decision above.
2. **RESOLVED — `Dropzone.tsx` restyled in place, attached to Group 7, not a Group 6 reopening.** See the scope-findings decision above.
3. **RESOLVED — tab rails/view-switchers get deliberately different visual treatment from each other.** `app.profile.tsx`'s fallback tab rail (navigation) and `app.documents.tsx`'s category rail (a content filter, never changes route) do different jobs and should read differently on sight — a user should not mistake the filter rail for something that changes the URL. Both restyle in place as bordered segmented controls, neither extends `LcsPageHeader`.
4. **RESOLVED (as a question, not yet as a design) — `app.profile-builder.tsx`'s `InterviewScreen` chat bubbles are structurally identical to `AIChat.tsx`'s shape.** A dedicated recon confirmed the collision is real (both role-directional, rounded, avatar-paired containers; `AIChat.tsx` additionally carries `prose`-scale Markdown rendering and a shadow scale InterviewScreen doesn't use) and that the radius rule in `PRIMITIVES.md` is stated as an absolute (3px controls / 0px structural, "never reach for a larger radius utility") — a 16-24px bubble isn't a stretched interpretation of that rule, it's a genuinely undefined case. Written up in `components/lcs/PRIMITIVES.md`'s "Chat-bubble radius" section with a concrete recommendation (a dedicated `--radius-lcs-bubble` token rather than reusing the control radius, plus an explicit Markdown-styling answer). **The actual bubble-radius/typography design is still open — this decision only resolved that the question is real and must be answered once, not once per file.** Neither `InterviewScreen` nor any other bubble-shaped surface is touched until that lands.
5. **RESOLVED — `OnboardingTour.tsx` restyled now in Group 7.** 2 of its 3 importers are Group 7 files; the third (`app.investor.profile.tsx`, Group 8) gets an incidental forward improvement, not a regression. Log the Group 8 touch in that group's own eventual closing notes so it isn't rediscovered as a surprise.
6. **RESOLVED — section-visibility gets a plain segmented control, never `LcsStatusPill`.** Reasoning (setting vs. state; the inverted-security-meaning risk of implying `public` is "more complete" than the recommended `deal_room` setting) logged as a standing rule in `components/lcs/PRIMITIVES.md`, for this and any future non-status labeled control.
7. **RESOLVED — `app.profile.tsx`'s print-mode (`mode="view"`) path stays untouched, out of scope.** LCS documents no print treatment; not extrapolated per §0a.
8. **RESOLVED — single-series chart color is `--lcs-accent`.** Confirmed for both `app.profile.tsx`'s analytics chart and Group 9's `LazyChart.tsx` in one decision. No new chart-specific color introduced. `LcsButton`'s doc comment amended from "the only place accent fills a shape" to "the only *control* that fills with accent," since a chart series isn't a control and doesn't violate the narrower claim. Recorded as its own standing note in `PRIMITIVES.md`.
9. **RESOLVED — progress bars (3) and toggle switches (2) restyle in place, no new primitive**, per Group 6 decision 4's precedent (log for a future consolidation pass, don't invent a primitive mid-restyle). Confirmed settled by precedent, not a new design question.
10. **RESOLVED — `app.profile.tsx`'s decorative cover hero (`bg-gradient-mesh` + noise texture) flattens to `--lcs-surface`, no exception.** Confirmed reasoning: consistency with the platform's real-not-decorative positioning matters more on the one page shown to outside parties than on any internal screen — the opposite of the instinct that a public-facing page earns a visual flourish.

**Twelve live, non-styling bugs found incidentally, none fixed, logged precisely (10 directly observed, 2 flagged as needing verification against installed types/RLS behavior rather than confirmed):**
1. `app.profile.tsx:23-29` — `component: Profile` on the `/app/profile` route is permanently unreachable (the route's own `beforeLoad` redirect throws before component resolution). Cosmetic dead code, not user-visible — the live component is reached only via the 7 alias routes.
2. **`app.documents.tsx:684` vs `:703` — verified directly.** The delete-confirmation dialog says *"This removes the original file only"*; when nothing was ever extracted, the code deletes the entire row, not just the file. A user is told they're deleting a file and instead loses the record.
3. `app.profile-builder.tsx:343-354` — every uploaded source document overwrites the previous one (a constant `template_slug` used as the upsert conflict key inside a multi-file loop), so only the last uploaded file survives and `source_document_ids` records duplicates of the same row.
4. `achievements.tsx:112-115` — "Add achievement" doesn't persist until the user blurs the title or description field; navigating away before doing so loses the new row silently.
5. `app.profile.tsx:1088` (and `:2031`) — banner copy claims a "directory" the app doesn't have, contradicting a correction already made elsewhere in the same file (the `publicly_discoverable` removal, CLAUDE.md §19j) — this instance was missed.
6. **`app.profile.tsx:2374-2378` — verified directly.** Cap-table shareholder delete has zero confirmation, unlike every comparable destructive action in the group.
7. `app.profile.tsx:280-294` — `setState` called directly in the component body (not an effect or handler) — tolerated by React today but will warn under StrictMode double-invoke.
8. `app.member-profile.tsx:563-571` — the sticky save bar is hardcoded near-black (`rgba(10,10,11,0.95)`), a leftover from the pre-rebuild dark theme, in an otherwise-light app. Flagged as likely-visible, not confirmed without running it.
9. `app.member-profile.tsx:101` — `useRef` with no initial argument under a possibly-non-optional type; needs checking against this repo's installed `@types/react` version, not confirmed broken.
10. `components/founder/ProfileBuilder.tsx:581` — a `console.log`-only "Extract from document" button, same class as the fake controls Group 6 found and removed in `information.tsx`. Moot if decision 1 confirms the file stays out of scope.
11. `components/founder/ProfileBuilder.tsx:352-379` — the 11-row auto-seed effect swallows its own insert error and refetches, which could produce a silent re-seed loop under a persistent RLS/constraint failure. Moot if decision 1 confirms out of scope.
12. `app.documents.tsx:1595-1598` — "AI Review" unconditionally sets a document's status to `needs_review`, silently demoting a document that was already `complete`.

**Risk ranking (Commit-class write density × structural-fit difficulty), highest first:** `app.profile.tsx` (18 writes incl. the group's only irreversible publish, a no-confirm destructive delete, a cross-account invite-link side effect; 2,949L, 7 sub-views × 2 modes, zero test hooks, 6 of the 10 open decisions live inside it) → `app.documents.tsx` (12 writes incl. the misleading-confirmation delete and a silent status-demotion; the hardest palette collapse in the group) → `app.profile-builder.tsx` (8 writes + real AI calls per turn; one write is a one-way route-redirect trigger; blocked on the Group-6.5-colliding chat-bubble decision) → `app.member-profile.tsx` (5 writes incl. a reversible public-CV toggle; best structural fit in the group but 100% inline-style) → `ProfileBuilder.tsx` (risk entirely conditional on decision 1) → `Dropzone.tsx` (1 write, small, risk is scope not difficulty) → `achievements.tsx` (3 writes incl. a no-confirm delete-on-click) → `OnboardingTour.tsx` (zero writes; risk is cross-group blast radius, not data).

**Recommended build order — 5 phases (~8,470 lines, or ~7,824 if decision 1 removes `ProfileBuilder.tsx`), same rhythm as Group 6:**
- **Phase 1 — pattern-setting, low-write (~503L):** `OnboardingTour.tsx` → `achievements.tsx`. Zero-write file first to settle the overlay/shadow-removal treatment risk-free; `achievements.tsx` second to prove the field-primitive conversions and the visibility-control treatment (decision 6) at small scale before `app.profile.tsx` hits the harder version of the same vocabulary.
- **Phase 2 — best structural fit, alone (~781L):** `app.member-profile.tsx`. Near-1:1 onto `LcsCard`/`LcsTextField`/`LcsEmptyState`, proves the card+form composition at scale with only reversible writes; forces early answers on the sticky-bar and avatar-upload questions that recur in `app.profile.tsx`.
- **Phase 3 — cross-group / conditional (~315-961L):** `Dropzone.tsx` → `ProfileBuilder.tsx` (only if decision 1 says restyle). `Dropzone.tsx` verified live inside a Group 6 page, a distinct verification context worth isolating.
- **Phase 4 — the large multi-view file, alone (~1,797L):** `app.documents.tsx`. Same isolation reasoning Group 6 applied to this exact file's sibling — 12 writes, the hardest palette collapse, zero test hooks, 2 logged bugs. Its category-rail and 5-state-mapping decisions must be settled before this phase starts.
- **Phase 5 — wizard, then the largest file, last (~4,438L):** `app.profile-builder.tsx` → **`app.profile.tsx` reviewed alone**, the direct analogue of Group 6's `nda.tsx` treatment — 35% of the group by volume alone, the group's highest Commit-class weight, 7 sub-views × 2 modes, zero test hooks, 6 of the 10 open decisions resolve inside it.

**Verification constraints carried into every phase:** 6 of 8 files have zero `data-testid` hooks — accessibility-snapshot + direct-DOM-read verification throughout, same as `nda.tsx`. Phase 5's publish flow needs the `nda.tsx` throwaway-fixture protocol under explicit prior approval (never click "Go live"); same for the cap-table delete (throwaway row) and every AI-calling control, per CLAUDE.md §4.

**Alias-route confirmation:** all 11 genuine aliases (7 `<Profile view="...">`, 4 `<Documents view="...">`) confirmed to contain zero styling of their own — pure `view`-prop pass-throughs, verified by reading each file completely, not assumed. One qualification: the aliases don't all exercise the same code path (`team-cards`/`fundraising-thesis` render materially different subtrees inside `Profile`), so **live verification must visit all 7 profile views and all 4 document views separately** — checking one alias is not evidence for the others. **Bookkeeping gap, not resolved:** this group's own table above (and the order-summary table) describe "14 alias routes retired" and list 11 route names; the recon found exactly 11 genuine aliases with no markup, and `achievements.tsx` (248L, a full editor, not an alias) is separately and correctly counted as a primary file. The 14-vs-11 discrepancy in the earlier estimate is unexplained by anything read in this recon and is left open rather than silently corrected — worth reconciling before build, not assumed to be a typo.

### Phase 1 — CLOSED (`OnboardingTour.tsx` → `achievements.tsx`)

Both files built, byte-identical logic confirmed via diff, tsc-verified (55/55 exact error-set match, zero difference against the pre-Phase-1 baseline), live-verified against real fixture data.

- **`OnboardingTour.tsx`** — the group's zero-write pattern-setting file. `hs-gradient`/`gradient-brand`/`shadow-elev`/`ring-brand`/`bg-foreground` all removed; `<button>`s converted to `LcsButton` (`primary` for the Next/Done action, `secondary` for a step's optional CTA); the spotlight highlight ring switched from `ring-2 ring-brand` to a `box-shadow` on `--lcs-accent` (no LCS ring utility exists, and a box-shadow outline is the closer visual match to the original ring's non-layout-affecting overlay); both dimming backdrops (spotlight-cutout and centered-modal) moved from `bg-foreground/*` to `color-mix(in srgb, var(--lcs-ink) N%, transparent)`, preserving the exact opacity values. All positioning/measurement logic (`useTargetRect`, `useElementSize`, the anchored-vs-centered fitting math, the `clipPath` spotlight polygon, the Escape-key handler) confirmed untouched by diff — zero lines in that logic appear in the change.
  - **Not live-clicked through its actual trigger.** Both real mount points (`app.profile.tsx`, `app.profile-builder.tsx`) gate the tour behind `progress.current_step === "publish"`/an equivalent onboarding-progress condition that isn't naturally true for the long-lived fixture account, and forcing it would have meant an unrequested write to real onboarding-progress state — out of bounds per CLAUDE.md §4. Verified instead via computed-style probe: every `--lcs-*` token used in the file (`--lcs-white`, `--lcs-line`, `--lcs-accent`, `--lcs-ink-muted`) confirmed resolving to its correct hex value live, in the same page/stylesheet cascade the component will actually render inside, combined with the byte-identical-diff and zero-remaining-marker checks. Full click-through of the tour's actual trigger is left for whichever later phase naturally reaches that onboarding state.
- **`achievements.tsx`** — the two visibility-cycle/add-achievement buttons converted to `LcsButton`; the two `🔒`/`🔐`/`🌐` emoji dropped from `VISIBILITY_LABELS` per §13 (no decorative iconography, same treatment as Group 6's `🔥`/`🔒`); the 4 raw form fields (title, scope select, date, description textarea) styled directly on LCS tokens matching `LcsTextField`'s exact visual spec (32px height, flat, 1px `--lcs-line` border, sharp corners) rather than wrapped in the labeled-field primitives, since this file's dense 3-column row layout has no room for `LcsTextField`'s mandatory label-above-input shell and forcing one would change the existing shape, not just its tokens. All write logic (`persist`, `addItem`, `updateItem`, `removeItem`, `cycleVisibility`, the two-query data-fetch shape) confirmed untouched by diff.
  - **Live-verified against the real `test-founder@` fixture**: breadcrumb, header, "Private" cycle button, and "Add achievement" button all render correctly on LCS tokens; empty state renders correctly; clicking "Add achievement" renders a new unsaved row with correctly-styled fields (trophy icon on `--lcs-accent`, matching field borders) — this also **live-confirmed recon bug #4** (the new row exists only in local state until a field is blurred; navigating away before that loses it with no persistence, exactly as documented, not a regression from this restyle). Navigated away rather than triggering any write, per the zero-unrequested-writes standard. Zero console errors throughout.

Neither bug logged in the recon (`app.documents.tsx`'s misleading delete-confirmation text, `app.profile.tsx`'s unconfirmed cap-table delete) applies to either Phase 1 file — both remain open, unfixed, tracked for whichever phase reaches their actual files.

### Phase 2 — CLOSED (`app.member-profile.tsx`, alone)

Built, byte-identical logic confirmed via a full diff filter (every surviving line traced to an expected `<button>`→`<LcsButton>` structural conversion, not a logic change), tsc-verified (55/55 exact error-set match — including the file's own pre-existing `useRef` type error, confirmed still present and unchanged, per the recon's own item #9), live-verified against the real `test-founder-member@` fixture (the actual team-member account this route serves, not the founder fixture used elsewhere).

- **100% inline-style file, confirmed and handled as such** — every `var(--foreground)`/`var(--muted-foreground)`/`var(--border)`/`var(--accent)`/`var(--card)`/`var(--faint)`/`rgba(124,58,237,…)`/`#c4b5fd` swept and replaced with the matching `--lcs-*` token across the whole file in one pass, verified by a final zero-hit grep for every v1 marker.
- **Bug #8 (recon) fixed as part of the token pass, not left open**: the sticky save bar's hardcoded `rgba(10,10,11,0.95)` dark background — a pre-rebuild dark-theme leftover in an otherwise fully light app — is now `var(--lcs-white)`. This is a pure color-correction, not a logic or behavior change, so it's in scope for a restyle pass: the bug was exactly "this token is stale," and applying the correct token is what the pass exists to do.
- **`initials()`'s `?` fallback avatar, the toggle switch, and the skills-chip pill shape were each restyled in place rather than forced onto a primitive** — same Group 6 decision-4/9 precedent (avatars and toggle switches keep their exact current shape; no new primitive invented mid-restyle). The skills chips' `borderRadius: 99` pill shape was dropped to a plain bordered rectangle, since chip content (unlike an avatar or a toggle) has no established in-place exception and LCS's structural sharp-corner rule applies.
- **`Card`'s header `action` slot** (used by `AddBtn` on the Experience/Education/Achievements sections) doesn't map onto `LcsCard`, whose header only supports a specific "View all" link pattern, not an arbitrary action node — kept as this file's own local `Card` component, restyled on LCS tokens directly, rather than force-fitting `LcsCard`'s narrower contract.
- **`EmptyHint`** (a single line of muted text, no border/box) was deliberately kept as its own lightweight component rather than upgraded to `LcsEmptyState` (a bordered, padded box) — using the heavier primitive for "No positions"/"No education entries"/"No achievements" would have visually inflated three small inline hints into three boxes, a real shape change the restyle-only discipline doesn't permit.
- **`📷` decorative emoji dropped per §13**, replaced with a real Lucide `User` icon in the avatar hover-upload overlay. `✓ Saved` also dropped its checkmark glyph, kept as plain "Saved" text on `--lcs-satisfied` (bug/item I's genuine 2-state palette: saved/unsaved → satisfied/pending-adjacent muted text, matching the recon's proposed mapping).
- **`labelStyle`/`inputStyle`/`textareaStyle`** (the three shared style consts every field in the file draws from) aligned to `LcsTextField`'s exact documented spec — 32px height, flat, sharp corners, `padding: "0 10px"` — so every field across the header inputs and all three entry-card types (`ExpCard`/`EduCard`/`AchCard`) is visually identical to the rest of the app's form fields, not just token-recolored.
- All write logic (`autoSave`'s debounced patch, `handleSave`'s full-state upsert, `handleAvatarUpload`'s crop-upload-mirror sequence, `addExperience`/`updateExp`/`removeExp` and the matching Education/Achievement triples, `addSkill`/`removeSkill`) confirmed byte-identical by diff — zero lines of logic in the surviving diff.
- **Live-verified**: header (avatar circle with correct `?` fallback for a fixture with no name set, all 5 header fields, Public CV toggle in its off state), Bio section, and — via "Add position" — a full live `ExpCard` render (all 4 fields, the Current-role checkbox, the description textarea with its live 0/300 counter, the remove button), all rendering correctly against the actual running app with zero console errors. Same unsaved-row pattern as Phase 1's achievements row (`addExperience` doesn't call `autoSave`) — new row exists only in local state; navigated away rather than triggering any write, consistent with the zero-unrequested-writes standard held throughout this migration.

Neither recon bug (`app.documents.tsx`'s misleading delete-confirmation text, `app.profile.tsx`'s unconfirmed cap-table delete) applies to this file either — both remain open, tracked for whichever phase reaches their actual files.

---

## Post-login Home Dashboard — closed out of sequence, 6 Sep 2026

**Pulled ahead of both Group 8 and Group 9, on direct instruction, after being raised three times and deferred each time.** `RaiseHome.tsx` (the founder-owner home at `/app`, tracked under Group 9) was found still fully v1 — purple `hs-gradient` numeral circles, `Syne` font, `hs-hairline-t` dividers — during a Group 7 check-in when a screenshot of it was shared. Given a full design brief (not a token restyle) and built same-day, per a written brief titled "Post-login Home Dashboard — Design Brief," reproduced in full in the session record: no fake data that looks real, no invented company names/metrics, a genuine empty-state-first worklist design (headline → one honest primary action → real "Waiting on you"/"Waiting on them" sections, empty-but-labeled when there's no data → a compact real how-it-works strip), built using only the already-approved LCS primitives (`LcsPageHeader`, `LcsCard`, `LcsEmptyState`, `LcsButton`, `LcsStatusPill`) with no new primitive invented.

**Scope correction found before building, not assumed:** the brief asked for "every role" (founder/investor/team member/advisor) in one component. Tracing `app.tsx`'s actual routing found this is wrong as a premise — there is no single home component for all roles today, "advisor" is not a real account type anywhere in the data model (`AccountContext.accountType` is `founder_owner`/`founder_admin`/`founder_member`/`investor_owner`/`investor_admin`/`investor_member`/`unknown` — "advisor" only exists in the unauthenticated `deals-preview` sandbox's `LcsViewerRole`), and three separate real routes already exist and already carry real, different data: `/app` → `RaiseHome.tsx` (founder-owner), `/app/investor` → `DealFlowHome.tsx` (investor-owner), `/app/member` → `MemberOverview` inline in `app.member.index.tsx` (any team member on either side — this is the real "advisor" case). Reported before writing any code; confirmed to rebuild all three, each on its own real data, same design language — not one component pretending to serve four roles.

**A second scope mismatch was reported and resolved the same way**: `LcsPageShell` (the primitive brief that named it as an allowed building block) is a full app shell — its own sidebar, top bar, search, notifications — but all three target files render as content *inside* the real running shell (`AdminShell`/`MemberShell`). Using it would have nested a second shell inside the real one. Confirmed to skip it and use `LcsPageHeader` + the content primitives only, matching how every other already-migrated route in the app already works.

**Built, all three files, using only `LcsPageHeader`/`LcsCard`/`LcsEmptyState`/`LcsButton`/`LcsStatusPill` — no new primitive invented:**
- **`RaiseHome.tsx`** — headline and primary action both computed from real `useRaiseProgress()` state (zero-data → "Build your pack…" / prepare-incomplete → "Next: {section}." / prepare-done-not-live → "go live" / live → "here's what's moving"); "Waiting on you" lists the real 6 pack sections with their real status; "Waiting on them" shows real active/closing room counts; "How it works" is the real 4-step Prepare→Present→Engage→Close sequence, plain text, no fabricated content.
- **`DealFlowHome.tsx`** — headline prioritizes the most urgent real signal (pending decisions > active rooms > generic); explicitly no "browse"/"discover" CTA anywhere, and the how-it-works copy states plainly that deal flow starts with a founder's brief, never a directory (Foundation §15/§25); "Waiting on you"/"Waiting on them" built from real `useDealFlowProgress()` counts (pending decisions, active rooms, watchlist, portfolio).
- **`app.member.index.tsx`**'s `MemberOverview`** — same worklist shape applied to already-correct, already-real data (`deal_room_team_assignments`, `deal_room_documents`) that only needed retoning and restructuring, not new logic. Genuine zero-assignment state renders the honest "No deal rooms assigned to you yet" headline with calm, labeled empty boxes — not a demo card.

**Verified:** `tsc` 55/55, exact error-set match against baseline (the two pre-existing errors in `app.member.index.tsx` — an `as any` cast and a route-param type mismatch — confirmed present before this change, untouched by it). Build clean, gzip 0.73 MB, action-split guard passed. Zero v1 markers remain in any of the three files (`hs-gradient`, `Syne`, hardcoded hex, `var(--foreground)`/`var(--card)`/etc. all swept). **Live-verified against real fixture data for all three roles, not mocked:**
- Founder-owner (`test-founder@`): real 57%-ready progress, "Next: Profile." headline, 6 real pack-section statuses, **2 real active deal rooms** in "Waiting on them," all 4 how-it-works steps rendering. Zero console errors.
- Investor-owner (`test-investor@`): headline correctly prioritized "2 decisions pending" over the lower-priority active-rooms signal; real counts throughout (2 pending, 2 active, 5 watchlist, 1 portfolio); honest "no directory to browse" copy rendered exactly as specified. Zero console errors.
- Team member (`test-founder-member@`): genuine zero-assignment fixture, correctly rendered the honest empty state ("No deal rooms assigned to you yet") with no fabricated rooms. Zero console errors.

**One pre-existing routing detail observed, not investigated or touched, flagged for whoever next touches `app.tsx`/`MemberShell`**: navigating this team-member fixture directly to `/app/member` renders the founder-style `AdminShell` nav (Prepare/Go Live/Connection Requests) rather than a member-scoped nav — `app.tsx`'s redirect-from-`/app` logic wasn't exercised by a direct navigation, so this may be expected shell behavior or may be a real gap; out of scope for this pass, which touched only the three content components named above.

`LCS_MIGRATION_PLAN.md`'s Group 8 and Group 9 tables updated below — `DealFlowHome.tsx` (was Group 8's v2 cohort) and `RaiseHome.tsx`/`app.member.index.tsx` (were Group 9) struck through and marked closed here, per the standing annotate-don't-silently-delete convention.

### Correction — the founder's own artifact preview rejected, real page rebuilt against a design-lead layout, 6 Sep 2026

**The design above was rejected by the founder.** Not the token/data work — the layout itself. The founder supplied a reference Stitch HTML file (an "Institutional Worklist Terminal" concept) and asked for it to be checked and demoed, not built directly — it brought a second, competing design system (dark-navy sidebar, Material-style token names, Geist/JetBrains Mono fonts) and, more seriously, a set of fabricated cryptographic/security claims: fake hex hashes, "HSM ENCLAVE ONLINE," "FIPS 140-3," "ED25519-CANONICAL," a fully invented audit-trail log (`GENESIS_INIT`/`ROLE_ASSIGN`/`POLICY_ENG` rows with fake hashes and timestamps), plus "Escrow & Ledger" as a phase-4 criterion — escrow is an explicit Foundation §15 non-goal. Reported before writing any code, per the same discipline as every other design-conflict finding in this migration; confirmed with the founder to keep the reference's structure (hero, 4-phase strip, 3-panel worklist) but rebuild every fabricated element with real content, on real LCS tokens — not the reference's own token system.

**A static preview artifact was built first** (not wired into any real route) so the founder could review before any real file was touched, per direct instruction — real LCS tokens, real progress-hook data shape, zero fabricated crypto content, but still carrying one leftover from the reference: a "Viewing as: Founder / Investor / Team member" role-switcher control in the sub-header, trimmed of its fake "Advisor View" option but not removed as a concept.

**The founder's correction brief caught the role switcher — a real defect, not a preference call.** A real user has exactly one role, from their account; a manual toggle letting one session flip between dashboards has no place in a shipped page (a labeled internal dev tool, if ever needed, is a separate and clearly different thing). The correction brief also asked two things resolved as scope questions before rebuilding: (1) confirm the 4-phase Prepare/Present/Engage/Close language is intentional shorthand, not meant to be replaced by the real 7-state deal-room lifecycle (initiation/NDA gate/profile/vault/diligence/negotiation/closing) — traced and reported as two genuinely different scopes (the founder's own outer raise journey vs. what happens inside one already-open deal room), confirmed correct as intentional shorthand, not a naming conflict; (2) rebuild strictly from `LcsPageHeader`/`LcsCard`/`LcsEmptyState`/`LcsButton`/`LcsStatusPill` only, reporting anything that doesn't fit rather than inventing a new primitive.

**One primitive-fit gap found and reported, not silently worked around**: the hero banner (headline + primary action + progress meter) doesn't fit `LcsCard`'s anatomy — that primitive unconditionally renders a 42px title-bar header even with an empty title string, which would have put an ugly blank bar above the hero's own heading. Built as a plain bordered container on LCS tokens instead (`border`/`background` only, no primitive), the same class of gap this migration has hit repeatedly for shapes with a border+background need but no matching card-with-header anatomy — not a new primitive, a composition.

**`RaiseHome.tsx` rebuilt to the approved layout — role switcher deleted entirely, hero + 4-phase status strip + 3-panel worklist (Waiting on you / Waiting on them / Expiring soon), all on real data:**
- Hero: real headline/primary-action logic carried over unchanged from the first pass; a real progress meter (0/6, pack completion %) added, matching the reference's kept pattern.
- 4-phase strip: each phase's `LcsStatusPill` status computed from real `RaiseProgress` fields — Prepare from `prepareDone`/section activity, Present from `goLiveDone`, Engage from `activeRooms`/`closingRooms`/`closedRooms`, Close from `closedRooms`/`closingRooms`. Criteria line under each phase reads real state ("0 of 6 confirmed," "A room must be open," etc.), never an invented one.
- "Expiring soon" panel: genuinely empty by design — no real query for NDA-window or term-sheet-deadline expiry exists yet in `useRaiseProgress`. Built as an honest, permanently-empty state ("NDA windows and term sheet deadlines appear here as they approach") rather than inventing fake countdown data to fill it, per the correction brief's own instruction ("real data only, or an honest empty state, never a fabricated one").

**A real logic bug was found and fixed during live verification, not assumed correct from the code alone**: the first build's `phaseStatus()` computed each phase independently, and against the real `test-founder@` fixture (which has 2 real in-progress pack sections and 2 real active deal rooms simultaneously) this produced a visibly wrong result — Phase 03 "Engage" showed "In progress" while Phase 01 "Prepare," where the founder's actual activity was, showed "Not started." Root cause: Phase 01's status gate checked `prepareDone > 0` (fully *completed* sections only) rather than any section activity, so partial progress on Profile/Readiness didn't register. Fixed to check `anySectionStarted` (any section not `"not-started"`), and Engage's gate was widened to resolve to `"satisfied"` once rooms move to closing/closed, matching the same sequential-pipeline logic already used for Close. Re-verified live post-fix: Phase 01 and Phase 03 both correctly show "In progress" together — an honest simultaneous state, not a forced single-active-phase fiction.

**Verified:** `tsc` 55/55 exact error-set match against baseline, both before and after the logic fix. Build clean, gzip 0.73 MB, action-split guard passed. Zero fabricated content of any kind confirmed by direct grep (`HSM|FIPS|0x[hex]|ED25519|AES-256|CIPHER|GENESIS_INIT|Escrow`) — zero hits. Zero role-switcher content confirmed the same way. **Live-verified against the real `test-founder@` fixture, post-fix**: hero (real 57%-ready headline, real 0/6 progress bar), all 4 phase cards with correct simultaneous status, all 6 real pack sections in "Waiting on you," 2 real active rooms in "Waiting on them," the honest empty "Expiring soon" panel — confirmed via accessibility snapshot that no role-switcher control exists anywhere in the page tree. Zero console errors.

**`DealFlowHome.tsx` and `app.member.index.tsx` were not touched by this correction** — the founder's rejection and correction brief were specific to `RaiseHome.tsx`'s layout (the page they screenshotted originally). Both other files still carry a leftover from the earlier pass worth flagging for whoever next touches them: neither has a role switcher (confirmed — they were never given one), but neither has been rebuilt against this approved hero/4-phase/3-panel layout either. They remain on the prior pass's simpler worklist-only structure. Not scoped to fix here; logged so the layout isn't assumed consistent across all three without checking.

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
| ~~`components/app/DealFlowHome.tsx`~~ | ~~106~~ | **CLOSED out of sequence, 6 Sep 2026 — see the Post-login Home Dashboard note above Group 8.** |
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
| ~~`routes/app.member.index.tsx`~~ | ~~189~~ | **CLOSED out of sequence, 6 Sep 2026 — see the Post-login Home Dashboard note above Group 8.** |
| `routes/app.deal-rooms.prep-notes.tsx` | 283 | 7 |
| ~~`components/app/RaiseHome.tsx`~~ | ~~133~~ | **CLOSED out of sequence, 6 Sep 2026 — see the Post-login Home Dashboard note above Group 8.** |
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

| # | Group | Lines | Driving factor | Status |
|---|---|---|---|---|
| 5 | Shared v1 primitives (`components/system` + `design-tokens`) | ~590 | Dependency — 26 routes import these | **CLOSED** |
| 6 | Deal Room shell + all 9 tabs + 2 dependencies (4 v2 tabs pulled in) | ~7,350 | Risk + dependency — shell wraps 9 tabs; NDA/closing/stage transitions; avoids a shell/tab design-system seam | **CLOSED** |
| 6.5 | `AIChat.tsx` — cross-cutting AI panel, explicitly excluded from Group 6 | 158 | Mounted app-wide, not deal-room-specific; LCS-hostile structure (chat bubbles, `prose` scale, shadows, gradients); own route-string bug | **Logged, not scheduled — see Group 6.5 above for the 3 open sub-questions** |
| 7 | Founder Profile & Documents | ~8,470 (confirmed by read; `ProfileBuilder.tsx` kept in scope per decision 1) | Dependency — retires 11 confirmed alias routes (see recon); largest volume | **All 10 Phase-0 decisions resolved — building, Phase 1 in progress** |
| 8 | Investor Pipeline | ~8,960 | Risk (moderate) — write actions, no stage transitions | Not started |
| 9 | Founder Home/Overview/Analytics | ~2,090 | Risk (low) — mostly read-only | Not started |
| 10 | Founder Roast | ~1,710 | Risk (low), fully isolated | Not started |
| — | Full-app v1-purple sweep (47 files incl. `styles.css`), tracked CLAUDE.md §19m | unscoped | Found during Group 6; deliberately not folded into any numbered group | Deferred, unscheduled |
| — | `components/v2/` retirement (15 route files + 6 components on the intermediate v2 tokens) | unscoped | Third parallel primitive library alongside `components/lcs/`; not touched by Groups 5–10 | Deferred, unscheduled |

**Remaining real work after Group 6: ~21,190 lines across Groups 7–10, plus `AIChat.tsx` (158 lines, blocked on a structural-fit decision) and the two unscheduled sweeps above (purple footprint, `components/v2/` retirement) whose actual line counts overlap significantly with Groups 6–10's own files and are not separately additive.**

Update this document's totals and mark a group's row CLOSED once it closes (do not delete rows — the closed rows above are the running record), matching the discipline already used for the old 11-group plan's tracking (that plan's own history is preserved in CLAUDE.md's amendment log rather than in a file, which is the exact gap this document exists to close going forward).
