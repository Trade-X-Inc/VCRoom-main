# LCS Migration Plan — Groups 5+

Generated 4 Sep 2026, by a step-0 audit (Explore agent, Opus) of the current repo state, re-run because the original 11-group plan for the internal (authenticated) UI migration to LCS was delivered as chat output in an earlier session and never saved to a file — this document exists specifically so that gap doesn't recur for whoever scopes the next group. See CLAUDE.md's amendment log (27 Aug – 4 Sep 2026 entries) for the history of Groups 0–4, already closed.

**Read this before starting any group below.** Each group still needs its own structural-fit report (per the standing discipline: report before building if anything doesn't map cleanly onto the 10 LCS primitives) and its own live verification pass, exactly as Groups 0–4 were done. This document is the *inventory and ordering*, not a substitute for that per-group discipline.

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

## Group 5 — Shared v1 primitive layer

**Ordered first: pure dependency — 26 routes import these.**

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
