# Hockystick — Status

Last updated: 2026-07-15 (main @ `a364c02`)

This file is for a cold pickup on Monday. It summarizes what's shipped and
merged to `main`, what's known-deferred, and what's next per the plan.

## Shipped and merged to `main`

- **R1 — Design Constitution.** Reversed the July gradient/whitespace system:
  flat `#7C3AED` (buttons, active nav, links, focus rings only), 0px radius
  on structural elements, DM Sans body font, Syne headings, `#E4E4E7`
  borders over shadows. Rewrote `CLAUDE.md` §9 as the source of truth,
  rewrote `design-tokens.ts`/`styles.css`, fixed the `rgba(0,0,0,0.35)`
  muted-token contrast bug across every wizard page.
- **R2a — De-shim.** Reversed the P4/P5 redirect-shim pattern for the 16
  routes named in `UI_MIGRATION_MAP.md` — each now mounts its real
  component at its own URL instead of bouncing into a wizard-page
  accordion. Flat sidebar, auth-aware logo.
- **R2b — PageFrame + real sidebar.** Added the shared `PageFrame` component
  (breadcrumb → H1 + description → actions → content, 1360px max-width).
  Applied it to the 5 wizard summary pages and added breadcrumbs to the 12
  already-compliant de-shimmed routes. Rebuilt the global sidebar
  (`AppShell.tsx`) with real nested parent/child navigation groups.
- **R3 — Deal-room split.** Split the 7,377-line `app.deal-room.$id.tsx`
  mega-file into 9 real sub-routes under `/app/deal-rooms/:id/*`
  (overview, information, documents, qa, diligence, term-sheets, close,
  activity, nda), sharing room/membership/NDA state via one
  `useDealRoomContext()` call wrapped in a React Context at the layout
  level. Found and fixed two structural bugs along the way: a missing
  `<Outlet/>` on the deal-rooms list page that silently swallowed all `$id`
  children, and a code-splitting bug where the layout and its children got
  separate module evaluations of the same shared Context. Standardized on
  the plural `/app/deal-rooms/:id` path everywhere; deleted the old
  singular route once all 8 tabs were verified working.
- **R4B — Investor profile + mutual disclosure.** Rebuilt
  `/app/investor/profile` on PageFrame with AI fund-deck-upload prefill
  (draft-and-confirm, never auto-published) and a verifiable track-record
  section. Enforced a `public_fields` whitelist at the query layer for the
  public `/i/:slug` profile (also fixed a pre-existing bug where that page
  was silently broken for logged-out visitors — no anon RLS policy
  existed). Built the mutual-disclosure block on the deal-room Information
  tab (locked/unlocked by room stage). The mandatory security verification
  pass caught a real cross-room profile leak in the first RLS fix attempt
  — a founder/investor pair sharing two rooms, one locked and one unlocked,
  could read the private profile via the unlocked room even while viewing
  the locked one. Fixed with a proper room-scoped
  `deal_room_profile_disclosures` table kept in sync by a DB trigger,
  re-verified with three direct-SQL attack tests.
- **R5 — Overview + analytics.** Rebuilt `/app/overview` and
  `/app/investor/overview` (the real post-login landing targets per
  `auth.callback.tsx`, previously just bounce-redirects) on PageFrame with
  real data — readiness score, profile views, deal-room engagement,
  "needs attention" tables, recharts graphs, activity rails with a safe-label
  allowlist. Replaced all fake/hardcoded UI values found in the old pages
  (fake "Reply rate," fake raise-progress bar, hardcoded AI Advisor
  suggestions, hardcoded "AI Weekly Brief") with real queries or proper
  empty states. Built two new routes, `/app/analytics` and
  `/app/investor/analytics`, wired into the sidebar. The security check
  caught a real gap of its own — the founder's Document Performance table
  wasn't scoped to the founder's own uploads, so an investor-uploaded
  document's filename could have leaked onto the founder's page — fixed by
  filtering on `uploader_id`.

## Known deferred items (found, not fixed — not urgent)

- **Fake/hardcoded UI values**: none remaining in the pages R5 touched
  (`/app/overview`, `/app/investor/overview`, both new analytics routes) —
  all were found and replaced during R5. Not checked exhaustively outside
  that scope; the real `/app` and `/app/investor` home pages (distinct from
  the `/overview` pages) were not part of R5's audit.
- **`profile_checklists` table** — 0 rows across every user, superseded by
  `readiness_snapshots` (399 rows, the actually-populated and
  actually-displayed readiness system, used by both `/app` and the new
  `/app/overview`). `ProfileChecklist.tsx`/`profile-checklist-fn.ts` are
  live code paths that read from this dead table. Safe to drop the table
  and retire the component later — not urgent, nothing currently reads a
  broken result from it, it just never gets populated.
- **`.hs-gradient` class-name cleanup (from R1)** — R1 repointed
  `.hs-gradient`/`.hs-gradient-static`/`.hs-gradient-text` to paint flat
  `#7C3AED` instead of an actual gradient, but kept the old class names as
  aliases so ~54 files using them wouldn't break. The classes work
  correctly today; the names are just misleading. A rename sweep (or a
  codemod) would be pure cleanup, no visual change.
- **`app.settings.tsx` conditional-Outlet pattern (flagged during R3)** —
  `app.settings.tsx` renders `path === "/app/settings" ? <ProfileSettings />
  : <Outlet />` to let one layout route serve both its own default content
  at the index path and its children elsewhere. This works, and R3 modeled
  the deal-rooms layout fix on understanding it, but it's a slightly
  unusual routing pattern worth knowing about before extending
  `app.settings.tsx` or copying the pattern elsewhere.

## What's next per the plan

- **R6** — favicon, dead-space, and accessibility sweep.
- **R7** — landing page rebuild + vault scroll animation.
- **R8** — final QA gate before wider release.

## Verification (this session)

- `main` fast-forward-merged both `r4b-investor-profile-disclosure` (already
  at `main`'s tip — no-op) and `r5-overview-analytics` (clean fast-forward,
  no conflicts) — both branches shared the same fork point on `main`.
- `tsc --noEmit`: 68 errors, matching the pre-existing baseline exactly (no
  regressions from either merge).
- `vite build`: succeeds, all route chunks reasonably sized.
- Pushed to `origin/main` — final commit `a364c02`.
- Working tree clean except one pre-existing untracked file,
  `test-results/.last-run.json` (stale Playwright metadata dated July 1,
  predating this session — not source, left alone rather than guessed at).
