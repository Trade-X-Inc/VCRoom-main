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

## 9. Design System — THE DESIGN CONSTITUTION (July 2026, supersedes the white/gradient redesign)

**The gradient-purple whitespace system is dead.** In July 2026 the founder reversed the
earlier white-redesign direction and ordered a sharp, dense, institutional system modeled on
Cloudflare Dashboard, Stripe Dashboard, and Linear — flat brand color used sparingly, hard
0px radius, tables over cards, borders over whitespace-as-hierarchy. If you find a page still
using `.hs-gradient`, `rounded-xl`/`rounded-lg` cards, DM Sans, or the old `rgba(0,0,0,0.35)`
muted token, it is UNMIGRATED LEGACY — never "fix" a migrated page back to the old system.
Tokens live in `frontend/src/lib/design-tokens.ts`. If a value isn't in design-tokens.ts, it
isn't in the system.

**This is not a request for creative reinterpretation.** The job is consistent execution of
these fixed rules, not fresh creative direction per page.

### 9.0 Brand

- Primary: `#7C3AED` (violet) — used flat, ONLY for: primary buttons, active nav indicator,
  links, focus rings, key data accents. Never as a section background inside the app.
- Ink (primary text): `#0A0A0B`.
- Background: `#FAFAFA` (app canvas), `#FFFFFF` (cards/panels).
- Border: `#E4E4E7`, 1px solid — the ONLY divider style.
- Fonts: Syne (display/headings, 600–700), DM Sans (UI/body, 400–500).
- Radius: 0px on ALL structural elements. Buttons max 2px.
- Shadows: none, or `0 1px 2px rgba(0,0,0,0.04)` max. Borders define hierarchy, not shadows.

### 9.1 Text contrast — WCAG AA, hard rules

```
Primary text:    #0A0A0B
Secondary text:  #52525B (never lighter than this for body copy)
Tertiary/labels: #71717A minimum, 12px+
```
Any text lighter than `#71717A` on white is FORBIDDEN. Minimum body size 14px, tables 13px.

### 9.2 Layout

- App content area: max-width 1360px, minimum padding 32px. No centered 600px columns.
- Page pattern: `[Breadcrumb 12px]` → `[H1 Syne 28px + one-line description #52525B]` →
  `[primary action top-right]` → `[content]`.
- 24px between blocks, 48px between sections. Pages end within 48px of the last content —
  no trailing white space.
- Density target: Cloudflare/Stripe dashboard, not a marketing page. Tables over cards for
  lists; cards are reserved for summary stats only.

### 9.3 Components

- **Tables**: full-width, 1px `#E4E4E7` row borders, 44px rows, numbers right-aligned.
- **Status chips**: 2px radius, 12px text, AA-compliant contrast. (This replaces the old
  6px-dot-only status system — chips are now allowed, provided they pass contrast.)
- **Buttons**: Primary `#7C3AED` background / white text; Secondary white + 1px border +
  ink text. 36px height, radius max 2px.
- No accordions or dropdowns for primary content — FAQ/help content only. If a page's main
  content is currently gated behind an accordion, that is a migration debt, not a pattern
  to repeat.
- **Empty states**: icon + one sentence + one action. Max 200px tall.

### 9.4 One theme — no dark mode

- No dark mode, no theme toggle, no `dark:` variants, no `.dark` CSS block, in or out of `/app/*`.
- **Sanctioned exception:** `/roast/*` PUBLIC pages keep their event styling, including the
  full-red race button (`#EF4444`) — it is a game mechanic, not a UI button. Roast
  *management* pages inside `/app/*` follow this system fully.

### 9.5 Voice — still minimal, but not a hard word ceiling

- Label: short and specific · Description: one sentence · Button: max 3 words · Error: one
  sentence stating what happened and how to fix it.
- No exclamation marks, no passive voice, active-verb symmetry ("Save changes" → "Changes
  saved"), name things by what the person controls, never apologize.
- WRONG: "Upload your pitch deck document to share with investors" → RIGHT: "Add pitch deck"

### 9.6 Security rendering rules (enforce in every prompt touching deal content)

- Deal content (documents, Q&A, term sheets, closing status, decision drafts) renders ONLY
  under `/deal-rooms/:id/*` routes.
- Top-level pages may render: room name, counterparty name, stage chip, last-activity
  timestamp. Nothing else from inside a room — no document names, no Q&A text, no term sheet
  figures, no decision notes, on any page outside the room.
- `/reports` renders CLOSED deals only — no live/in-progress deal data.
- Investor private profile fields render only inside a deal room at INFORMATION stage or later.

### 9.7 Errors have personality (`EmptyState` / `Illustration` in components/system)

Empty/error/loading/no-results states may still use the line-art characters (64×64, 2px
stroke, ink only) where they fit within the 200px-tall empty-state budget in §9.3 — this is
a carryover from the prior system that is not itself in conflict with the new one. No spinners.

### 9.8 Imagery and iconography

- Lucide icons only — never mix icon libraries.
- Charts: white background, `#7C3AED` as primary series, green for positive — never pie charts.
- Screenshots used in-product or marketing: match whatever this system currently renders.

### 9.9 What every future UI prompt must include

"Follow the Design Constitution in CLAUDE.md Section 9 — use design-tokens.ts. Do not invent
colors, spacing, or component patterns. Flat `#7C3AED` only, per §9.0's limited list of uses.
0px radius on structural elements. No dark styling anywhere. No accordions for primary content."

### 9.10 Reference

Cloudflare Dashboard, Stripe Dashboard, Linear. Sharp, dense, institutional.

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
8. NEVER add dark styling anywhere — one theme, no dark mode (see Section 9); /roast/* public pages are the one sanctioned exception
9. NEVER use prose-invert anywhere
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
src/lib/design-tokens.ts            — Design system source of truth (Section 9)
src/components/system/              — HsButton, StatusDot, SectionLabel, EmptyState, Illustration
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

## 15. Design System (quick reference — full law in Section 9)

### Theme
- EVERYTHING is white: /app/*, public pages, all of it. One theme. No toggle.
- Sanctioned exception: /roast/* public event pages (red race button stays).

### Colors
- Ink #0A0A0B on white #FFFFFF. Hairline rgba(0,0,0,0.06).
- Purple ONLY as gradient: linear-gradient(135deg, #7C3AED 0%, #6366F1 100%)
  via .hs-gradient / .hs-gradient-text. Flat #7C3AED is banned.
- Semantic color exists only as 6px StatusDot dots.

### Components (frontend/src/components/system/)
- HsButton (primary gradient / ghost / text) — the only three buttons
- StatusDot, SectionLabel, EmptyState, Illustration (4 characters)
- Cards: no border, no shadow, no radius — whitespace separates; hairlines for tables

### Typography
- Syne 18/700/-0.5px headings · Inter 11/500 uppercase labels · Inter 13 body
- Loaded via @fontsource in styles.css. DM Sans is retired.

### Blog/article prose
```
className="prose prose-lg max-w-none
  prose-headings:text-gray-900
  prose-p:text-gray-700
  prose-a:text-purple-600
  prose-strong:text-gray-900"
```
NEVER use prose-invert.

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

## 26. THE DOCUMENT LIFECYCLE MODEL (established R11, July 2026) — product law

This is not a suggestion or a UI convention. Every future feature touching founder
documents, extraction, or the IP Vault must be built to this model. If a change would
violate it, stop and revise the plan rather than the model.

### 26.0 The four stages

1. **DOCUMENT INTAKE** (`/app/prepare/ip-vault/document-intake`) — the single entry
   point. A founder uploads a pre-built template document OR a custom document. AI
   extracts structured information from whichever it is. There is no other way for a
   document to enter the system.
2. **DIGITAL DOCUMENT VAULT** (`/app/prepare/ip-vault/digital-document-vault`) — where
   extracted information lives. Hockystick's standardized, stage-based document model,
   organized by the 5 fixed categories: **Market, Financials, Team, Product, Legal**.
   This is the curated, verified-claim-ready data investors ultimately see. It holds
   *extracted structured content*, never raw files.
3. **SOURCE FILES** (`/app/prepare/ip-vault/source-files`) — the original uploaded file,
   stored and listed. Its only remaining purpose after extraction is attachment into a
   deal room if an investor requests the physical/original document. A founder may
   delete an original after extraction — the row (and its Digital Document Vault entry)
   survives; only the file reference is cleared. If nothing was ever extracted, deleting
   removes the row entirely, since nothing else exists to keep.
4. **DOCUMENT PRIVACY SETTINGS** (`/app/prepare/ip-vault/privacy-settings`) — per-document
   visibility control, always shown as two genuinely separate sections (Source Files
   privacy, Digital Document Vault privacy). Never merge these into one shared block —
   a founder controls exposure of the original file and the extracted data independently.

A single `founder_documents` row carries a document through all four stages: it is
created at Intake, its `content` populates the Digital Document Vault view, its
`file_path`/`file_name`/`file_size` populate the Source Files view, and its `visibility`
column is what Privacy Settings edits. Custom (non-template) documents get a synthetic
virtual template card built from their own stored `category` so they render in every
IP Vault view exactly like a pre-built template — a document must never be invisible in
the UI just because it has no matching `document_templates` row.

### 26.1 Category sorting

Document Intake's template list and the Digital Document Vault are both organized by
the 5 fixed categories in this exact order: **Market, Financials, Team, Product, Legal**.
A custom upload is categorized at upload time — the founder picks a category, AI
suggests one as a default via `suggested_category` once extraction completes. Category
section headers render whenever the "All" filter is active; the category chip filter
still narrows to a single category on its own.

### 26.2 Honest extraction — never a silent empty result

If extraction succeeds, `founder_documents.status = 'ai_extracted'` and `content` holds
real structured data. If it fails for any reason — AI provider error, geographic API
restriction, empty response, parse failure — the row still saves (the file isn't lost),
but `status = 'needs_review'` and `content.extraction_error` holds the actual failure
reason. **Never store an error string as if it were content, and never silently default
a classification/category on a caught error without surfacing that something went
wrong.** The UI must show an explicit "Could not extract — document stored in Source
Files, retry or fill manually" state with a one-click retry (re-downloads the already-
stored original; never requires re-upload). This is a Constitution-level honesty rule,
not just an implementation detail of the document feature — it generalizes to every AI
extraction/generation surface in the app.

### 26.3 The privacy boundary (absolute)

Nothing in the IP Vault (Document Intake, Source Files, Digital Document Vault, Privacy
Settings) is EVER publicly accessible. IP Vault content is never public and never
readable without explicit founder approval — via an approved detail-pack request
(`discovery_requests.detail_pack_approved`, unlocking `stage2`-visible documents) or
deal-room membership (`deal_room`-visible documents, once a deal room exists). The ONLY
founder data that goes public is what flows through Profile Builder → Go Live digital
profile (`startup_profile_sections` with `visibility = 'public'`) — a completely
separate table and system from IP Vault. Never let these two systems merge or let an
IP Vault document leak into the public-profile render path.

This boundary is enforced at the **database and storage layer**, not just the UI:
- `founder_documents` table RLS: owner-only for all writes; investor reads gated by
  the detail-pack/deal-room rule above.
- **`documents` Supabase Storage bucket**: object-level policies must independently
  enforce the same rule as the table RLS above them — a correctly-scoped table policy
  sitting on top of an unscoped storage bucket is not real security (this was a live,
  severe bug found and fixed in R11: see `can_access_founder_doc_path()` /
  `can_access_deal_room_doc_path()` in `supabase/migrations/20260718000000_*`). When
  adding any new storage-backed feature, write the bucket-object policy in the same pass
  as the table policy, and derive it from the same rule — never let the two drift apart.
- A stage-3 template (financial-model, cap-table, incorporation-docs,
  shareholder-agreements, bank-statements, customer-references) must never be exposed
  via detail-pack/pre-deal-room approval regardless of what its `visibility` column
  says — the UI's stage-2/stage-3 distinction is a display convention only and is not
  itself enforced by the `visibility` toggle, so any RLS/storage rule referencing
  `visibility = 'stage2'` must also exclude the stage-3 slug list explicitly.

## 27. REAL-TIME UI RULE (established R11, July 2026) — app-wide, not feature-specific

**Every mutation must leave the UI reflecting the change immediately, without a page
reload.** This is a hard rule for all future code, not a one-off fix:

- After any Supabase write (`insert`/`update`/`upsert`/`delete`) or mutating server
  function call, either call `queryClient.invalidateQueries({ queryKey: [...] })` for
  every query key that renders the affected data, or `refetch()` the specific query
  observer if only one view is affected.
- **When a mutation's result renders in more than one place** (e.g. a document upload
  that affects Document Intake, Source Files, and the Digital Document Vault
  simultaneously — three separate route mounts of the same underlying query), invalidate
  every affected query key, not just the one belonging to the currently-mounted view.
  `refetch()` only updates the currently-active observer; `invalidateQueries()` updates
  the shared cache entry so every mount (current or future) sees fresh data.
- Never pass a concatenated array like `["key-a", "key-b"]` intending it to match two
  separate query keys — React Query treats this as ONE key. To invalidate two different
  queries, call `invalidateQueries()` twice, once per real key.
- A `staleTime` on the global QueryClient (see `src/routes/__root.tsx`) does not excuse
  skipping invalidation — it only controls background refetch timing for the *same*
  cache entry across remounts, not whether a mutation's result reaches the cache at all.

---

## 28. CROSS-SESSION REAL-TIME IS A SEPARATE PROBLEM FROM §27 — AND WAS NEVER WIRED UP (found R12, July 2026)

**Section 27's rule only fixes invalidation within one user's own browser/QueryClient.**
`queryClient.invalidateQueries()` is process-local — it cannot reach a *different* user's
open tab. When user A's action (e.g. an admin changing user B's role) needs to update
user B's already-open session, that requires Postgres logical replication pushing the
change out via Supabase Realtime (`supabase.channel(...).on('postgres_changes', ...)`),
not React Query invalidation. These are two unrelated mechanisms — don't conflate them.

**R12 discovered that Realtime was never actually wired up for ANY table in this app.**
`select tablename from pg_publication_tables where pubname = 'supabase_realtime'`
returned only the internal `realtime.messages_YYYY_MM_DD` partitions — zero application
tables. This means every existing `.channel().on('postgres_changes', ...)` subscription
in the codebase (`NotificationBell.tsx`, `DealRoomChat.tsx`, `useStageTransition.ts`,
`app.deal-rooms.$id.qa.tsx`, `roast.$id.tsx`, `app.messages.tsx`, `app.roast.$id.live.tsx`)
has been a **silent no-op** — each one only appears to work because it sits next to a
`refetchInterval` polling fallback that's doing the actual work.

**Fixed in R12:** added `startup_team_accounts` to `supabase_realtime` (migration
`20260718050000_r12_enable_realtime_startup_team_accounts.sql`) so a role change now
propagates to the affected member's open session live — verified with Playwright
(`tests/r12-realtime-role-change.spec.ts`), no page reload required.

**Update (R12B, July 2026): the broader gap named above is now fixed for every table
that had subscription code.** See §29 for the full architecture and what's still
intentionally out of scope.

**Gotcha if you add more tables to the publication:** `useAccountContext()` is called
from many components simultaneously (`MemberShell`, `AppShell`, `app.tsx`,
`app.audit.tsx`, `app.member.index.tsx`). A naive per-mount `.channel(topic).on(...).
subscribe()` throws `cannot add postgres_changes callbacks ... after subscribe()`
because Supabase's client treats repeated `.channel()` calls with an identical topic
string as the same channel object — the second mount's `.subscribe()` collides with the
first. Fixed with a module-level ref-counted registry (see `useAccountContext.ts`): only
the first concurrent caller opens the channel, only the last one closes it. Use the same
pattern for any other hook that's mounted from multiple places at once.

---

## 29. REALTIME ARCHITECTURE — full table (established R12B, July 2026)

R12B added every table backing an existing `.channel().on('postgres_changes')` call to
`supabase_realtime`, built subscriptions for three deal-room-scoped tables that had none,
and empirically verified (not assumed) that Realtime's Postgres Changes feature correctly
enforces each table's RLS SELECT policy on the replication path — a subscribed-but-
unauthorized client receives zero payloads, confirmed with a real raw WebSocket
subscription in `tests/r12b-realtime-verify.spec.ts`, not just by reading policy text.

**Before adding any new realtime subscription:** check `select tablename from
pg_publication_tables where pubname = 'supabase_realtime'` — a working `.channel()` call
in the code does not mean the table is actually publishing. Add the table via
`alter publication supabase_realtime add table <name>;` first.

### 29.0 Tables in `supabase_realtime` and what each covers

| Table | Subscriber(s) | Covers | Live-tested latency |
|---|---|---|---|
| `startup_team_accounts` | `useAccountContext.ts` | A role change by an admin reaches the affected member's open session (R12) | — |
| `notifications` | `NotificationBell.tsx` | New notification for the signed-in user | ~577ms |
| `messages` | `DealRoomChat.tsx` | New deal-room chat message | not directly tested; same shape as `team_messages` |
| `team_messages` | `app.messages.tsx` | New team chat message in the active channel | ~1035ms |
| `deal_room_qa` | `app.deal-rooms.$id.qa.tsx` | New Q&A question/answer | ~487ms |
| `deal_room_stage_transitions` | `useStageTransition.ts` | Deal-room stage-change request/approval | not directly tested; pre-existing code, unchanged |
| `deal_room_term_sheets` | `app.deal-rooms.$id.term-sheets.tsx` (new, R12B) | Term sheet sent/accepted/countered | not directly tested; same invalidation pattern as verified tables |
| `deal_room_closing_items` | `app.deal-rooms.$id.close.tsx` (new, R12B) | Closing checklist item status change — anticipates R15's active-closing work | not directly tested |
| `deal_room_closure_reports` | (publication membership only, no subscriber yet) | — | — |
| `nda_acceptances` | `app.deal-rooms.$id.overview.tsx` (new, R12B) | Counterparty's NDA acceptance appears in the room-level signer list | not directly tested |
| `roast_sessions`, `roast_race_events`, `roast_audience` | `roast.$id.tsx` (public) | Live roast event state | not touched — existing 7s poll fallback kept, see §29.2 |
| `roast_questions` | `app.roast.$id.live.tsx` | Roast host control panel live state | not touched — existing 7-15s poll fallbacks kept, see §29.2 |

### 29.1 Security verification (step 4 result — PASS)

Tested as `test-lawyer@hockystick.app` (External role, confirmed zero `deal_room_members`
and zero `deal_room_team_assignments` rows for the target room) against `deal_room_qa`:

1. Direct authenticated REST read of the room's `deal_room_qa` rows: **0 rows returned.**
2. A real raw Supabase Realtime WebSocket subscription, opened with the exact same
   channel/filter shape the app's own `qa.tsx` uses, while a legitimate member inserted a
   new row into that room: **0 `postgres_changes` events received**, across an 8-second
   window (well beyond the ~500ms-1s latency observed for authorized subscribers).

**Conclusion: Realtime's RLS enforcement on the replication path is real, not just a
table-level RLS flag that happens not to matter.** This was verified empirically per this
task's explicit instruction — realtime payloads are a historically separate leak vector
from REST/Storage in Supabase apps (see §26.3's storage-bucket precedent from R11), and
"RLS is enabled on the table" is not sufficient evidence on its own; verify the actual
subscription behavior before trusting it, the same standard applied here.

### 29.2 What's still out of scope, on purpose

- **`activity_log` has no working realtime and none was built.** It has no
  `deal_room_id` column — it's a founder/investor account-level audit trail, not
  deal-room-scoped. `DealRoomTimeline.tsx`'s query against it (`.eq("deal_room_id",
  dealRoomId)`) targets a column that doesn't exist on this table — a pre-existing,
  unrelated frontend bug, not a realtime gap. A future session designing a real
  deal-room activity feed needs a new table or column, then a subscription — not before.
- **Roast pages' polling was left untouched.** `roast.$id.tsx` and
  `app.roast.$id.live.tsx` are live-event infrastructure with several 7-15s
  `refetchInterval`s. Their tables are now correctly in the publication (so the existing
  `.channel()` calls in that code are no longer no-ops), but polling wasn't reduced —
  doing so safely needs an active-roast-session test fixture (race events, live
  questions) that wasn't built in this branch. Live-test before touching that polling.
- **`deal_room_closure_reports`** is in the publication (harmless, unused) but has no
  subscriber — nothing currently needs it to feel live.

---

## 30. `investor_profile_id` MEANS TWO DIFFERENT THINGS ACROSS THE SCHEMA (found R12C, July 2026) — schema-cleanup item, NOT fixed

A column named `investor_profile_id` exists on five tables, with two different FK targets:

```
startup_team_accounts.investor_profile_id  -> FK to investor_profiles.user_id
team_channels.investor_profile_id          -> FK to investor_profiles.id
team_messages.investor_profile_id          -> FK to investor_profiles.id
team_notes.investor_profile_id             -> FK to investor_profiles.id
team_tasks.investor_profile_id             -> FK to investor_profiles.id
```

This caused two real, live production bugs found and fixed in R12C:

1. **`get_investor_team_role()`** (added R12) had its owner-check comparing the parameter
   against `investor_profiles.id`, but every real caller — `investor_has_permission()`,
   `startup_team_accounts.investor_profile_id` itself, R12/R12B's own test fixtures —
   passes a `.user_id`-shaped value. Confirmed empirically: calling it with the value
   actually stored in the FK column returned `null` instead of `'owner'`. Fixed by
   comparing against `.user_id` (correct for this function's actual callers).

2. **`investor_channel_access`/`investor_message_access`/`investor_note_access`/
   `investor_task_access`** (pre-existing, predate R12) already correctly compared against
   `investor_profiles.id` — matching THEIR OWN column's real FK target. A first attempt at
   fixing (1) above incorrectly "fixed" these four in the same pass, assuming all five
   `investor_profile_id` columns meant the same thing — they don't. Caught before any real
   data was affected (empirically verified zero rows existed in any of the four tables at
   the time) and reverted in a same-day follow-up migration
   (`20260718080000_r12c_correct_investor_profile_id_dual_shape.sql`).

**Lesson: never assume a repeated column name means the same thing across tables — check
`information_schema.constraint_column_usage` for the actual FK target before writing or
"fixing" a policy that touches it, even when the column name and a plausible-sounding
purpose are identical.**

**Current state (intentionally NOT unified further in R12C):** `get_investor_team_role()`
is the `.user_id`-shaped function — use it for `startup_team_accounts`-adjacent
permission/role checks. `get_investor_team_role_by_profile_id()` is the new `.id`-shaped
counterpart — use it for any future policy on `team_channels`/`team_messages`/
`team_notes`/`team_tasks` that needs team-member (not just owner) role resolution; it
wasn't wired into those four tables' policies since their existing inline `EXISTS` checks
only needed the owner case and already worked correctly post-revert.

**Follow-up for a future dedicated session:** standardize `investor_profile_id`'s meaning
to one canonical target (most likely `.user_id`, matching the newer R12-era convention and
`startup_team_accounts`) across all five tables — this means migrating the FK constraint
and every dependent policy on the four `team_*` tables, plus a data backfill if any rows
exist by then. Bigger and riskier than any single feature branch should absorb
incidentally; do it as its own deliberate migration.

---

## 31. CLEANUP-PASS BACKLOG — not urgent, don't lose these between phases

Three known, real debt items, none blocking, all deliberately deferred rather than fixed
incidentally inside an unrelated feature branch. Whatever session becomes the dedicated
"cleanup pass" should start here rather than rediscovering these from scratch:

1. **`investor_profile_id` dual FK meaning** (§30, found R12C) — same column name means
   `investor_profiles.id` on `team_channels`/`team_messages`/`team_notes`/`team_tasks` but
   `investor_profiles.user_id` on `startup_team_accounts` and the new R12C tables. Needs a
   canonical-meaning decision, an FK migration, and a policy migration on four tables.
2. **`activity_log` has no `deal_room_id` column** (§29.2, found R12B) — it's a founder/
   investor account-level audit trail, not deal-room-scoped. `DealRoomTimeline.tsx`
   queries a column that doesn't exist on it and has been silently broken. Needs either a
   new deal-room-scoped activity table/column, or repointing the Timeline component at
   whatever the correct source turns out to be.
3. **`.hs-gradient` / gradient-purple system remnants** (§9, R1-era, superseded July 2026
   by the Design Constitution) — `app.investor.profile.tsx` (touched extensively in R12C)
   is a concrete example still running heavy inline `hs-gradient`/flat-`#7C3AED`-as-
   background styling and non-0px radii. Per §9's own rule, do not "fix" this
   incidentally while touching the file for unrelated work — migrate it deliberately, as
   its own pass, checking every card/button/radius against `design-tokens.ts`.

None of these were fixed as part of the R12/R12B/R12C branches that found them — each was
scoped out on purpose to keep those branches focused, per the standing rule of not
expanding a feature branch into an unrelated repair.

---

## 32. PAYMENT PLACEHOLDER PATTERN (established R13, July 2026) — the standard for every paid feature until Stripe is wired

Stripe is not built (§22 — deferred until company registration completes; `stripe_customer_id`/
`stripe_subscription_id`/`stripe_price_id` columns exist on `subscriptions` and stay null).
Every paid feature between now and real Stripe integration follows this exact pattern —
**do not invent a different placeholder shape per feature.**

### 32.0 The pattern

1. **The consuming table gets its own `payment_status` column**, not a shared central
   payments table — `roast_sessions.payment_status` (the original of this pattern, added
   before R13 and widened in R13 to the shared vocabulary below) is the reference
   implementation. A new paid feature adds `payment_status text not null default
   'pending_payment' check (payment_status in ('not_required','pending_payment','paid','waived'))`
   to its own table.
2. **Four states, shared vocabulary across every feature:**
   - `not_required` — this row/feature was never fee-gated (default for non-paid paths).
   - `pending_payment` — fee owed, not yet confirmed.
   - `paid` — confirmed via the placeholder (or later, a real Stripe PaymentIntent).
   - `waived` — comped/free, explicitly granted (e.g. beta access).
3. **The shared UI is `frontend/src/components/app/PaymentConfirm.tsx`** — fee label,
   amount, a terms list (feature supplies its own copy), a required checkbox, and a
   "Confirm payment" button. No card is ever charged; confirming just calls the caller's
   `onConfirm`, which the feature wires to mark its own row's `payment_status = 'paid'`.
4. **Every call site MUST carry a `TODO(stripe)` comment** at the exact line that marks
   `paid` without a real charge, so a future Stripe-integration pass can `grep -rn
   "TODO(stripe)"` to find every site needing the swap in one search — do not phrase the
   comment differently per feature.
5. **Gating a paid action**: the feature's own confirm/submit action checks
   `payment_status === 'paid'` (or `'waived'`/`'not_required'` where applicable) before
   proceeding — never let a `pending_payment` row's action complete silently.

### 32.1 Reference implementation — Founder Roast's $40 fee (R13)

`ROAST_LEVELS` in `roast-fn.ts` already carried real `priceUsd` values (Level 1 $40 /
Level 2 $50 / Level 3 $60) that the UI displayed struck-through as "Free during beta" with
no actual payment step — R13 built the missing step: `PaymentConfirm` renders between the
level/date picker and the final "Schedule" action, gated server-side in
`createRoastSession` (refuses without `paymentConfirmed: true`, same shape as the
pre-existing `rulesAcknowledged` gate).

`payment_status` started as `roast_sessions.payment_status` (pre-R13:
`'comp'/'pending'/'paid'`; widened in `20260719000000_r13_payment_status_pattern.sql` to
the shared 4-state vocabulary below). **It was then moved to its own table,
`roast_session_payments`, in `20260719020000_r13_split_roast_payment_status.sql`** — see
§32.3. Do not treat `roast_sessions.payment_status` as current; that column no longer
exists.

### 32.2 What this is NOT

Not a real payment gateway, not PCI-relevant (no card data ever collected or transmitted),
not a substitute for actually wiring Stripe — it exists purely so paid features can be
fully built and shipped now, with the payment step structurally in place, rather than
half-built and waiting on Stripe. Per the founder's standing rule: paid features get
fully built and wired to this placeholder, never left partial.

### 32.3 HARD RULE — never put `payment_status` on a table that's public-readable or realtime-published (found R13, July 2026)

R13's mandatory security check found `roast_sessions.payment_status` leaking to ANY
anonymous, unauthenticated visitor of a public roast session — verified live with a real
Supabase Realtime WebSocket subscription carrying no auth token, which received the
founder's payment state (`paid`/`pending_payment`/`waived`) in the raw `postgres_changes`
payload on every session update.

**Why this happens, and why it will happen again if you're not careful:** Postgres RLS —
and Supabase Realtime on top of it — has **no column-level redaction**. A table's SELECT
policy is row-level only: once a row is visible to a caller (here, `roast_sessions_public_read`'s
`is_public = true` branch), **every column** of that row is visible too, including via the
realtime channel, regardless of what the subscribing client's own JS callback chooses to
read. Manually stripping a field from a server function's *response* (as the fix first did
for `getRoastPublicState`) only closes the REST/RPC path — the direct-table realtime path
is architecturally separate and stays open unless the column itself is removed from the
public/published table.

**The rule:** any column carrying payment state, internal ops data, or anything not meant
for the row's full audience must live on a **separate table**, scoped by its own RLS to
only the parties who should see it, and **not added to `supabase_realtime`** unless every
party with realtime access to it is also a party who should see every column. Never add a
`payment_status`-shaped column directly to a table that already has a public or
broadly-scoped SELECT policy — split it out from the start, don't retrofit after a leak is
found. `roast_session_payments` (§32.1) is the reference pattern: `session_id` FK,
founder-only RLS, no realtime publication membership.

**Before adding a payment (or any sensitive-status) column to an existing table, check its
current RLS policies AND whether it's in `supabase_realtime`** — `select * from
pg_policies where tablename = '<table>'` and `select * from pg_publication_tables where
tablename = '<table>'`. If either check comes back broader than "only the owner," the new
column needs its own table, not a spot on the existing one.

---

## 33. GENERAL RULE — Postgres RLS is ROW-level, never COLUMN-level (confirmed twice: R13 §32.3, R13B, July 2026)

**Any table where different columns need different audiences must be split into separate
tables from the start.** There is no RLS policy syntax, no view trick short of an actual
`SECURITY DEFINER` function or a `SELECT`-only projection view, that lets one policy say
"this caller sees columns A and B but not C" on a single `SELECT *`-able table. A `SELECT`
policy is entirely row-level: if a row passes the policy's `USING` clause, every column of
that row is returned to a direct query, full stop — regardless of whether some other RPC
or app-layer convention "intends" to hide part of it.

**This has now bitten this codebase twice, in two unrelated features:**
- §32.3 (R13): `roast_sessions.payment_status` leaked to any anonymous realtime subscriber
  of a public roast session, because the row was public but the column wasn't meant to be.
- R13B: `team_members.bio` leaked to any deal-room counterparty via a direct `SELECT *`,
  confirmed empirically with a real inserted row and a real counterparty session — bio came
  back in full — despite the founder's explicit decision that only name/photo/title should
  be visible before the Information-stage unlock. Fixed by splitting `team_members` (public:
  name, title, photo, key_person flag) from `team_member_details` (gated: bio, highlights,
  social_links), the same pattern applied to `investor_team_members` /
  `investor_team_member_details`.

**The check before adding ANY new column to an existing table:** does this column need to
be visible to a *different* set of callers than the table's other columns? If yes — even if
"today" every consumer happens to want the same access — split it into its own table with
its own RLS from the moment it's added. Do not plan to "just be careful about which columns
the client selects" — a direct `SELECT *`, a realtime payload, or a future consumer that
forgets the convention will all bypass that immediately. This is not a style preference; it
is the only mechanism Postgres RLS actually offers for differential column visibility.

---

## 34. GENERAL RULE — a UI permission check is not a security boundary; RLS must enforce role-scoped actions too (found R14, July 2026)

A third instance of the same underlying lesson as §33, but for actions (INSERT/UPDATE),
not columns: **`FOUNDER_PERMISSIONS`/`INVESTOR_PERMISSIONS` (`roles.ts`) gate what the UI
shows, never what the database allows.** If a permission like `request_access` is meant to
distinguish which roles may perform a write, the table's own RLS policy must check that
role — a `PermissionGate` component or an inline `useAccountContext()` check in a button
component is UI-layer messaging only, exactly as `PermissionGate.tsx`'s own doc comment
already says for page-level gating. R14 found this hadn't been applied to a per-row INSERT
policy: `discovery_requests`' `investor_insert_own` policy checked only
`investor_id = auth.uid()`, with **no role check at all** — confirmed empirically that an
`analyst`/`external`-role investor team member (both `request_access: false` in
`INVESTOR_PERMISSIONS`) could still INSERT a real row via a direct API call, bypassing the
new `RequestAccessButton` UI gate (and Directory's pre-existing identical Connect flow,
which shares the same table and had the same gap since it was built, undetected until this
adversarial pass).

**Fixed** with a `SECURITY DEFINER` helper (`investor_can_request_access`, in
`20260721000000_r14_discovery_requests_role_check.sql`) mirroring the existing
`get_investor_team_role()` pattern — owner check against `investor_profiles`, then role
lookup in `startup_team_accounts` (the real investor team/role table, keyed by `.user_id`
per §30's documented convention — not `investor_team_members`, which is R13B's key-person
*profile* table, unrelated to permissions) — added to the policy's `with_check` alongside
the existing ownership check. Adversarial-verified: an `associate`-role test account (which
has `request_access: true`) still succeeds; a temporary `analyst`-role fixture inserted and
tested inside a rolled-back transaction was rejected with a genuine RLS policy violation,
not just a hidden button.

**The check before shipping any new role-gated write path:** does `INVESTOR_PERMISSIONS` or
`FOUNDER_PERMISSIONS` distinguish which roles may perform this action? If yes, the table's
own INSERT/UPDATE/DELETE policy must encode that distinction directly (via a `SECURITY
DEFINER` helper reusing the established owner/team-role lookup pattern, not a new one) —
never assume a `PermissionGate` wrapper or a component-level `useAccountContext()` check is
sufficient on its own. Treat this identically to §33's column-visibility rule: the UI check
improves the experience (an honest disabled state instead of a confusing failure), but the
RLS policy is what actually stops the write.
