# R9 Step 0 — Leaf-Page Audit (contextual navigation relocation)

Status legend:
- **(a)** exists as a real standalone route — relocate URL + sidebar position only, no logic touched
- **(b)** exists bundled inside a larger page (tab/section/card) — extract into its own route, logic moved as-is
- **(c)** does not exist — build minimally (PageFrame, honest empty states, no fake data)

## Founder

| Sitemap path | Current location | Status | Notes |
|---|---|---|---|
| Overview | `app.overview.tsx` (R5 rebuild) | a | Becomes the shell's default landing. Overlaps today's `/app` home (`app.index.tsx`) — see open questions. |
| Prepare › Profile Builder › Quick Setup | `app.profile.tsx` — `"quick"` tab | b | One of 5 internal tabs in a 3,106-line file. |
| Prepare › Profile Builder › Full Profile | `app.profile.tsx` — `"full"` tab | b | |
| Prepare › Profile Builder › Team Cards | `app.profile.tsx` — team-members section inside full tab | b | |
| Prepare › Profile Builder › Achievements | `app.wall.tsx` (Achievement Wall) | a | Closest existing feature — confirm this mapping (see open questions). |
| Prepare › Profile Builder › Fundraising Thesis | `app.profile.tsx` — `founder_thesis` section (`founder-thesis-fn.ts`) | b | |
| Prepare › IP Vault › Document Intake | `app.documents.tsx` — template-guided intake flow | b | All four IP Vault leaves live in this one 939-line file. |
| Prepare › IP Vault › Source Files | `app.documents.tsx` — physical file uploads (`founder_documents` storage) | b | Stays distinct from Digital Vault per step 6. |
| Prepare › IP Vault › Digital Document Vault | `app.documents.tsx` — processed `founder_documents` list | b | Stays distinct per step 6. |
| Prepare › IP Vault › Document Privacy Settings | `app.documents.tsx` — per-doc visibility toggles (deal_room/stage2) | b | |
| Prepare › Workstation › Verifications | `app.verification.tsx` | a | |
| Prepare › Workstation › Claims | `app.claims.tsx` | a | |
| Prepare › Badges › Badge Overview & Guide | `app.badges.tsx` (earned + `badge_definitions` guide) | a | |
| Prepare › Badges › Apply Badge | No page — `evaluateAndAwardBadges()` lib fn + scattered "Re-check" buttons | c | Minimal page wrapping the existing engine; no new logic. |
| Prepare › Badges › Founder Roast | `app.roast.index.tsx` | a | |
| Prepare › Badges › Founder Roast Reports | `app.roast.index.tsx` — completed-sessions list (+ `app.roast.$id.answers.tsx`) | b | Extract completed/report view; answers page stays put. |
| Prepare › Investment Readiness › Investor Simulation | `app.index.tsx` — `investor_sim_runs` card | b | |
| Prepare › Investment Readiness › Investment Audit | `app.index.tsx` — `readiness_score_runs` card | b | |
| Prepare › Founder Coaching › Full Profile & Documents Check | `app.index.tsx` — `CoachingCard` (`runFounderCoaching`) | b | One card covers both leaves — split run-flow vs report view. |
| Prepare › Founder Coaching › Full Report & Flags | `app.index.tsx` — `CoachingCard` report display | b | |
| Go Live › Digital Profile › Full Digital Profile View | `app.profile.tsx` — `"preview"` tab | b | |
| Go Live › Digital Profile › Profile Privacy Settings | `app.profile.tsx` — `"privacy"` tab (`section_visibility`) + publish toggle in `app.go-live.tsx` | b | Two sources merge here; go-live hub dissolves. |
| Go Live › Directory Dashboard | `app.directory.tsx` | a | |
| Go Live › Profile View Analytics | `app.profile.tsx` — `"analytics"` tab (`profile_views`) | b | |
| CRM › Connections | `app.connections.tsx` — leads list | b | Page bundles list + pipeline; split into two leaves. |
| CRM › Pipeline Manager | `app.connections.tsx` — `PIPELINE_STEPS` pipeline view | b | |
| CRM › Connection Meetings | `app.meetings.tsx` (`meetings` + `vc_leads`) | a | |
| CRM › CRM Analytics | Nowhere | c | |
| Deal Rooms › Deal Room | `app.deal-rooms.index.tsx` | a | Room internals (R3 vault) untouched, per spec. |
| Deal Rooms › Meetings Calendar | No room-scoped calendar (`deal_room_meetings` table exists, zero consumers) | c | Minimal: `meetings` rows where `deal_room_id` is set. |
| Deal Rooms › Deal Prep Notes | `deal_room_notes` consumed only inside `/:id` routes | c | **§9.6 constraint**: this page may list room name + timestamp + link into the room only — never note content. |
| Deal Rooms › Team Assignments | `app.deal-rooms.index.tsx` — assignments UI (`deal_room_team_assignments`) | b | |
| Deal Rooms › Reports Vault | `deal_room_closure_reports` is write-only today (no reader anywhere) | c | Closed deals only, per §9.6 /reports rule. |
| Analytics | `app.analytics.tsx` (R5) | a | |
| Team Chat | `app.messages.tsx` (`team_channels`/`team_messages`) | a | |
| Settings | `app.settings.tsx` (+ billing/security/notifications/domain children) | a | Keeps internal tab structure per spec. |

## Investor

| Sitemap path | Current location | Status | Notes |
|---|---|---|---|
| Overview | `app.investor.overview.tsx` (R5 rebuild) | a | |
| Thesis › Investor Profile Builder › Quick Setup | `app.investor.profile.tsx` — Identity & Fund section | b | R4B page; all Profile Builder leaves bundled here. |
| Thesis › Investor Profile Builder › Full Profile | `app.investor.profile.tsx` — thesis/sectors/stages/cheque form | b | |
| Thesis › Investor Profile Builder › Team Cards | `InvestorTeamSection` in `app.investor.profile.tsx` | b | |
| Thesis › Investor Profile Builder › Track Record | track-record section in `app.investor.profile.tsx` (R4B) | b | |
| Thesis › Investor Profile Builder › Investment Thesis | thesis section in `app.investor.profile.tsx` | b | `app.investor.thesis.tsx` hub (R2b) dissolves. |
| Thesis › Fund Vault › Source Files | Fund-deck upload section in `app.investor.profile.tsx` (R4B) | b | |
| Thesis › Fund Vault › Digital Document Vault | Nowhere — no investor document vault exists | c | |
| Thesis › Fund Vault › Document Privacy Settings | Nowhere | c | |
| Thesis › Verification › Verifications | `VerificationSection` (investor mode) in profile sidebar | b | |
| Thesis › Verification › Claims | `investor_claims` attach-proof flow in profile | b | |
| Thesis › Badges › Badge Overview & Guide | `InvestorBadgesCard` in profile + `badge_definitions` | b | `app.badges.tsx` is founder-oriented; guide content reusable. |
| Thesis › Badges › Apply Badge | "Re-check" button in profile → `evaluateAndAwardBadges()` | c | Minimal page, same engine as founder side. |
| Thesis › Badges › Verification Tier Status | `VerificationSection` tiers + `verification_tiers` table, in profile | b | |
| Thesis › Capital Readiness › Cheque Size Confirmation | `CapitalVerificationSection` (`app.investor.profile.capital.tsx` — component file, not a route) | b | |
| Thesis › Capital Readiness › Investment Capacity Audit | Nowhere | c | |
| Discover › Public Investor Profile › Full Digital Profile View | `/i/$slug` owner-preview path (R4B) | b | In-app view page wrapping the existing preview. |
| Discover › Public Investor Profile › Profile Privacy Settings | `public_fields` whitelist section in `app.investor.profile.tsx` (R4B) | b | |
| Discover › Deal Flow | `app.investor.deal-flow.tsx` | a | |
| Discover › Deal Intake | `app.investor.intake.tsx` | a | |
| Discover › Watchlist | `app.investor.startups.tsx` | a | |
| CRM › Connections | `app.investor.connections.tsx` | a | |
| CRM › Pipeline Manager | `app.investor.decisions.tsx` (kanban pipeline) | a | Nav rename only. |
| CRM › Founder Meetings | `app.meetings.tsx` (shared with founder) | a | |
| CRM › CRM Analytics | Nowhere | c | Distinct from R5's `/app/investor/analytics` (that's the L2 leaf). |
| Deal Rooms › Deal Room | `app.investor.deal-rooms.tsx` | a | |
| Deal Rooms › Meetings Calendar | No room-scoped calendar | c | Same shape as founder side. |
| Deal Rooms › Diligence Notes | `app.investor.diligence.tsx` (`investor_dd_lite` checklists) | a | Investor's own notes/checklists — not counterparty deal content. |
| Deal Rooms › Team Assignments | Nowhere (`app.investor.team.tsx` is the team roster — a different concern) | c | |
| Deal Rooms › Reports Vault | Nowhere | c | Closed deals only, per §9.6. |
| Analytics | `app.investor.analytics.tsx` (R5) | a | |
| Team Chat | `app.messages.tsx` (already investor-whitelisted in AppShell) | a | Verify `team_channels` scoping works for investor accounts. |
| Settings | `app.investor.settings.tsx` | a | |

## Tally

Founder: 9 × (a) · 20 × (b) · 4 × (c) — Investor: 12 × (a) · 13 × (b) · 8 × (c)

## Decisions (from review, 2026-07-17)

1. **AI chat**: stays a slide-over panel, NOT a sitemap page. Its trigger moves to the header right corner next to the profile button — "Ask AI" with an AI icon. Modest UI polish of the panel in this pass; the full agentic-operator chat is explicitly later.
2. **Founder Achievements**: NOT app.wall.tsx. It's an achievements *editor* — add individual/team/company achievements that display on the digital profile and in deal rooms. Status (c), minimal build writing to `startup_profile_sections` (which already renders in the deal room's Digital Profiles section and carries visibility control). `app.wall.tsx` stays at `/app/wall`, unlisted.
3. **Orphans**:
   - `app.close.tsx` — confirmed superseded (it's a rooms-at-closing link list, no content of its own; per-room closing lives in R3's `/deal-rooms/:id/close`). **Delete**, redirect `/app/close` → `/app/deal-rooms`. Do not resurrect as /reports.
   - `app.investor.portfolio.tsx` — becomes investor **Deal Rooms › Portfolio** LEAF (status a).
   - `app.investor.analysis.tsx` — becomes investor **CRM › Deal Analysis** LEAF (status a).
   - `app.email.tsx` — confirmed CRM outreach tool → founder **CRM › Email Outreach** LEAF (status a).
   - `app.referrals.tsx` — new **Referrals** L2 entry above Settings, both roles (status a).
   - `app.audit.tsx` — folds into **Settings** as an Activity tab (Settings keeps internal tab structure per spec).
   - `app.profile-builder.tsx` — confirmed DIFFERENT from the sitemap's "Profile Builder" group (it's the AI onboarding wizard entered from auth.callback.tsx). Untouched, route stays alive.
   - Hub pages (`prepare`, `go-live`, `source`, `evaluate`, `decide`, `thesis`) — dissolve with redirects to nearest new section.
4. **Deal Prep Notes** — reframed: these are the user's OWN notes taken outside rooms (team-visible, prep for tracking multiple deals), NOT `deal_room_notes` content. No §9.6 conflict — user-authored content. Minimal build.
   **Reports Vault** — record box for closure reports of CLOSED rooms (allowed per §9.6's /reports rule), same page shape both roles, with explanatory text until the user has a closed-deal report. Minimal build.

## Open questions (resolved above — kept for history)

1. **The AI Advisor chat has no home in the target sitemap.** Today's `/app` (`app.index.tsx` FounderHome = chat + readiness cards) and `/app/assistant` ("Workstation" chat) are the founder's main AI surface; investor equivalents are `app.investor.assistant.tsx`/`app.investor.advisor.tsx`. The sitemap's "Workstation" is a pure group label with only Verifications + Claims children. Where does the chat live — an unlisted route kept as-is, or somewhere in this hierarchy?
2. **Founder "Achievements" → `app.wall.tsx`?** The Achievement Wall is the closest existing feature; if "Achievements" means editable profile bullets instead (like the investor side has), it's (c) not (a).
3. **Orphaned routes** not in the sitemap at all: `app.close.tsx` (step ④ of the current 4-step flow), `app.investor.portfolio.tsx`, `app.investor.analysis.tsx`, `app.email.tsx`, `app.audit.tsx`, `app.referrals.tsx`, `app.wall.tsx` (if not used for Achievements), `app.profile-builder.tsx` (AI onboarding builder — still entered from auth callback), the P4/P5 hub pages (`prepare`, `go-live`, `source`, `evaluate`, `decide`, `thesis`, `decide`). Proposal: keep their routes functional but unlisted, dissolve only the hub pages the new sidebar replaces. Confirm.
4. **§9.6 constraint acknowledged for the two new cross-room pages** (Deal Prep Notes, Reports Vault): outside `/deal-rooms/:id/*` they may render room name / counterparty / stage / timestamp + a link into the room, never note text or report content (Reports Vault additionally: closed deals only). Their minimal builds will follow that shape — flagging so the constraint on their usefulness is explicit up front.
