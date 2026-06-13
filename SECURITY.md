# Hockystick — Environment Variable Security Rules

## THE RULE
VITE_ prefix = visible in browser source code.
Never put secrets in VITE_ variables.

## SAFE with VITE_ prefix (public by design)
- VITE_SUPABASE_URL        — just a URL
- VITE_SUPABASE_ANON_KEY   — designed to be public (RLS protects data)
- VITE_APP_URL             — your own domain
- VITE_GOOGLE_CLIENT_ID    — OAuth client IDs are always public
- VITE_HUBSPOT_PORTAL_ID   — already in HTML source
- VITE_HUBSPOT_OWNER_ID    — numeric ID, no access

## NEVER with VITE_ prefix (server secrets only)
- SUPABASE_SERVICE_ROLE_KEY  — bypasses ALL Row Level Security
- RESEND_API_KEY             — can send email as hockystick.app
- OPENAI_API_KEY             — can burn OpenAI credits
- ADMIN_SECRET_KEY           — admin data access
- HUBSPOT_PRIVATE_APP_TOKEN  — full CRM read/write

## How secrets reach server functions
Cloudflare Workers inject secrets as env object at runtime.
patch-wrangler.mjs copies them to globalThis.__cf_env on every request.
getEnvVar() in src/lib/env.ts checks __cf_env FIRST.
This is why secrets work WITHOUT VITE_ prefix.

## Checklist before adding any new env var
1. Does the browser need this value? 
   YES → VITE_ prefix, add to wrangler.jsonc vars section
   NO  → No prefix, add as Cloudflare Secret only

2. Is it an API key, token, or password?
   YES → Never VITE_, always Cloudflare Secret, never wrangler.jsonc

3. Adding a new third-party service?
   - Portal/account IDs → VITE_ ok
   - API tokens → no VITE_ ever

## Row Level Security reminder
All 39 Supabase tables have RLS enabled.
Even if anon key is exposed, attackers cannot read other users data.
Service role key bypasses this — treat it like a database root password.

Also add to src/lib/env.ts at the top as a comment: 
/**
 * SECURITY: getEnvVar() checks __cf_env FIRST (Cloudflare runtime secrets).
 * Server-only secrets (API keys, tokens) must NOT have VITE_ prefix.
 * VITE_ vars are baked into the JS bundle and visible to anyone.
 * See SECURITY.md for the full rules.
 */


---

## The Golden Rule Going Forward

Every time any AI (Claude Code, Copilot, Codex) suggests adding an env var, apply this one question:

> **"Would I be comfortable if this value appeared in the browser's page source?"**

- API key → No → no `VITE_`
- URL, ID, public config → Yes → `VITE_` is fine

Your RLS on all 39 tables means even if someone grabbed your anon key, they cannot access other users' data. The only catastrophic key is the service role key — and that's now properly secured without `VITE_`. 🏒
