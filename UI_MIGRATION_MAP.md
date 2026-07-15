# UI Migration Map — Audit Only

Generated 2026-07-15. Read-only audit against the proposed "Design Constitution" route map and rendering rules. No files were modified as part of this document.

**Open conflict, not resolved here:** the Design Constitution pasted into this task (flat `#7C3AED`, DM Sans, 0px radius, dense table-first layout, and the route map below) contradicts CLAUDE.md Section 9 (the July 2026 white redesign: purple-only-as-gradient, Inter/Syne, borderless `rounded-none` cards) and the current file-based routes. This document inventories facts only — it does not decide which system wins. That decision needs to be made explicitly before any implementation work starts.

---

## 1. Route Inventory

### 1.1 Structural discovery that affects everything below

The app already went through its own IA consolidation (P4 for founder, P5 for investor) that the target route map doesn't account for:

- **P4** collapsed founder routes into a 4-step wizard: `/app` (home), `/app/prepare`, `/app/go-live`, `/app/deal-rooms`, `/app/close`.
- **P5** collapsed investor routes into a 4-step wizard: `/app/investor` (home), `/app/investor/thesis`, `/app/investor/source`, `/app/investor/evaluate`, `/app/investor/decide`.

Most of the "old" routes named in the target map (`/app/documents`, `/app/claims`, `/app/badges`, `/app/advisor`, `/app/investor/intake`, `/app/investor/startups`, `/app/investor/deal-rooms`, `/app/investor/diligence`, `/app/investor/analysis`, `/app/investor/portfolio`) are now **redirect shims** — the file exists, but `beforeLoad` immediately redirects into a wizard step page with a `#hash` that auto-expands the matching accordion. The real content lives inside an accordion, not at a standalone URL.

This matters directly for the target map: routes like `/raise/documents` or `/deal-intake` assume flat, real, top-level pages. Today those are accordion sections nested inside `/app/prepare` and `/app/investor/source` respectively — not pages.

### 1.2 Founder routes (`src/routes/app.*.tsx`)

| File | URL | Renders | Status |
|---|---|---|---|
| `app.tsx` | `/app` (layout) | Auth guard, picks AdminShell vs MemberShell | Layout |
| `app.index.tsx` | `/app/` | `RaiseHome` — 4-step raise home | Live |
| `app.assistant.tsx` | `/app/assistant` | Re-export of `FounderHome` chat/workstation | Live |
| `app.prepare.tsx` | `/app/prepare` | ① Prepare — 6 `PrepareSection` accordions: Profile, Documents, Verification, Claims, Readiness, Badges | Live (central hub) |
| `app.profile.tsx` | `/app/profile` | 3,108-line company profile editor, also embedded in Prepare accordion | Live, dual-mounted |
| `app.documents.tsx` | `/app/documents` | Redirect → `/app/prepare#documents`; component is 942 lines | Redirect shim |
| `app.advisor.tsx` | `/app/advisor` | Redirect → `/app/prepare#verification` | Redirect shim |
| `app.claims.tsx` | `/app/claims` | Redirect → `/app/prepare#claims`; component 431 lines | Redirect shim |
| `app.badges.tsx` | `/app/badges` | Redirect → `/app/prepare#badges`; component 266 lines | Redirect shim |
| `app.go-live.tsx` | `/app/go-live` | ② Go Live — publish toggle, public URL, roast, 3 accordions | Live |
| `app.deal-rooms.tsx` | `/app/deal-rooms` | ③ Deal rooms list/create, 933 lines | Live |
| `app.deal-room.$id.tsx` | `/app/deal-room/:id` | The deal-room workspace — **7,377 lines**. Documents, Q&A, NDA, notes, term sheets, closing, team, activity all in one file | Live, largest file in repo |
| `app.deal-room.$id_.nda.tsx` | `/app/deal-room/:id/nda` | Standalone NDA signing page, 342 lines | Live |
| `app.close.tsx` | `/app/close` | ④ Close — Term sheets / Closing / Closed accordions | Live |
| `app.desk.tsx` | `/app/desk` | Redirect → `/app/overview` (which itself redirects → `/app`) | Redirect shim, double-dead |
| `app.overview.tsx` | `/app/overview` | Redirect → `/app`; legacy 1,280-line `Overview` component | Redirect shim |
| `app.home.tsx` | `/app/home` | Redirect → `/app`; empty stub | Redirect shim |
| `app.meetings.tsx` | `/app/meetings` | Meeting scheduling/list, 436 lines | Live |
| `app.messages.tsx` | `/app/messages` | Team notes/tasks workspace, 1,247 lines | Live |
| `app.audit.tsx` | `/app/audit` | Activity log table (`activity_log` by `account_id`) | Live |
| `app.settings.tsx` + 4 children | `/app/settings/*` | Billing, domain, notifications, security tabs | Live |
| `app.connections.tsx` | `/app/connections` | Founder CRM/leads, CSV import | Live |
| `app.directory.tsx` | `/app/directory` | Public directory browse (shared founder+investor) | Live |
| `app.email.tsx` | `/app/email` | AI email assistant | Live |
| `app.feedback.tsx` | `/app/feedback` | Feedback form | Live |
| `app.member-profile.tsx` | `/app/member-profile` | Team-member personal profile | Live |
| `app.member.index.tsx` | `/app/member/` | `MemberOverview` — restricted-role dashboard | Live |
| `app.notifications.tsx` | `/app/notifications` | Full notifications list | Live |
| `app.profile-builder.tsx` | `/app/profile-builder` | Standalone profile builder flow | Live |
| `app.profile.operational.tsx` | not a route | `OperationalVerification` component, imported elsewhere | Not routed |
| `app.referrals.tsx` | `/app/referrals` | Referral program | Live |
| `app.roast.*.tsx` (3 files) | `/app/roast/*` | Roast session management | Live |
| `app.users.tsx` | `/app/users` | Team management, labeled "Team" in nav | Live |
| `app.wall.tsx` | `/app/wall` | "Coming in Stage 2" placeholder | Live, placeholder |

### 1.3 Investor routes (`src/routes/app.investor.*.tsx`)

| File | URL | Renders | Status |
|---|---|---|---|
| `app.investor.tsx` | `/app/investor` (layout) | Auth + role guard | Layout |
| `app.investor.index.tsx` | `/app/investor/` | `DealFlowHome` — 4-step deal-flow home | Live |
| `app.investor.assistant.tsx` | `/app/investor/assistant` | Re-export of `InvestorChat` | Live |
| `app.investor.advisor.tsx` | `/app/investor/advisor` | Redirect → `/app/investor`; legacy chat component | Redirect shim |
| `app.investor.thesis.tsx` | `/app/investor/thesis` | ① Thesis — wraps the *entire* `InvestorProfilePage` in one accordion | Live |
| `app.investor.source.tsx` | `/app/investor/source` | ② Source — 4 accordions: Watchlist, Deal intake, Directory, Connections | Live |
| `app.investor.intake.tsx` | `/app/investor/intake` | Redirect → `/app/investor/source#intake`; component 971 lines | Redirect shim |
| `app.investor.startups.tsx` | `/app/investor/startups` | Redirect → `/app/investor/source#watchlist`; component 1,386 lines | Redirect shim |
| `app.investor.connections.tsx` | `/app/investor/connections` | Investor connections, 994 lines, also embedded in Source | Live |
| `app.investor.evaluate.tsx` | `/app/investor/evaluate` | ③ Evaluate — 3 accordions: Deal rooms, Due diligence, AI analysis | Live |
| `app.investor.deal-rooms.tsx` | `/app/investor/deal-rooms` | Redirect → `/app/investor/evaluate#deal-rooms`; 157 lines | Redirect shim |
| `app.investor.diligence.tsx` | `/app/investor/diligence` | Redirect → `/app/investor/evaluate#diligence`; 200 lines, uses `dd_checklist_items`/`dd_categories` | Redirect shim |
| `app.investor.analysis.tsx` | `/app/investor/analysis` | Redirect → `/app/investor/evaluate#analysis`; 566 lines | Redirect shim |
| `app.investor.decide.tsx` | `/app/investor/decide` | ④ Decide — 2 accordions: Decisions, Portfolio | Live |
| `app.investor.decisions.tsx` | `/app/investor/decisions` | `DecisionsPage`, 769 lines, kanban board, also embedded in Decide | Live, dual-mounted |
| `app.investor.portfolio.tsx` | `/app/investor/portfolio` | Redirect → `/app/investor/decide#portfolio`; 206 lines | Redirect shim |
| `app.investor.desk.tsx` | `/app/investor/desk` | Redirect → `/app/investor/overview` | Redirect shim |
| `app.investor.overview.tsx` | `/app/investor/overview` | Legacy dashboard, 563 lines, still reachable | Live, likely legacy |
| `app.investor.profile.tsx` | `/app/investor/profile` | `InvestorProfilePage`, 1,308 lines, own `AccordionBlock` sections, also embedded in Thesis | Live, dual-mounted |
| `app.investor.profile.capital.tsx` | `/app/investor/profile/capital` | Capital verification, 490 lines | Live |
| `app.investor.settings.tsx` | `/app/investor/settings` | Single flat 327-line file, not split into sub-routes | Live |
| `app.investor.team.tsx` | `/app/investor/team` | Investor team management, 592 lines | Live |

### 1.4 Other route groups (lower priority, not detailed line-by-line)

API endpoints (`api.*.tsx`), public marketing (`about`, `founders`, `investors`, `pricing`, `contact`, `blog.*`, `docs.*`, `resources`, `registry`, `trust`, `terms`, `privacy`, `waitlist`, `solutions.*`), auth/onboarding (`sign-in`, `sign-up`, `forgot-password`, `auth.callback`, `invite`, `join*`), public profile/share (`p.$slug`, `i.$slug`, `cv.$slug`, `verify.$slug`), public roast (`roast.$id`), calculator tools (`tools/*`, 7 files), `design-preview.tsx`.

---

## 2. Accordion / Collapsible Inventory

### 2.1 `PrepareSection` — the load-bearing primitive

Defined at `src/components/app/PrepareSection.tsx`. Mechanics:
- Collapsed by default unless status is `"in-progress"` (`useState(status === "in-progress")`, line 29).
- Content doesn't mount into the DOM until first expand (`everOpened ? children : null`, line 111), and is `React.lazy`-loaded on top of that.
- Supports `#hash` deep-link auto-expand + scroll (lines 34–54).

This wraps **primary content**, not FAQ/help, on 8 pages:

| File | Sections (label → content) |
|---|---|
| `app.prepare.tsx` | Company profile, Documents, Verification, Claims, Readiness, Badges |
| `app.go-live.tsx` | 3 sections — publish/discoverability/roast |
| `app.close.tsx` | Term sheets, Closing, Closed |
| `app.investor.thesis.tsx` | Thesis → entire `InvestorProfilePage` |
| `app.investor.source.tsx` | Watchlist, Deal intake, Directory, Connections |
| `app.investor.evaluate.tsx` | Deal rooms, Due diligence, AI analysis |
| `app.investor.decide.tsx` | Decisions, Portfolio |

Net effect: Deal Intake ("paste, parse, score" — the promoted top-level nav item in the target map) is currently 3 clicks deep — top nav → Source → expand accordion.

### 2.2 Other collapsible implementations

- **`src/components/ui/accordion.tsx`** — generic shadcn/radix primitive, used elsewhere, not separately audited.
- **`HelpGuide.tsx:8`** — a second, distinct inline `Accordion`, used for genuinely secondary content: "Getting started," "Common questions," etc. This one legitimately matches the constitution's "FAQ/help only" carve-out.
- **`AccordionBlock`** in `app.investor.profile.tsx:128–181` — primary profile-editing sections (setup/thesis/achievements/team/portfolio/sharing), default-open except "sharing."
- **Native `<details>`** at `app.investor.profile.tsx:601` — wraps "Matching fields" (Sectors/Geography/Stages), intentionally secondary/advanced, inside the Thesis accordion.
- **`Collapsible` (Radix)** — base primitive at `src/components/ui/collapsible.tsx`; used in `LeadDrawer.tsx`'s `CollapsibleSection` (AI Email Generator, LinkedIn Message, Reply Handler — secondary tool panels), and referenced via a "(research)" comment at `app.deal-room.$id.tsx:2592`.
- **Ungoverned local `useState` toggles** inside `app.deal-room.$id.tsx` — `profilesOpen`, `analysisOpen`, `qaSummaryOpen`, `vaultNotesOpen`, `editorOpen` (lines ~1508, 3241, 3316, 3336, 3743) gate primary deal-room content (profile cards, AI analysis, Q&A summary, vault notes, term-sheet editor), all collapsed by default inside the single mega-route, with no shared component managing them.

---

## 3. Route-Map Diff (current → target)

Legend: **(a)** exists 1:1 · **(b)** exists under a different path/name · **(c)** doesn't exist yet · **(d)** existing route contains more than the target scope, needs splitting

### 3.1 Founder

| Target | Status | Notes |
|---|---|---|
| `/home` | (b) | Closest: `/app` (home) or `/app/assistant` (workstation). No literal `/home`; `/app/home` is a dead redirect to `/app`. |
| `/raise` | (b) | Closest: `/app/prepare`, but it bundles all 6 sub-sections rather than being a distinct landing separate from them. |
| `/raise/profile` | (d)/(b) | Exists at `/app/profile` (live) **and** as an accordion inside `/app/prepare#profile` — dual-mounted, would need extracting to become the target's standalone flat route. |
| `/raise/documents` | (d)/(b) | Redirect shim only; real 942-line content lives inside the accordion. |
| `/raise/verification` | (b) | `/app/advisor` redirects here — naming mismatch too ("advisor" vs "verification"). |
| `/raise/claims` | (b) | Redirect shim → accordion. |
| `/raise/readiness` | (c) | Never had a standalone route — accordion-only content since inception. |
| `/raise/badges` | (b) | Redirect shim → accordion. |
| `/raise/publish` | (b) | Closest: `/app/go-live`, top-level not nested, different name. |
| `/deal-rooms` | (b) | `/app/deal-rooms` — reasonable match modulo the `/app` prefix. |
| `/deal-rooms/:id/overview` | (d) | Doesn't exist as a sub-route — it's a tab inside the 7,377-line mega-file. **Biggest split needed in the whole map.** |
| `/deal-rooms/:id/information` | (c) | No dedicated URL; the target's "mutual disclosure" concept doesn't exist in the current app at all. |
| `/deal-rooms/:id/documents` | (c) | Tab inside mega-file. |
| `/deal-rooms/:id/qa` | (c) | Tab inside mega-file. |
| `/deal-rooms/:id/nda` | (b) | Already split out — `/app/deal-room/:id/nda` (note: singular "deal-room" vs target's plural "deal-rooms"). |
| `/deal-rooms/:id/diligence` | (c) | Tab inside mega-file. |
| `/deal-rooms/:id/term-sheets` | (c) | Tab inside mega-file (~lines 3700–3940+). |
| `/deal-rooms/:id/close` | (c) | Tab inside mega-file; `closing_item_templates` queried at line 4152. |
| `/deal-rooms/:id/activity` | (c) | Tab inside mega-file (~line 7314). |
| `/pipeline` | (c) | No founder-side pipeline route exists. |
| `/contacts` | (b) | Closest: `/app/connections`. |
| `/reports` | (c) | Doesn't exist. |
| `/analytics` | (c) | Doesn't exist. |
| `/meetings` | (b) | `/app/meetings`. |
| `/team` | (b) | `/app/users`, labeled "Team" in nav — path name mismatch. |
| `/settings/*` | (b) | `/app/settings/*`. |

### 3.2 Investor

| Target | Status | Notes |
|---|---|---|
| `/home` | (b) | Closest: `/app/investor` or `/app/investor/assistant`. |
| `/profile` | (b) | `/app/investor/profile` exists directly **and** embedded in Thesis; plus `/app/investor/profile/capital` isn't represented in the target map at all. |
| `/thesis` | (b) | `/app/investor/thesis` wraps the *entire* profile editor, not thesis-only — scope mismatch needs a decision either direction. |
| `/deal-flow` | (b) | `/app/investor/deal-flow` exists (397 lines) but looks like a separate legacy page, not part of the 4-step wizard — needs reconciliation. |
| `/deal-intake` | (d)/(b) | Redirect shim only; real content is accordion-only; **no nav entry exists at all today** (see §6). |
| `/watchlist` | (d)/(b) | Redirect shim → Source accordion. |
| `/pipeline` | (c) | No page literally named this; closest conceptual overlap is `deal-flow` or the Decide accordion's kanban. |
| `/deal-rooms` | (d)/(b) | Redirect shim → Evaluate accordion. |
| `/deal-rooms/:id/*` | (b) | Investor side reuses the **same shared** `/app/deal-room/:id` mega-file (not investor-namespaced) — same splitting need as founder side. |
| `/reports` | (c) | Doesn't exist. |
| `/analytics` | (c) | Doesn't exist. |
| `/directory` | (b) | `/app/directory`, shared with founder, also re-embedded in Source. |
| `/meetings` | (b) | Investor nav points at the same shared `/app/meetings` as founder — not investor-namespaced. |
| `/team` | (b) | `/app/investor/team`. |
| `/settings/*` | (b) | `/app/investor/settings` is one flat file, not split into sub-routes the way founder settings is. |

**Cross-cutting note**: both sides have dead double-hop redirects (`/app/desk` → `/app/overview` → `/app`; `/app/investor/desk` → `/app/investor/overview`, single-hop dead end still rendering legacy content).

---

## 4. Security Leak Audit — deal-room content rendered outside `/deal-rooms/:id/*`

### 4.1 Confirmed: document filenames leak into the global notification bell

`NotificationBell.tsx` renders on **every** authenticated page (mounted in both `AppShell` and `MemberShell` headers) and shows notification body text verbatim:
- `src/components/app/NotificationBell.tsx:182` — `{n.title}`
- `src/components/app/NotificationBell.tsx:197` — `{n.body}` (line-clamped but full text in DOM)

Call sites that insert real filenames into that body:
- `src/routes/app.deal-room.$id.tsx:5227, 5573, 5644` — three separate upload-notification sites, all `body: "${fileName}" has been shared with you for review.`
- `src/lib/doc-request-fn.ts:84` — `body: An investor requested: "${data.title}"`
- `src/lib/doc-request-fn.ts:131` — `body: The founder uploaded: "${data.title}"`

**Failure scenario**: an investor uploads `"Cap Table - Series A Final.xlsx"` inside a deal room; every other member gets a notification containing that exact filename, visible in the bell dropdown from `/app`, `/app/overview`, `/app/messages` — anywhere, not just inside the room.

### 4.2 Confirmed: decision notes render on the Portfolio page

`src/routes/app.investor.portfolio.tsx:39-51` queries `decisions.notes` (free-text rationale) and renders it directly at line 160 (`line-clamp-2`) on a page reachable outside any `/deal-rooms/:id` boundary (now `/app/investor/decide#portfolio`).

### 4.3 Confirmed: activity log can carry document filenames outside deal-room scope

- `src/routes/app.documents.tsx:366-375` — founder profile-document uploads call `logActivity` with `detail: "Uploaded ${file.name}"`, rendered in the general `/app/audit` table. Lower sensitivity (these are profile docs, not deal-room docs) but establishes `activity_log` as a real vector.
- **Unresolved thread**: `Dropzone.tsx:132` calls a *different*, positional-arg `logActivity` (from `src/lib/supabase.ts`) for deal-room document uploads, passing `{ filename: nf.name }`. Whether that writes into the same globally-queryable `activity_log` table or a room-scoped one was not fully resolved — flag as a specific follow-up before relying on `/app/audit` being leak-free.

### 4.4 Confirmed: `deal_room_documents.name` queried outside deal-room scope

`src/routes/app.member.index.tsx:46-51` — `MemberOverview` (`/app/member/`) selects `deal_room_documents(id, name, created_at, deal_room_id)` limited to 5 for a "Recent Documents" section. The stat-card count itself is safe, but the underlying query fetches `name` — whether a list below the stat cards actually prints those names wasn't confirmed in this pass (read window truncated) and needs direct verification before this is called safe or unsafe.

### 4.5 Not leaked / status-only (verified safe)

- `term_sheet_status` (enum label, not numbers) appears in `app.close.tsx`, `app.investor.portfolio.tsx`, `app.investor.overview.tsx`, `app.investor.deal-rooms.tsx` — status word only, no dollar figures or terms found rendered outside the room.
- `deal_room_qa` — only queried in `badge-award-engine.ts` and `qa-report-fn.ts` (server-side), never rendered raw outside `app.deal-room.$id.tsx`.
- `deal_room_notes`, `dd_checklist_items`, `dd_categories`, `closing_item_templates` — all scoped to deal-room or evaluate-workspace contexts; diligence in particular is fuzzy (`/app/investor/diligence` is investor-workspace-level, not raw deal-room, but is inherently per-deal) — worth an explicit decision in the target IA rather than treating as settled.

### 4.6 Flagged for follow-up, not confirmed either way

`src/routes/app.investor.overview.tsx:315` renders `act.action` verbatim (`Founder activity: ${act.action}`). Elsewhere (`app.deal-rooms.tsx:624`) the same `action` column is used to store a full free-text sentence including investor name, firm, deal type, and funding target — not a short category string. Whether the overview page can end up rendering that free-text version (as opposed to short strings like `"document_uploaded"`) depends on which write path populated the row, and wasn't resolved in this pass.

---

## 5. Contrast / Width Audit

### 5.1 Low-contrast gray text

`text-gray-400`: 87 hits total, **54 (62%) concentrated in `app.deal-room.$id.tsx`** alone (lines 1307, 1353, 1508×2, 1517, 1522, 1543, 1602, 1610, 1700, 1759, 1766, 1827, 1834, 1859, 1886, 2967, 2999, 3110, 3112, 3126, 3128, 3157, 3163, 3191, 3241×2, 3248, 3280, 3316×2, 3323, 3336×2, 3341, 3347, 3373, 3705, 3743, 3769, 3779, 3845, 3907, 3938, 4327, 4339, 4366, 4414, 4446, 4473, 4498, 4534, 7079, 7081, 7104, 7250, 7314, 7324).

`text-gray-300`: 8 hits, 5 in the same file (707, 1518, 5297, 5701, 5782).

Remaining 33 `text-gray-400` hits outside the deal-room file: `roast.$id.tsx` (10), `ProfileBuilder.tsx` (9), `DDAnalysisPanel.tsx` (4), `AIOperatorPanel.tsx` (3), `docs.tsx` (2), plus single hits in `waitlist.tsx`, `pricing.tsx`, `p.$slug.tsx`, `invite.tsx`, `feedback.tsx`.

`text-zinc-400/300`, `text-slate-400/300`: 0 hits (not used anywhere).

### 5.2 Low-alpha `rgba(0,0,0,X)`

- `rgba(0,0,0,0.25)` — 1 hit: `src/components/system/EmptyState.tsx:55`, propagates broadly since `EmptyState` is used almost everywhere.
- `rgba(0,0,0,0.2)`, exact `rgba(0,0,0,0.3)` — 0 hits.
- `rgba(0,0,0,0.35)` — not in the original ask but found clustered across 14 files as the repeated "Inter 11px uppercase step-eyebrow" inline style (`app.prepare.tsx:59`, `app.close.tsx:85`, `app.investor.thesis.tsx:34`, `app.investor.source.tsx:36`, `app.investor.evaluate.tsx:33`, `app.investor.decide.tsx:30`, `PrepareSection.tsx:88,102`, +6 more). This is the current design system's intentional "Muted" token (CLAUDE.md §9.5) — every one of these would fail the new constitution's `#71717A` (~`rgba(0,0,0,0.44)`) floor, since 0.35 is lighter than 0.44.

### 5.3 Page-level outer wrappers under ~900px (modals/cards excluded)

- `app.deal-room.$id_.nda.tsx:260` — `max-w-2xl` wraps the entire NDA signing page.
- `app.feedback.tsx:79, 100` — both the thank-you and main form states.
- `app.overview.tsx:732` — onboarding/empty-state wrapper (legacy page).
- `app.documents.tsx:385` — investor-role empty-state branch.
- `app.roast.$id.answers.tsx:320`, `app.roast.$id.live.tsx:335` — full-page wrappers.
- `app.settings.billing.tsx:36` — full settings-tab content, confirmed not a modal.
- `app.wall.tsx:61` — inner placeholder wrapper (secondary, page has no other real content).
- `app.investor.intake.tsx:389` — borderline: only the subtitle paragraph is constrained, page body itself is unconstrained (`p-6 lg:p-8`).

No `max-w-md`/`max-w-lg` page-level (non-modal) outer wrappers found in any `app.*.tsx` route.

---

## 6. Deal Intake Entry Point

**There is no nav entry for Deal Intake today, at any level.** `grep` of `AppShell.tsx` for "intake" returns zero matches. The full `investorNav` array (`AppShell.tsx:54-62`) is: Thesis, Source, Evaluate, Decide, AI Advisor, Team — plus Settings. Deal Intake is reachable only by: nav → Source → expand "Deal intake" accordion (default-collapsed, since its status starts `"not-started"`).

`app.investor.intake.tsx` itself is a pure redirect shim (`→ /app/investor/source#intake`, comment confirms this is deliberate P5 consolidation). The real `IntakePage` component (971 lines) has:
- Header: "Deal Intake" + subtitle "Paste, upload, or link any founder data. We extract contacts, score against your thesis, and surface the strongest matches."
- "Past intake runs" history list.
- Paste/upload/link input area, AI extraction + thesis-match scoring.

**To promote this to a real top-level nav item per the target map**, minimum required changes: (1) add an `investorNav` entry pointing at a live (non-redirect) URL, (2) either un-shim `app.investor.intake.tsx` back to a real route or pick a new URL and move the redirect direction, (3) decide whether the Source accordion keeps a duplicate/summary of intake or drops it entirely to avoid two entry points to the same feature.

---

## 7. Logo Link Target

The `Logo` component (`src/components/brand/Logo.tsx`) is unlinked by design — every consumer wraps it manually. All three checked consumers hard-code the same target:

| Shell | File:line | Target |
|---|---|---|
| `SiteHeader` (public) | `src/components/site/SiteHeader.tsx:25` | `/` — expected for a logged-out marketing header |
| `AppShell` (founder/investor admin) | `src/components/app/AppShell.tsx:339` | `/` — unconditional |
| `MemberShell` (restricted team member) | `src/components/app/MemberShell.tsx:159` | `/` — unconditional |

**Finding**: no authenticated-vs-unauthenticated branching exists anywhere. A signed-in founder or investor clicking the logo from inside `/app/*` is taken to the public marketing homepage, not to `/app` or `/app/investor`. Consistent today, but worth flagging since the target map's new `/home` concept implies the logo should probably act as an in-app home affordance instead.

---

## Summary for planning

- **Biggest structural gap**: the target map assumes `/deal-rooms/:id/*` is already split into sub-routes. It isn't — everything lives in one 7,377-line file. This is the largest single migration item by far.
- **Second-biggest gap**: nearly every founder "Prepare" sub-page and investor "Source"/"Evaluate"/"Decide" sub-page the target map wants as flat top-level routes currently exist only as accordion sections or redirect shims, a direct product of the P4/P5 consolidation that intentionally moved *away* from flat routes toward wizarded accordions. Adopting the target map means partially reversing P4/P5, not building net-new pages.
- **Confirmed, fixable security leaks**: notification bodies (filenames), decision notes on Portfolio, and possibly `MemberOverview`'s recent-documents list — all worth sealing regardless of which design system wins.
- **Contrast**: the `rgba(0,0,0,0.35)` "Muted" token is core to the *current* design system (CLAUDE.md §9.5) and would need to change everywhere it's used if the new constitution's `#71717A` floor is adopted — this is not a fringe cleanup, it's a token-level rework touching every wizard page.
- **Deal Intake promotion**: cheap to do in isolation (nav entry + un-shim one route) but raises the double-entry-point question the moment it's live.
