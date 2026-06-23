# Hockystick — AI Developer Rules

This file is for any future Claude Code session working on this repo. Read it before starting any build. It is the condensed, engineering-facing companion to `Hockystick_AI_First_Architecture_Plan.docx`. If something here conflicts with that doc, the doc wins — update this file to match.

---

## 1. The one rule

A feature is either:
- **(a) a tool the AI agent can call**, with a defined permission and a defined confirm-first/immediate rule, or
- **(b) a page explicitly listed as staying human-driven** (Deal Rooms, the 8 financial tools, public profile/CV, the Roast session itself)

There is no third category. If you're about to build something that doesn't fit either bucket, stop and ask before writing code.

---

## 2. Two agents, never one

- **Founder Agent** — own system prompt, own tool registry, own context. Never sees investor data except through Deal Room shared tools.
- **Investor Agent** — own system prompt, own tool registry, own context. Never sees another investor's pipeline or another founder's private data except through Deal Room shared tools.
- They share: the same model router (OpenRouter/OpenAI), the same rate-limit functions (`check_ai_rate_limit`, `check_and_increment_ai_usage` — already exist in Supabase, reuse them, do not rebuild).
- They do not share: system prompt, tool list, conversation context.

**Never merge these into one branching agent**, even if it looks simpler. This was explicitly decided against.

---

## 3. Confirm-first rule (no exceptions)

A tool executes immediately if it only touches the calling user's own draft/private state (saving a field, fetching a score, parsing a paste, reading their own data).

A tool **always** renders a confirmation card and waits for an explicit click if its effect is visible to another party: approving/declining access, submitting a deal decision, sending a team invite, creating a deal room, changing someone's role, starting a paid Roast.

If you're unsure which bucket a new tool falls into: if another human besides the caller would see a change because of this action, it's confirm-first.

---

## 4. Where things live (current file map — verify against actual repo before assuming)

| Concern | Pattern |
|---|---|
| Founder AI Advisor | Becomes the base of the Founder Agent — extend, don't replace |
| Investor AI Advisor | Becomes the base of the Investor Agent — extend, don't replace |
| Profile builder | `app.profile-builder.tsx`, `profile_builder_sessions` table — becomes `run_profile_builder()` tool |
| Investor intake | `app.investor.intake.tsx`, `investor_intake_batches`/`investor_intake_candidates` — becomes `parse_intake_batch()` tool |
| Roles/permissions | `frontend/src/lib/roles.ts` (`FOUNDER_PERMISSIONS`, `INVESTOR_PERMISSIONS`), `role_permissions` table — reuse for tool permission checks, do not invent a parallel system |
| Team identity | `startup_team_accounts`, `team_invites` — **never write `invited_by` into `user_id`**; always use the freshly-fetched session's own `auth.getUser().id` at accept time |
| Account context / shell routing | `useAccountContext` hook — determines AdminShell vs MemberShell |

---

## 5. Known historical bugs — do not reintroduce these patterns

1. **RLS self-reference recursion.** Never write an RLS policy on table X that queries table X from inside itself. Always use a `SECURITY DEFINER` function as the intermediary (see `is_startup_founder`, `get_investor_startup_ids`, `get_user_team_startup_ids`, `get_startup_team_user_ids` for the pattern).

2. **Team invite self-acceptance.** If the person clicking "Accept" on a `/join` link is already logged in as the inviter, block it explicitly and tell them to use a private window / different account. Always re-fetch the session fresh at accept time (`supabase.auth.getUser()`), never trust a hook's possibly-stale `user` object.

3. **Cloudflare env vars.** Secrets are read via `globalThis.__cf_env` at runtime, never `import.meta.env` (build-time only, doesn't work in Workers). `VITE_` prefix exposes to the browser bundle — never use for secrets.

4. **Grandfathering.** Any bulk account import or new gating mechanism (like the profile-completion gate) must insert a "confirmed/grandfathered" row for pre-existing accounts as part of the same migration — not as a follow-up fix.

5. **One Supabase auth listener only.** Multiple listeners cause 5-second lock timeouts.

---

## 6. Build sequence

```
Phase 0 — DONE: deprecated feature removal, profile-builder, intake parser, grandfathering
Phase 1 — Profile-completion gate + proactive nudges (build this first, it's the
          proof-of-concept for the whole tool-permission model)
Phase 2 — Chat-first shell redesign (AdminShell + MemberShell, both sides)
Phase 3 — Full tool registry rollout (read-only tools first, confirm-first last,
          Deal Room shared tools last of all)
Phase 4 — Roast as a chat-native flow (start_roast() tool)
Phase 5 — Monetization/credits/Stripe wiring (deferred until 1-4 are validated)
```

**Do not combine phases in one session.** Test and confirm each phase before starting the next.

---

## 7. Explicit non-goals (do not build these without revising the architecture doc first)

- No merged single agent
- No chat-only Deal Room
- No resurrecting Pipeline / Reports / VC Leads / Market News / Accelerators dashboard pages, as either pages or chat tools
- No confirm-first exceptions, ever, even for "obviously safe" cases
- No voice interface, no MCP server before Phase 4
- No pricing or gating on the verification badge itself — only the Roast hosting/participation fee is paid; outcome is always decided independently
- No investor email/CRM OAuth integration — intake is paste-your-own-data only, by design

---

## 8. Monetization gate

Every feature needs a clear monetization path before it gets built — either it drives subscription value, is directly paid (Roast fee), is metered (AI credits), or is the trust-layer moat (verification, kept free and merit-based on purpose). If a proposed feature has none of these, it doesn't get built yet, regardless of how good the idea is.

---

## 9. Dashboard Design System (production UI/UX reference)

This section exists because dashboard UI bugs (light backgrounds leaking into dark pages, inconsistent card styles, ad-hoc spacing) kept recurring across sessions. The brand system already exists and is documented in full in `/brand-guidelines.html` and `/brand-assets-reference.html` in the project — this section is the dashboard-specific subset every Claude Code build prompt must follow without re-deriving it.

**This is not a request for creative reinterpretation.** Unlike a marketing page or landing page (where the `frontend-design` skill's instruction to "take one aesthetic risk" applies), the dashboard is a production product with an established system. The job here is consistent execution of fixed tokens, not fresh creative direction per page.

### 9.1 Color tokens (hard rules, no substitutions)

```
--black:         #0A0A0B   (dashboard page background — never white/gray here)
--white:         #FAFAFA   (public/marketing page background only)
--purple-deep:   #3B0764
--purple-core:   #7C3AED   (primary brand color — buttons, active states, links)
--purple-mid:    #A855F7   (secondary accent, gradients)
--purple-light:  #D8B4FE   (rarely used, light-on-dark accents)
--purple-pale:   #F5F3FF   (light theme only — callout backgrounds)
--green-accent:  #10B981   (success, positive states, "verified" badges, checkmarks)
--gray-900:      #111827
--gray-700:      #374151
--gray-500:      #6B7280
--gray-300:      #D1D5DB
--gray-100:      #F3F4F6

Dashboard-specific surface colors (not in brand doc, established in-app):
--card-bg:        #111114   (card/panel background on dark dashboard)
--card-bg-hover:  #18181C
--card-border:    rgba(255,255,255,0.08)
--card-border-hover: rgba(124,58,237,0.3)
--text-primary:   #FFFFFF
--text-secondary: rgba(255,255,255,0.5)
--text-muted:     rgba(255,255,255,0.25)
--warning-amber:  #F59E0B   (missing field warnings, limit-reached states)
--error-red:      #EF4444
```

**The rule that gets violated most often:** every page inside `/app/*` (AdminShell or MemberShell) uses `--black` (#0A0A0B) as its root background. Every page outside the dashboard that needs a dark theme (e.g. `/join`, `/cv/$slug`) must explicitly set `background: #0A0A0B` since it renders outside AppShell and has no inherited background — it will default to white otherwise. This exact bug has shipped more than once. Before any new page ships, confirm which category it's in and that its background matches.

### 9.2 Typography

```
Display font: 'Syne', sans-serif       — weights 400/500/600/700/800
Body font:    'DM Sans', sans-serif    — weights 300/400/500, italic 300

Usage:
- Syne 800: page titles, hero numbers, logo wordmark
- Syne 700: card headers, section titles
- Syne 600: small labels, badges, eyebrow text (uppercase, letter-spacing 0.1-0.15em)
- DM Sans 400: body text, descriptions
- DM Sans 300: secondary/muted text, subtitles
- DM Sans 500: button labels, emphasized inline text
```

Never substitute a different font pairing for dashboard pages. Syne/DM Sans is fixed brand identity, not a per-page creative choice.

### 9.3 Component patterns already established (reuse, don't reinvent)

**Card:**
```css
background: #111114;
border: 1px solid rgba(255,255,255,0.08);
border-radius: 12px;
padding: 20px 24px;
/* hover state, if interactive: */
border-color: rgba(124,58,237,0.3);
background: #18181C;
```

**Primary button:**
```css
background: #7C3AED;
color: #fff;
border-radius: 8px;
padding: 10px 24px;
font-weight: 600;
font-size: 14px;
```

**Locked/restricted feature state** (established pattern, reuse exactly):
```
40x40 icon box, background rgba(124,58,237,0.1), border-radius 8px, lock icon
Title: white, 600 weight, 14px
Subtext: rgba(255,255,255,0.4), 13px, explains what role/plan unlocks it
```

**Badge/status pill colors:**
```
Success / verified / strong fit:  background rgba(16,185,129,0.12), text #10B981
Warning / limit reached / amber:  background rgba(245,158,11,0.12), text #F59E0B
Neutral / muted / low fit:        background rgba(255,255,255,0.06), text rgba(255,255,255,0.4)
Error / declined:                 background rgba(239,68,68,0.12), text #EF4444
```

**Callout/info box** (used for "one thing to do," tips, warnings):
```css
background: rgba(124,58,237,0.06);  /* or matching color at 6% opacity */
border: 1px solid rgba(124,58,237,0.2);
border-radius: 8px;
padding: 16px 20px;
```

### 9.4 Imagery and iconography rules (from brand-guidelines.html)

- Icon set: Lucide icons only, for consistency with the rest of the app — never mix icon libraries
- No stock photo clichés, no clipart, no cartoon illustrations anywhere in-product
- Charts: dark background, purple as primary data color, green for positive signals, never pie charts — bar or line only
- Gradients: purple radial only, max 2 colors, max 30% opacity — never rainbow or off-brand colors
- Screenshots used anywhere in-product (onboarding, empty states, marketing): always dark mode, never light mode

### 9.5 Voice and copy rules (from brand-guidelines.html, applies to UI copy too)

- No exclamation marks, no passive voice, sentences under 20 words, no buzzwords
- Active voice: a button that says "Save changes" produces a result that says "Changes saved" — same verb throughout the flow
- Name things by what the person controls, not by how the system is built ("Team members," not "RBAC accounts")
- Errors state what happened and how to fix it, never apologize, never vague
- Empty states are an invitation to act, not just an absence notice ("No team members yet — invite someone to get started," not just "No data")

### 9.6 What every future Claude Code UI prompt should include

Reference this section explicitly: "Follow the dashboard design system in CLAUDE.md Section 9 — do not invent new colors, spacing, or component patterns. Reuse the existing card/button/badge/locked-feature patterns exactly as documented." This single line prevents the majority of styling drift and theme-mismatch bugs seen so far in this project.

---

## 10. Project Identity

App: Hockystick (no 'e') — Agentic VC deal flow platform
Live URL: https://hockystick.app
Cloudflare Pages project: vcroom-main
GitHub repo: Trade-X-Inc/VCRoom-main
Supabase project ID: ldimninnjlvxozubheib
Local path: /Users/macbookpro/VCROOM/VCRoom-main/frontend
Deploy command: cd /Users/macbookpro/VCROOM/VCRoom-main/frontend && npm run deploy

## 11. Stack

TanStack Start + Vite 7 + React 19 + TypeScript + Tailwind CSS v4 + Supabase + Cloudflare Pages

## 12. Critical Rules — NEVER VIOLATE

1. NEVER touch src/lib/auth.tsx
2. NEVER touch src/lib/supabase.ts
3. NEVER commit .env.local
4. NEVER commit dist/ folder
5. ALWAYS run npm run build before committing
6. ALWAYS use existing design tokens (no inline styles or hardcoded hex)
7. ALWAYS add enabled: !!user?.id to useQuery hooks
8. NEVER use bg-white or text-black inside dark dashboard routes (/app/*)
9. NEVER use prose-invert on public pages (light mode)
10. ALWAYS read secrets server-side via cfEnv, never client-side

## 13. Environment Variables

### How secrets work
scripts/patch-wrangler.mjs sets globalThis.__cf_env = {...env} on every request.

### Reading secrets in server functions (ALWAYS use this pattern)
```ts
const cfEnv = (globalThis as any).__cf_env || {};
const key = cfEnv.KEY_NAME || "";
```

### Cloudflare Secrets (encrypted, set in dashboard)
- SUPABASE_SERVICE_ROLE_KEY
- RESEND_API_KEY
- OPENAI_API_KEY
- ADMIN_SECRET_KEY
- RESEND_FROM_EMAIL
- NOTION_API_KEY
- HUBSPOT_PRIVATE_APP_TOKEN

### Plaintext vars (wrangler.jsonc)
- VITE_SUPABASE_URL=https://ldimninnjlvxozubheib.supabase.co
- VITE_SUPABASE_ANON_KEY=eyJhbGci...
- VITE_APP_URL=https://hockystick.app
- SUPABASE_URL=https://ldimninnjlvxozubheib.supabase.co
- VITE_GOOGLE_CLIENT_ID=1094004326767-...

### CRITICAL: Empty vars in wrangler.jsonc OVERRIDE Cloudflare dashboard variables
### Never add an empty key to wrangler.jsonc vars section

## 14. Key Files Reference

```
src/lib/auth.tsx                    — Auth context (DO NOT TOUCH)
src/lib/supabase.ts                 — Supabase client (DO NOT TOUCH)
src/lib/env.ts                      — getEnvVar() helper
src/lib/hubspot.ts                  — HubSpot CRM sync
src/lib/notion-blog.ts              — Notion → blog pipeline
src/lib/document-extractor.ts       — Client-side doc text extraction (PDF/DOCX/PPTX/XLSX)
src/lib/ai-secure-fn.ts             — Document AI summary + thesis alignment (reuse callOpenAI pattern)
src/lib/profile-builder-fn.ts       — Profile builder AI extraction + interview server fns
src/lib/intake-fn.ts                — Investor intake parser server fn (parseIntakeBatch)
src/lib/roles.ts                    — FOUNDER_PERMISSIONS, INVESTOR_PERMISSIONS, PERMISSION_LABELS
src/lib/email/resend.ts             — sendEmail() function
src/lib/email/templates.ts          — Email templates
src/lib/email/triggers.ts           — Email trigger server functions
src/lib/onboarding-chat-fn.ts       — Landing page AI chat
src/hooks/useAccountContext.ts      — AdminShell vs MemberShell routing hook
src/components/app/AppShell.tsx     — Sidebar + nav (founder + investor) — AdminShell
src/components/app/MemberShell.tsx  — Simplified sidebar for manager/analyst/viewer roles
src/components/app/AdminShell.tsx   — Thin re-export of AppShell
src/components/site/SiteFooter.tsx  — Newsletter signup
src/routes/__root.tsx               — Root layout + OG meta tags
src/routes/index.tsx                — Landing page
src/routes/auth.callback.tsx        — Post-auth handler (HubSpot sync + profile-builder redirect)
src/routes/app.tsx                  — AppLayoutRouter — chooses AdminShell vs MemberShell
src/routes/app.profile-builder.tsx  — Founder profile builder (path selector → upload or interview → confirm)
src/routes/app.investor.intake.tsx  — Investor intake parser (paste → AI extract → scored candidates)
src/routes/app.member.index.tsx     — Member overview page (/app/member/)
src/routes/blog.tsx                 — Blog layout (Outlet only)
src/routes/blog.index.tsx           — Blog list (Notion-powered)
src/routes/blog.$slug.tsx           — Blog article (Notion-powered)
src/routes/app.directory.tsx        — Directory (founders + investors)
src/routes/app.wall.tsx             — Achievement Wall
src/routes/app.settings.tsx         — Settings (profile, company, notifications)
src/routes/pricing.tsx              — Pricing page
scripts/patch-wrangler.mjs          — CF Worker env injection
public/_redirects                   — Cloudflare Pages redirects (301s for removed routes)
```

### Removed routes (do not recreate — 301 redirects exist in public/_redirects)
- app.news.tsx — Market News → redirects to /app
- app.pipeline.tsx — Pipeline → redirects to /app
- app.reports.tsx — Reports → redirects to /app
- app.leads.tsx / app.accelerators.tsx — redirects to /app

## 15. Design System

### Theme
- Dashboard (/app/*): DARK MODE — black backgrounds, white text
- Public pages (/blog, /, /pricing): LIGHT MODE — white backgrounds, dark text

### Colors
Primary brand: #7C3AED (purple-600)
Brand hover: #6D28D9 (purple-700)

### Tailwind tokens (ALWAYS use these, never hardcode hex)
- bg-brand, text-brand — purple primary
- bg-card, border-border/60 — dark card surfaces
- text-foreground — primary text
- text-muted-foreground — secondary text
- bg-accent — hover/secondary surface

### Dashboard cards (dark)
```
className="bg-card border border-border/60 rounded-xl"
```

### Public page cards (light)
```
className="bg-white border border-gray-200 rounded-xl"
```

### Buttons
Primary: bg-purple-600 hover:bg-purple-700 text-white
Secondary: border border-border/60 text-muted-foreground hover:text-foreground

### Typography
Headings: font-family: "Syne, sans-serif"
Body: DM Sans or system-ui

### Blog/article prose (light mode ONLY)
```
className="prose prose-lg max-w-none
  prose-headings:text-gray-900
  prose-p:text-gray-700
  prose-a:text-purple-600
  prose-strong:text-gray-900"
```
NEVER use prose-invert on public pages.

## 16. Architecture Patterns

### Server functions
```ts
export const myFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as { param: string })
  .handler(async ({ data }) => {
    const cfEnv = (globalThis as any).__cf_env || {};
    const key = cfEnv.SECRET_KEY || "";
    // ...
  });
```

### Supabase auth queries
```ts
const { data } = await supabase
  .from("table")
  .select("*")
  .eq("user_id", user.id);
```

### useQuery pattern
```ts
const { data } = useQuery({
  queryKey: ["key", user?.id],
  enabled: !!user?.id,        // ALWAYS required
  queryFn: async () => { ... }
});
```

### HubSpot sync (fire-and-forget, never block user)
```ts
import { upsertHubSpotContact } from "~/lib/hubspot";
upsertHubSpotContact(email, { user_type: "founder" }).catch(() => {});
```

### AI server functions (key reading)
```ts
const cfEnv = (globalThis as any).__cf_env || {};
const openaiKey = cfEnv.OPENAI_API_KEY ||
                  cfEnv.OPEN_AI_API_KEY ||
                  cfEnv["OPEN AI API KEY"] || "";
if (!openaiKey) {
  console.error("[AI] No OpenAI key");
  return { reply: "AI unavailable", error: "no key" };
}
```

### AI JSON response parsing (ALWAYS use this)
```ts
const raw = data.choices?.[0]?.message?.content || "";
const cleaned = raw
  .replace(/^```json\s*/i, "")
  .replace(/^```\s*/i, "")
  .replace(/```\s*$/i, "")
  .trim();
try {
  return JSON.parse(cleaned);
} catch {
  return { summary: cleaned, parsed: false };
}
```

## 17. Known Issues & Hard-Won Lessons

### Auth
- NEVER add multiple Supabase auth listeners — causes 5000ms timeout errors
- Consolidate to single source of truth in auth.tsx
- Google OAuth shows "supabase.co" domain — expected, fixed only with Supabase Pro custom auth domain

### Cloudflare Workers
- import.meta.env NOT available at runtime in server functions — use cfEnv
- Empty vars in wrangler.jsonc OVERRIDE dashboard secrets — keep wrangler.jsonc clean
- __cf_env is injected by scripts/patch-wrangler.mjs on every request

### Supabase RLS
- RLS policies allowing deal room members to read other members' rows caused infinite recursion
- Test all new RLS policies carefully — cascading 500 errors are hard to debug
- Soft-delete preferred: set deal_room_id to null rather than hard-deleting

### Blog (Notion-powered)
- blog.tsx is layout only (renders <Outlet />)
- blog.index.tsx is the list page
- blog.$slug.tsx is the article page
- Status filter uses SELECT type: { property: "Status", select: { equals: "Published" } }
- Date property: page.properties["Publish Date"]?.date?.start
- Cover image: page.properties["Cover Image URL"]?.url

### Document extraction
- ArrayBuffer must be cloned before passing to pdfjs: buf.slice(0)
- pdfjs worker: new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url)
- Runs entirely client-side — no server involvement

### News feed (removed from nav — data pipeline still exists)
- Hacker News: direct Firebase API, no CORS issues
- RSS feeds: use allorigins CORS proxy or server-side fetch
- RSS2JSON free tier rate-limited — prefer server-side fetch

## 18. Notion Databases
- Blog CMS: 8a99a69aa1a2422d81fe4b9149a68024
- Social Media Calendar: b8d80e7170cb4eeeaced399bb62f38a2
- Market Research DB: dce29ad7ce7741fa87c4184e3c975e49
- Writing Rules: 37061976-2262-8185-bad1-d054ff00220d
- Email Templates: 37161976-2262-81da-8fde-e6b3c581213d

## 19. HubSpot
Portal ID: 148593751
Owner ID: 93128794
Region: EU (app-eu1.hubspot.com)
Token: cfEnv.HUBSPOT_PRIVATE_APP_TOKEN
Custom properties: user_type, company_name, funding_stage,
  deal_room_created, subscription_plan, platform_signup_date

## 20. Test Users
Founder (IK / Atlas Robotics): 620b1fe9-3d79-4226-8ae8-fbc59579005c
Investor (Dr Henry): 815d3c20-3da1-4057-8178-fd41d671a1fe
Deal Room ID: 957f9750-00c7-402a-b1ba-d9c7a4e3ba2f

## 21. Admin Endpoints
https://hockystick.app/api/admin?key=KEY — feedback/waitlist data
https://hockystick.app/api/emailtest — email diagnostics
https://hockystick.app/api/hubspot-sync?key=KEY — bulk HubSpot sync

## 22. Current Platform Status (June 2026)
- 8 users (7 founders, 1 investor)
- Auth: Working (Google OAuth + email)
- Blog: Live — Notion CMS → website pipeline working
- HubSpot: Live — all 8 users synced, new signups auto-sync
- Deal room: Working — Overview, Documents, Q&A, DD Workstation, Notes, Activity
- AI Summary: Working — PDF, DOCX, PPTX, XLSX, CSV all supported
- Mobile: Optimized — responsive across all pages
- Directory: Live — real data + 10 GCC mock companies
- Newsletter: Working — footer form → Supabase + HubSpot
- Settings: Working — profile, company, notifications, security
- Profile builder: Live — document upload + interview paths, saves to startups table
- Investor intake parser: Live — paste → AI extract → thesis-scored candidates
- Removed from nav: Market News, VC Leads, Pipeline, Reports, Accelerators
- Stripe: NOT built — deferred until company registration complete
- OG image: Fix pending — og-image.png returning 404

## 23. Build Tool Strategy
Copilot/Codex — heavy lifting, boilerplate, repetitive patterns (do NOT push/deploy)
Claude Code — review TypeScript errors, final fixes, deploy
This Claude chat — architecture, strategy, prompts, Notion/HubSpot management

## 24. Investor-Side Surface Area Discovered June 17 (previously undocumented)

A discovery audit on June 17 found real, working investor-side functionality that existed in the database and codebase but was never recorded in this file. This section exists so no future session repeats the mistake of assuming a feature doesn't exist before checking. **Lesson: before scoping any new investor-side build, run a discovery pass (search the codebase for relevant table names, check `pg_policies` for RLS gaps, check row counts) rather than trusting this file's inventory is complete. This file only documents what's been deliberately checked — treat any gap as unverified, not as "doesn't exist."**

### investor_watchlist — real, full-featured, was undocumented

A real watchlist management system at **`/app/investor/startups`** (linked in `investorNav` as "Startups" — reachable, not orphaned). Investors manually add companies, bulk-import via CSV, filter by status/stage/region. Status pipeline: `Sourcing → Reviewing → Diligence → Passed / Invested / Watching` — exact casing enforced **only at the UI level** via a TypeScript `const` array, no DB `CHECK` constraint.

Columns: `id, investor_id, company_name, website, sector, stage, description, source, initial_score, notes, status, created_at, updated_at`. **No foreign key to `startups`** — matching a watchlist entry to a real Hockystick startup happens through a separate `discovery_requests → vc_leads` join in the UI, not through this table.

**Two bugs found and fixed June 17:**
- RLS was completely missing on this table (despite RLS being a consistent pattern everywhere else in the project). Fixed: `watchlist_investor_manage` policy added, scoped to `investor_id = auth.uid()`.
- `app.investor.deal-flow.tsx`'s "Add to watchlist" button inserted `status: "watching"` (lowercase) — a mismatch with the proper-case enum used by every filter tab. Fixed to `"Watching"`. No production rows were corrupted before the fix (confirmed via direct query), but this was a live, waiting-to-trigger bug.

Files touching this table: `app.investor.startups.tsx` (primary CRUD), `app.investor.deal-flow.tsx` (write-only, "Add to watchlist"), `app.investor.overview.tsx` + `app.investor.index.tsx` (read-only count for stat cards / chat welcome state), `app.investor.analysis.tsx` (reads for thesis scoring), `app.investor.diligence.tsx` (reads as the DD company list), `app.investor.portfolio.tsx` (filters `status = "Invested"`), `lib/investor-advisor-fn.ts` (server-side, counts by status for AI system prompt context).

### investor_dd_lite — standalone DD checklist, linked to watchlist

A due-diligence checklist tied to watchlist entries via `watchlist_id` — **separate from** the deal-room DD Workstation's own `dd_categories` / `dd_checklist_items` flow (two parallel DD systems exist, by design or by accident, not yet reconciled). Six categories: Financials, Team, Product, References, Market, Legal. Columns: `id, investor_id, watchlist_id, category, item_index, checked, status, updated_at`. Used by `DDChecklist.tsx` and `lib/dd-fn.ts`, read by `/app/investor/diligence`.

### investor_intake_candidates and investor_watchlist are NOT connected

Confirmed zero cross-references in either direction. No "save this intake result to my watchlist" action exists. These are two separate, parallel features today — worth considering as a real connection point in a future session, not assumed to already exist.

### Other tables confirmed real and populated, previously undocumented

| Table | Notes |
|---|---|
| `deal_briefs` | Cached AI-generated deal memos — avoids regenerating. `lib/deal-brief-fn.ts`. |
| `thesis_alerts` | Drives the investor chat's "what's new" first-load state (Phase 2 Session 1). |
| `investor_verifications` | Verification status records, `app.investor.profile.tsx`. |
| `document_views` | Tracks deal-room document views, `DDWorkstation.tsx`. |
| `profile_views` | Tracks public profile page views. |
| `onboarding_conversations` | Landing-page AI chat history, `lib/onboarding-chat-fn.ts` — already wired, just undocumented. |
| `company_registry_checks` | Likely company verification lookups — purpose not fully confirmed from columns alone. |
| `team_member_profiles` | Extended profile data for team accounts — separate from `team_members`. |
| `investor_team_members` | Investor-side team memberships — separate from `startup_team_accounts`. `app.investor.team.tsx`. |
| `user_plans` | **The monetization gating table** — already populated for all users. `plan, plan_name, ai_calls_daily_limit, deal_rooms_limit, team_members_limit`. Referenced in `app.investor.team.tsx`, `app.users.tsx`. |
| `dd_checklist_items` / `dd_categories` | Deal-room DD Workstation templates — the *other* DD system, not the watchlist-linked one above. |

---

## 25. Playwright Automated Testing Infrastructure

Established June 2026. Every future session MUST use these test accounts for end-to-end verification — never the real Atlas Robotics / Dr Henry demo accounts.

### Test accounts (permanent — never delete)

| Account | Email | Role | Key IDs |
|---|---|---|---|
| Test founder | `test-founder@hockystick.app` | founder | user: `a5f889f9-d3fa-466f-bd37-b3f00a44c1d9`, startup: `c9101e5d-619a-4490-a6c9-ce4f0ed78812` |
| Test investor | `test-investor@hockystick.app` | investor | user: `920727d9-77fa-4ecc-a3e4-467e04a0bb38`, investor_profile: `c5e48bf8-4991-405d-b21b-23b7e029e427` |

**Passwords:** stored in `VCRoom-main/.env.test` (gitignored). Never hardcode in source. Never commit `.env.test`.

**Profile data:** Playwright Test Co (B2B SaaS, Seed, UAE, $18K MRR) for founder. Test Ventures ($25M, MENA/SEA, Pre-seed/Seed) for investor. Boring, plausible, no joke content.

### How sign-in works (captcha bypass)

The live site has Supabase hCaptcha enabled — headless browsers can't solve it. The test suite uses the Supabase service role key to authenticate via `/auth/v1/token?grant_type=password` (service key bypasses captcha), then injects the session into browser localStorage before navigating. See `frontend/tests/auth-and-portfolio.spec.ts` for the pattern.

### Running tests

```bash
cd frontend
npx playwright test                          # run all tests
npx playwright test tests/auth-and-portfolio.spec.ts  # specific file
```

### Test data hygiene

- Each test **must clean up** any rows it inserts (the spec uses pre/post DELETE via service key)
- The **accounts themselves are never deleted** between runs
- The **startup and investor_profiles rows are never deleted** — they are the stable fixture
- Only ephemeral test data (e.g. portfolio entries, activity log rows) gets cleaned per-run

### Test file location

`frontend/tests/` — Playwright config at `frontend/playwright.config.ts`

### Why this matters

Multiple rounds of "should be fixed" claims in June 2026 turned out to need manual user testing to catch real bugs (nested form causing page reload, RLS silent rejection on INSERT, etc.). Playwright automation with real DB verification closes that gap permanently.

### Discovered bugs that Playwright would have caught immediately

1. Nested `<form>` elements — portfolio Add button submitted the outer profile form instead of the inner portfolio form (full page reload on submit)
2. RLS WITH CHECK using `auth.uid()` inside a subquery — silent INSERT rejection with no error returned to client
3. `investorOutOfBounds` guard in AppShell missing `/app/audit` in its whitelist — caused Activity Log link to redirect to AI Advisor
