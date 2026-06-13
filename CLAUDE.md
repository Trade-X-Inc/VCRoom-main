# Hockystick — AI Developer Rules

## Project Identity
App: Hockystick (no 'e') — Agentic VC deal flow platform
Live URL: https://hockystick.app
Cloudflare Pages project: vcroom-main
GitHub repo: Trade-X-Inc/VCRoom-main
Supabase project ID: ldimninnjlvxozubheib
Local path: /Users/macbookpro/VCROOM/VCRoom-main/frontend
Deploy command: cd /Users/macbookpro/VCROOM/VCRoom-main/frontend && npm run deploy

## Stack
TanStack Start + Vite 7 + React 19 + TypeScript + Tailwind CSS v4 + Supabase + Cloudflare Pages

## Critical Rules — NEVER VIOLATE
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

## Environment Variables

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

## Key Files Reference
```
src/lib/auth.tsx                    — Auth context (DO NOT TOUCH)
src/lib/supabase.ts                 — Supabase client (DO NOT TOUCH)
src/lib/env.ts                      — getEnvVar() helper
src/lib/hubspot.ts                  — HubSpot CRM sync
src/lib/notion-blog.ts              — Notion → blog pipeline
src/lib/document-extractor.ts       — Client-side doc text extraction (PDF/DOCX/PPTX/XLSX)
src/lib/news-fetcher.ts             — Live news feed (HN + RSS sources)
src/lib/email/resend.ts             — sendEmail() function
src/lib/email/templates.ts          — Email templates
src/lib/email/triggers.ts           — Email trigger server functions
src/lib/onboarding-chat-fn.ts       — Landing page AI chat
src/lib/ai-secure-fn.ts             — Document AI summary
src/components/app/AppShell.tsx     — Sidebar + nav (founder + investor)
src/components/app/LeadDrawer.tsx   — VC Lead profile drawer
src/components/site/SiteFooter.tsx  — Newsletter signup
src/routes/__root.tsx               — Root layout + OG meta tags
src/routes/index.tsx                — Landing page
src/routes/auth.callback.tsx        — Post-auth handler (HubSpot sync here)
src/routes/blog.tsx                 — Blog layout (Outlet only)
src/routes/blog.index.tsx           — Blog list (Notion-powered)
src/routes/blog.$slug.tsx           — Blog article (Notion-powered)
src/routes/app.news.tsx             — Market intelligence (investor)
src/routes/app.directory.tsx        — Directory (founders + investors)
src/routes/app.accelerators.tsx     — Accelerators & Grants page
src/routes/app.wall.tsx             — Achievement Wall (coming Q3)
src/routes/app.settings.tsx         — Settings (profile, company, notifications)
src/routes/pricing.tsx              — Pricing page
scripts/patch-wrangler.mjs          — CF Worker env injection
```

## Design System

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

## Architecture Patterns

### Server functions
```ts
export const myFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as { param: string })
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

## Known Issues & Hard-Won Lessons

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

### News feed
- Hacker News: direct Firebase API, no CORS issues
- RSS feeds: use allorigins CORS proxy or server-side fetch
- RSS2JSON free tier rate-limited — prefer server-side fetch

## Notion Databases
- Blog CMS: 8a99a69aa1a2422d81fe4b9149a68024
- Social Media Calendar: b8d80e7170cb4eeeaced399bb62f38a2
- Market Research DB: dce29ad7ce7741fa87c4184e3c975e49
- Writing Rules: 37061976-2262-8185-bad1-d054ff00220d
- Email Templates: 37161976-2262-81da-8fde-e6b3c581213d

## HubSpot
Portal ID: 148593751
Owner ID: 93128794
Region: EU (app-eu1.hubspot.com)
Token: cfEnv.HUBSPOT_PRIVATE_APP_TOKEN
Custom properties: user_type, company_name, funding_stage,
  deal_room_created, subscription_plan, platform_signup_date

## Test Users
Founder (IK / Atlas Robotics): 620b1fe9-3d79-4226-8ae8-fbc59579005c
Investor (Dr Henry): 815d3c20-3da1-4057-8178-fd41d671a1fe
Deal Room ID: 957f9750-00c7-402a-b1ba-d9c7a4e3ba2f

## Admin Endpoints
https://hockystick.app/api/admin?key=KEY — feedback/waitlist data
https://hockystick.app/api/emailtest — email diagnostics
https://hockystick.app/api/hubspot-sync?key=KEY — bulk HubSpot sync

## Current Platform Status (June 2026)
- 8 users (7 founders, 1 investor)
- Auth: Working (Google OAuth + email)
- Blog: Live — Notion CMS → website pipeline working
- HubSpot: Live — all 8 users synced, new signups auto-sync
- Deal room: Working — Overview, Documents, Q&A, DD Workstation, Notes, Activity
- AI Summary: Working — PDF, DOCX, PPTX, XLSX, CSV all supported
- Mobile: Optimized — responsive across all pages
- News feed: Live — Hacker News + RSS sources
- Directory: Live — real data + 10 GCC mock companies
- Accelerators page: Live — 20+ programs listed
- Newsletter: Working — footer form → Supabase + HubSpot
- Settings: Working — profile, company, notifications, security
- Stripe: NOT built — deferred until company registration complete
- OG image: Fix pending — og-image.png returning 404

## Agentic Build Roadmap (Starting Now)
Phase 1 (weeks 1-6): AI tools layer
  - create_deal_room, update_company_profile, search_investors
  - analyze_document, score_investor_match, generate_investor_memo
  - update_dd_checklist, draft_outreach_email, schedule_meeting

Phase 2 (weeks 7-14): Deep due diligence + chat-first UI
  - verify_company_registry (UAE/KSA/Egypt)
  - scrape_linkedin_profile, fetch_market_data
  - Chat-first UI redesign (Loveable prototype → clone to repo)

Phase 3 (month 4+): MCP server + autonomous agents
  - Expose platform as Claude MCP connector
  - Background deal monitoring agents
  - Founder Roast V1 (needs 500+ users)

## Build Tool Strategy
Copilot/Codex — heavy lifting, boilerplate, repetitive patterns (do NOT push/deploy)
Claude Code — review TypeScript errors, final fixes, deploy
This Claude chat — architecture, strategy, prompts, Notion/HubSpot management