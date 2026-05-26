# VentureRoom — AI Developer Rules

## Project Overview
VentureRoom is a VC fundraising platform.
Stack: TanStack Start + Vite + React 19 + 
Supabase + Cloudflare Pages + TypeScript

## Live URL
https://hockeystick.app

## Critical Rules — NEVER VIOLATE
1. NEVER touch src/lib/auth.tsx
2. NEVER touch src/lib/supabase.ts  
3. NEVER commit .env.local
4. NEVER commit dist/ folder
5. ALWAYS run npm run build before committing
6. ALWAYS use existing design tokens (no inline styles)
7. ALWAYS add enabled: !!user?.id to useQuery

## Environment Variables
VITE_ vars → read at build time from .env.local
Server vars → passed as data.openAIKey from client
Pattern: const key = data.openAIKey || 
  import.meta.env.VITE_OPENAI_API_KEY || ''

## Key Files
- src/lib/auth.tsx — Auth context (DO NOT TOUCH)
- src/lib/supabase.ts — Supabase client (DO NOT TOUCH)
- src/lib/advisor-fn.ts — AI Advisor server fn
- src/lib/ai-fn.ts — Email generation server fn
- src/components/app/LeadDrawer.tsx — VC Lead profile
- src/components/app/AppShell.tsx — Sidebar + nav

## Design System
Primary: #6C5CE7 purple gradient
Cards: bg-card border-border/60 rounded-xl
Buttons: bg-gradient-to-r from-purple-600 to-indigo-600
Text: text-foreground / text-muted-foreground
Always use Tailwind classes, never inline styles

## Deployment
Build: npm run build (in frontend/)
Deploy: npm run deploy (needs CLOUDFLARE_API_TOKEN)
Auto-deploys via GitHub push to main

## Current Status
- Auth: Working (email + Google)
- Founder dashboard: ~80% complete
- Investor dashboard: ~40% complete
- Deal room: Basic, needs major work
- AI features: Working via VITE_ key passing