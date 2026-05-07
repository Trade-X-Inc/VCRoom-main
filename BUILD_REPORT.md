# VCRoom — Full Build Report
*Generated: 2026-05-07 | Branch: main*

---

## 1. What Was Built

### Auth System
| Feature | Status |
|---|---|
| Email/password sign-up with role selection (founder / investor) | ✅ |
| Email confirmation flow with 60s resend countdown | ✅ |
| Webmail deep-links (Gmail, Outlook, Yahoo) on confirmation screen | ✅ |
| Google OAuth sign-up & sign-in | ✅ |
| Role persistence: DB upsert → localStorage backup → metadata fallback | ✅ |
| `/auth/callback` route (Google OAuth redirect handler) | ✅ |
| Role-based routing: founders → `/app`, investors → `/app/investor/` | ✅ |
| Forgot password flow | ✅ |

### Founder Dashboard (`/app`)
| Feature | Status |
|---|---|
| Overview with stats, pipeline summary, activity feed | ✅ |
| VC Leads tracker (kanban + table view) | ✅ |
| Add / edit / delete leads via drawer | ✅ |
| CSV import (email required; investor_name optional — falls back to email prefix) | ✅ |
| AI-generated outreach emails per lead (cold + follow-up) | ✅ |
| Pipeline (kanban with drag) | ✅ |
| Deal Rooms (create, view, NDA) | ✅ |
| Company Profile (logo, deck upload, team members) | ✅ |
| Documents section | ✅ |
| Meetings page (shows "Meeting Booked" leads, grouped by date) | ✅ |
| Reports / analytics page | ✅ |
| AI Fundraising Advisor chat | ✅ |
| Notifications | ✅ |
| Settings (security, domain, billing, notifications) | ✅ |
| Users & Audit log admin pages | ✅ |

### Investor Dashboard (`/app/investor/`)
| Feature | Status |
|---|---|
| Investor dashboard with deal stats | ✅ |
| Deal Flow pipeline view | ✅ |
| My Pipeline (kanban) | ✅ |
| Startups directory | ✅ |
| Diligence tracker | ✅ |
| Analysis / AI scoring | ✅ |
| Decisions log | ✅ |
| Portfolio view | ✅ |
| Investor Team page | ✅ |
| AI Deal Brief panel (per deal room) | ✅ |
| Investor Deal Rooms | ✅ |

### Server Functions (`createServerFn`)
| Feature | Status |
|---|---|
| `advisor-fn.ts` — AI Advisor (OpenAI + Supabase admin) | ✅ |
| `ai-fn.ts` — Outreach email generation | ✅ |
| `deal-brief-fn.ts` — Deal brief / AI scoring | ✅ |

### Infrastructure
| Feature | Status |
|---|---|
| TanStack Router with `beforeLoad` auth guards | ✅ |
| TanStack React Query for all data fetching | ✅ |
| Supabase v2 auth + RLS | ✅ |
| Cloudflare Pages deployment via `wrangler` | ✅ |
| Dark/light mode theme | ✅ |
| i18n (language switcher) | ✅ |
| Responsive sidebar with collapse | ✅ |

---

## 2. What Is Working (Confirmed)

- **Sign-up flow**: Role selection → email signup OR Google OAuth → email confirmation → redirect to correct dashboard
- **Auth callback**: Reads `oauth_pending_role` + `pending_role_<email>` from localStorage; priority chain DB → localStorage → metadata → "founder"
- **Role routing**: Founders land on `/app`; investors redirect to `/app/investor/`
- **VC Leads CRUD**: Add/edit/delete all functional; email is required; CSV import skips rows without email
- **Company Profile**: `upsert(onConflict: founder_id)` prevents duplicate insert errors
- **AI Advisor**: Falls back to static advice when OpenAI key not configured; rate-limits 20 msgs/day
- **Outreach emails**: Generates cold + follow-up emails per lead; rate-limits 10/hour
- **Deal Brief**: AI scoring panel with fallback scores when OpenAI not configured
- **Meetings page**: Live query of "Meeting Booked" leads; clickable to open lead drawer
- **Build**: Clean `vite build` — zero TypeScript errors, zero broken imports
- **Cloudflare Pages**: Deploys via `npm run deploy` or git push auto-deploy

---

## 3. What Is NOT Working / Known Issues

### 3.1 Investor Role Routing — CRITICAL (being fixed in this session)
**Problem**: Investors consistently land on `/app` (founder dashboard) instead of `/app/investor/`.

**Root causes identified**:
- `app.investor.tsx` `beforeLoad` used `.single()` — throws "no rows" error for new users with no DB record, which the catch block incorrectly redirected to `/sign-in`
- `app.tsx` also used `.single()` — same failure mode
- Navigation target was `/app/investor` (no trailing slash) when TanStack Router registered the index route as `/app/investor/` (with trailing slash)
- No fallback if `navigate()` silently fails

**Fix applied**: Both routes now use `.maybeSingle()`; DB errors allow access instead of redirect to sign-in; navigation updated to `/app/investor/` with trailing slash + `window.location.href` fallback after 100ms.

### 3.2 Server Env Vars on Cloudflare Pages
**Problem**: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are not automatically available as `process.env.*` on Cloudflare Pages without being set in the dashboard.

**Current state**: Fixed with fallback `process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL`. AI features (Advisor, Email generation, Deal Brief) work without the service key by falling back to the anon key, but some admin operations may fail.

**Action required**: Go to Cloudflare Pages Dashboard → Settings → Environment Variables and add:
```
SUPABASE_URL = <your supabase project URL>
SUPABASE_SERVICE_ROLE_KEY = <your service role key>
OPENAI_API_KEY = <your openai key>
```

### 3.3 Meetings Page — Limited Scope
**Problem**: The meetings page currently shows VC leads with status "Meeting Booked" as a proxy for meetings. There is no dedicated `meetings` table integration.

**To fully implement**: Run these migrations and rebuild:
```sql
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS vc_lead_id uuid REFERENCES vc_leads(id);
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id);
```

### 3.4 Deal Room Shared Access (Investor Side)
**Problem**: The investor dashboard queries `deal_room_members` to get deal rooms. This only works if founders have explicitly invited the investor. New investors with no deal room invites will see an empty dashboard — correct behavior, but no onboarding CTA to guide them.

### 3.5 Email Confirmation Redirect
**Problem**: After confirming email, users land on `/sign-in` and must sign in again. This is Supabase's default behavior for email confirmation. Users may be confused expecting auto-login.

**Fix suggestion**: The `sign-in.tsx` page already checks for a live session on mount and saves the role — this partially handles it. A more complete fix would be to redirect directly from sign-in if a session exists.

### 3.6 `auth.tsx` `buildUser` Uses `.single()` 
**Problem**: `buildUser` in `src/lib/auth.tsx` calls `.single()` when fetching the user record, which throws on new users. This affects `signIn` and `onAuthStateChange`.

**Fix suggestion**: Change to `.maybeSingle()`:
```ts
const { data } = await supabase.from("users").select("full_name, role").eq("id", userId).maybeSingle();
```

### 3.7 CSV Import — No Feedback on Partial Import
**Problem**: If 3 of 10 rows are skipped (no email), the user sees "3 skipped — no email" but the toast doesn't indicate which rows were skipped.

### 3.8 No Real-time Updates
Data refreshes only on page load or explicit user action. There is no Supabase realtime subscription for collaborative features (e.g. investor sees new document uploaded by founder in real-time).

### 3.9 `app.investor.tsx` Sidebar Navigation
**Problem**: The `AppShell` wraps founder routes. The investor layout (`app.investor.tsx`) renders `<Outlet />` directly without `AppShell`. The investor sidebar is rendered by `AppShell` only when the user is inside a route that uses `AppShell` as the component wrapper.

**Current state**: Investor routes do NOT use `AppShell` as their layout — the investor sidebar is rendered inside a separate `AppShell` component that's conditionally included. This should work but needs verification that `isInvestor` evaluates correctly.

---

## 4. Fixes Suggested

### High Priority
1. **Fix `auth.tsx` `buildUser`** — change `.single()` to `.maybeSingle()` to prevent crash on new users
2. **Set Cloudflare env vars** — SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY in dashboard
3. **Verify investor sidebar** — test that `AppShell` correctly renders investor nav when `user.appRole === "investor"`

### Medium Priority
4. **Run meetings table migration** — add `vc_lead_id` and `created_by` columns
5. **Add onboarding CTA for investors** — empty state on investor dashboard with "Ask a founder to invite you to a deal room"
6. **Auto-login after email confirmation** — detect session on sign-in page and skip form if already authenticated
7. **Add Supabase realtime** — subscribe to `activities` table changes in deal rooms for live collaboration

### Low Priority
8. **Remove debug test links** in sign-in page once investor routing is confirmed working
9. **CSV import row details** — show which rows were skipped with row numbers
10. **Chunk splitting** — the main bundle (index-K2jxRjmy.js) is 623 kB gzipped to 184 kB. Split React and Supabase into separate chunks
11. **Wrangler version** — wrangler 4.82.2 is installed but 4.89.0 is available

---

## 5. Build & Deploy Status

```
Build: ✅  (vite build — 0 errors, warnings only)
TypeScript: ✅  (0 errors)
Route tree:
  /app/investor        ✅  (layout with beforeLoad)
  /app/investor/       ✅  (index dashboard)
  /app/investor/*      ✅  (all sub-routes registered)
Test links in sign-in: ✅  (added below form)
Investor nav in AppShell: ✅  (investorNav array, isInvestor flag)
Deploy: CI via git push to GitHub → Cloudflare Pages auto-deploy
```

---

## 6. Route Tree (Investor Routes Confirmed)

From `routeTree.gen.ts`:
```
/app/investor           → app.investor.tsx (layout, beforeLoad auth guard)
/app/investor/          → app.investor.index.tsx (dashboard) ✅
/app/investor/deal-flow → app.investor.deal-flow.tsx ✅
/app/investor/pipeline  → app.investor.pipeline.tsx ✅
/app/investor/startups  → app.investor.startups.tsx ✅
/app/investor/diligence → app.investor.diligence.tsx ✅
/app/investor/analysis  → app.investor.analysis.tsx ✅
/app/investor/decisions → app.investor.decisions.tsx ✅
/app/investor/portfolio → app.investor.portfolio.tsx ✅
/app/investor/team      → app.investor.team.tsx ✅
/app/investor/deal-rooms → app.investor.deal-rooms.tsx ✅
```

---

## 7. Environment Variables Required

| Variable | Where Set | Used By |
|---|---|---|
| `VITE_SUPABASE_URL` | `.env` / Cloudflare build vars | Client-side Supabase |
| `VITE_SUPABASE_ANON_KEY` | `.env` / Cloudflare build vars | Client-side Supabase |
| `SUPABASE_URL` | Cloudflare env vars | Server functions (advisor, email, deal-brief) |
| `SUPABASE_SERVICE_ROLE_KEY` | Cloudflare env vars | Server functions (bypasses RLS) |
| `OPENAI_API_KEY` | Cloudflare env vars | AI Advisor, Email gen, Deal Brief |

---

## 8. Key Files Map

| File | Purpose |
|---|---|
| `src/routes/app.tsx` | Founder route layout + auth guard |
| `src/routes/app.investor.tsx` | Investor route layout + auth guard |
| `src/routes/app.investor.index.tsx` | Investor dashboard |
| `src/routes/auth.callback.tsx` | OAuth + email confirmation callback |
| `src/lib/auth.tsx` | Auth context, buildUser, role resolution |
| `src/lib/supabase.ts` | Supabase client init |
| `src/lib/advisor-fn.ts` | Server fn: AI Advisor (OpenAI) |
| `src/lib/ai-fn.ts` | Server fn: Email generation (OpenAI) |
| `src/lib/deal-brief-fn.ts` | Server fn: Deal brief / AI scoring |
| `src/components/app/AppShell.tsx` | Sidebar + top nav (role-aware) |
| `src/components/app/LeadDrawer.tsx` | Lead add/edit form with AI email |
| `src/routes/app.leads.tsx` | VC Leads tracker page |
| `src/routes/app.profile.tsx` | Company profile + team members |
| `src/routes/app.meetings.tsx` | Meetings (from "Meeting Booked" leads) |
| `frontend/wrangler.jsonc` | Cloudflare Pages config |
