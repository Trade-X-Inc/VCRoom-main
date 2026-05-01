# Venture Room Project Cleanup Plan

## Scope Guardrails
- `frontend/` should be the only UI/UX source of truth.
- Folder has been renamed from `forntend/` to `frontend/`.
- Do not delete anything until parity is confirmed and migration checkboxes are complete.

## Phase 1 - Architecture Decision

### Current state
- UI surface A: `frontend/` (TanStack Start + Vite + file-based routes).
- UI surface B: `app/` + `components/` (Next.js App Router pages/layouts).
- UI surface C: root `*.tsx` pages/components (legacy React-style UI files).
- Backend/API currently lives in Next server files (`app/api/*`, `app/actions/*`, `middleware.ts`), not in `frontend/`.

### Frontend framework + run commands (verified from `frontend/package.json`)
- Framework: TanStack Start with Vite (`@tanstack/react-start`, `@tanstack/react-router`).
- Install: `cd frontend && npm install`
- Dev: `cd frontend && npm run dev`
- Build: `cd frontend && npm run build`
- Lint: `cd frontend && npm run lint`
- Typecheck: no script currently defined.

### Rename status (`forntend/` -> `frontend/`)
- Completed: folder renamed to `frontend/`.
- Follow-up still needed:
  - [ ] Update any remaining docs/scripts that mention `forntend`.
  - [ ] Verify deploy config (`wrangler.jsonc`) and CI (when added) use `frontend/`.

### Backend direction decision
- Next backend routes/actions are still required right now for:
  - Supabase admin actions (`app/actions/*.ts`)
  - OpenAI endpoints (`app/api/ai/*`)
  - auth cookie middleware (`middleware.ts`)
- Recommendation for launch:
  - Keep backend logic, but decouple from Next UI surface.
  - Move backend into standalone API layer (preferred) or keep temporary Next server-only package while UI migrates to TanStack.
  - Do not remove backend before `frontend` route handlers/services consume equivalent endpoints.

## Phase 2 - Feature Parity Matrix

Status legend used below:
- `keep`: canonical in TanStack frontend.
- `migrate`: source exists outside frontend and should be ported.
- `duplicate`: same/near-same feature exists in frontend.
- `delete later`: remove after parity + smoke tests.
- `missing from frontend`: no equivalent found yet.

### A) UI pages in `app/` (Next App Router)

- `app/(marketing)/page.tsx` -> `duplicate` (mapped to `frontend/src/routes/index.tsx`) -> `delete later`
- `app/(marketing)/pricing/page.tsx` -> `duplicate` (mapped to `frontend/src/routes/pricing.tsx`) -> `delete later`
- `app/(marketing)/founders/page.tsx` -> `duplicate` (mapped to `frontend/src/routes/founders.tsx`) -> `delete later`
- `app/(marketing)/investors/page.tsx` -> `duplicate` (mapped to `frontend/src/routes/investors.tsx`) -> `delete later`
- `app/(marketing)/about/page.tsx` -> `missing from frontend` -> `migrate`
- `app/(marketing)/contact/page.tsx` -> `missing from frontend` -> `migrate`
- `app/(marketing)/features/page.tsx` -> `partially covered by solutions pages` -> `migrate`
- `app/(auth)/login/page.tsx` -> `duplicate` (mapped to `frontend/src/routes/sign-in.tsx`) -> `delete later`
- `app/(auth)/signup/page.tsx` -> `duplicate` (mapped to `frontend/src/routes/sign-up.tsx`) -> `delete later`
- `app/(app)/deal-rooms/[id]/page.tsx` -> `duplicate` (mapped to `frontend/src/routes/app.deal-room.$id.tsx`) -> `delete later`
- `app/(app)/founder/overview/page.tsx` -> `partially mapped` (`app.index.tsx`) -> `migrate`
- `app/(app)/founder/deal-rooms/page.tsx` -> `duplicate` (`app.deal-rooms.tsx`) -> `delete later`
- `app/(app)/founder/messages/page.tsx` -> `duplicate` (`app.messages.tsx`) -> `delete later`
- `app/(app)/founder/meetings/page.tsx` -> `duplicate` (`app.meetings.tsx`) -> `delete later`
- `app/(app)/founder/documents/page.tsx` -> `duplicate` (`app.documents.tsx`) -> `delete later`
- `app/(app)/founder/investor-pipeline/page.tsx` -> `duplicate` (`app.pipeline.tsx`) -> `delete later`
- `app/(app)/founder/ai-advisor/page.tsx` -> `duplicate` (`app.advisor.tsx`) -> `delete later`
- `app/(app)/founder/startup-profile/page.tsx` -> `duplicate` (`app.profile.tsx`) -> `delete later`
- `app/(app)/founder/settings/page.tsx` -> `partially covered` (`app.settings.notifications.tsx`) -> `migrate`
- `app/(app)/founder/tasks/page.tsx` -> `missing from frontend` -> `migrate`
- `app/(app)/investor/deal-pipeline/page.tsx` -> `duplicate` (`app.pipeline.tsx`) -> `delete later`
- `app/(app)/investor/deal-rooms/page.tsx` -> `duplicate` (`app.investor.deal-rooms.tsx`) -> `delete later`
- `app/(app)/investor/ai-analysis/page.tsx` -> `duplicate` (`app.investor.analysis.tsx`) -> `delete later`
- `app/(app)/investor/due-diligence/page.tsx` -> `duplicate` (`app.investor.diligence.tsx`) -> `delete later`
- `app/(app)/investor/decision-board/page.tsx` -> `duplicate` (`app.investor.decisions.tsx`) -> `delete later`
- `app/(app)/investor/startup-profiles/page.tsx` -> `duplicate` (`app.investor.startups.tsx`) -> `delete later`
- `app/(app)/investor/document-requests/page.tsx` -> `missing from frontend` -> `migrate`
- `app/(app)/investor/investment-notes/page.tsx` -> `missing from frontend` -> `migrate`
- `app/(app)/investor/team-review/page.tsx` -> `missing from frontend` -> `migrate`
- `app/(app)/investor/meetings/page.tsx` -> `duplicate` (`app.meetings.tsx`) -> `delete later`
- `app/(app)/investor/settings/page.tsx` -> `partially covered` (`app.settings.notifications.tsx`) -> `migrate`

### B) UI pages in root `*.tsx` files

Primary root page-like files:
- `Landing.tsx` -> `duplicate` (`frontend/src/routes/index.tsx`) -> `delete later`
- `Dashboard.tsx` -> `migrate` (decide founder/investor landing split) -> `delete later`
- `DealRoom.tsx` -> `duplicate` (`frontend/src/routes/app.deal-room.$id.tsx`) -> `delete later`
- `DealRooms.tsx` -> `duplicate` (`frontend/src/routes/app.deal-rooms.tsx`) -> `delete later`
- `Documents.tsx` -> `duplicate` (`frontend/src/routes/app.documents.tsx`) -> `delete later`
- `Messages.tsx` -> `duplicate` (`frontend/src/routes/app.messages.tsx`) -> `delete later`
- `Meetings.tsx` -> `duplicate` (`frontend/src/routes/app.meetings.tsx`) -> `delete later`
- `Pipeline.tsx` -> `duplicate` (`frontend/src/routes/app.pipeline.tsx`) -> `delete later`
- `Profile.tsx` -> `duplicate` (`frontend/src/routes/app.profile.tsx`) -> `delete later`
- `AI.tsx` -> `duplicate` (`frontend/src/routes/app.advisor.tsx`) -> `delete later`
- `DueDiligence.tsx` -> `duplicate` (`frontend/src/routes/app.investor.diligence.tsx`) -> `delete later`
- `Decision.tsx` -> `duplicate` (`frontend/src/routes/app.investor.decisions.tsx`) -> `delete later`
- `Overview.tsx` -> `migrate` (not explicit as separate route) -> `delete later`
- `Settings.tsx` -> `migrate` (frontend has notifications-only settings route) -> `delete later`
- `StartupView.tsx` -> `duplicate` (`frontend/src/routes/app.investor.startups.tsx`) -> `delete later`
- `Tasks.tsx` -> `missing from frontend` -> `migrate`

Root wrappers/components (not pages, but UI code outside source-of-truth):
- `App.tsx`, `ThemeProvider.tsx`, `ProgressBar.tsx`, `ImageWithFallback.tsx`, `main.tsx`, `use-mobile.ts`, `utils.ts` -> `migrate if used` else `delete later`
- root primitive files (`accordion.tsx` ... `tooltip.tsx`) -> `duplicate` of `frontend/src/components/ui/*` -> `delete later`

### C) UI pages in `frontend/` (target canonical set)

Keep as canonical:
- `frontend/src/routes/index.tsx`
- `frontend/src/routes/pricing.tsx`
- `frontend/src/routes/founders.tsx`
- `frontend/src/routes/investors.tsx`
- `frontend/src/routes/sign-in.tsx`
- `frontend/src/routes/sign-up.tsx`
- `frontend/src/routes/forgot-password.tsx`
- `frontend/src/routes/join.$token.tsx`
- `frontend/src/routes/app.tsx`
- `frontend/src/routes/app.index.tsx`
- `frontend/src/routes/app.deal-rooms.tsx`
- `frontend/src/routes/app.deal-room.$id.tsx`
- `frontend/src/routes/app.documents.tsx`
- `frontend/src/routes/app.messages.tsx`
- `frontend/src/routes/app.meetings.tsx`
- `frontend/src/routes/app.pipeline.tsx`
- `frontend/src/routes/app.profile.tsx`
- `frontend/src/routes/app.advisor.tsx`
- `frontend/src/routes/app.investor.index.tsx`
- `frontend/src/routes/app.investor.deal-rooms.tsx`
- `frontend/src/routes/app.investor.analysis.tsx`
- `frontend/src/routes/app.investor.diligence.tsx`
- `frontend/src/routes/app.investor.decisions.tsx`
- `frontend/src/routes/app.investor.startups.tsx`
- `frontend/src/routes/app.settings.notifications.tsx`
- `frontend/src/routes/app.notifications.tsx`
- `frontend/src/routes/app.reports.tsx`
- `frontend/src/routes/app.audit.tsx`
- `frontend/src/routes/app.email.tsx`
- `frontend/src/routes/app.users.tsx`
- `frontend/src/routes/app.leads.tsx`
- `frontend/src/routes/solutions.vc-deal-room.tsx`
- `frontend/src/routes/solutions.investor-pipeline.tsx`
- `frontend/src/routes/solutions.raise-1m.tsx`
- `frontend/src/routes/solutions.fundraising-crm.tsx`
- `frontend/src/routes/solutions.due-diligence.tsx`

Cleanup in canonical frontend:
- `frontend/src/routes/test.tsx` -> `delete later` (route warning: no `Route` export)

## Migration/Delete Checklist (must complete before any deletion)

- [ ] Freeze non-frontend UI changes (`app/**`, root UI files).
- [x] Rename `forntend/` to `frontend/`.
- [ ] Port missing routes: about/contact/features/tasks/document-requests/investment-notes/team-review/full settings.
- [ ] Map and migrate any reusable logic from `app/(app)` pages to `frontend/src/routes/*`.
- [ ] Migrate any still-used shared components from root to `frontend/src/components/*`.
- [ ] Replace frontend API calls to use chosen backend architecture (temporary Next backend or standalone API).
- [ ] Run smoke tests on auth, deal rooms, docs upload, messaging, AI memo/summary.
- [ ] Only after green smoke tests, delete duplicate UI surfaces:
  - `app/**` UI pages/layouts
  - root page files and root primitive component set
  - old style files not used by frontend
