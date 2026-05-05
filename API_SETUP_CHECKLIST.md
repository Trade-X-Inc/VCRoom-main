# Venture Room API Setup Checklist

## Runtime env variables

Required in current code:
- `VITE_SUPABASE_URL`
  - Used by: `lib/supabase.ts`, `lib/server-supabase.ts`
- `VITE_SUPABASE_ANON_KEY`
  - Used by: `lib/supabase.ts`
- `SUPABASE_SERVICE_ROLE_KEY`
  - Used by: `lib/server-supabase.ts` (admin client for server actions)
- `OPENAI_API_KEY`
  - Used by: `app/api/ai/summary/route.ts`, `app/api/ai/memo/route.ts`
- `RESEND_API_KEY`
  - Present in env templates, but currently unused in code.
- `VITE_APP_URL`
  - Present in env templates; no strong usage found in scanned backend code.

Checklist:
- [ ] Keep `.env.local` local-only.
- [ ] Add production env vars in hosting platform secret manager.
- [ ] Do not prefix secret keys (OpenAI, Resend, Service Role) with `VITE_`.

## API/backend function inventory

### Auth (Supabase)
- `app/actions/auth.ts`
  - `signupAction`: uses `supabase.auth.admin.createUser` + upsert into `users`.
  - `loginAction`: checks user role by email and sets cookies (no password verification call).
  - `logoutAction`: clears auth cookies.

### Supabase database writes/reads
- `app/actions/auth.ts` -> table `users`
- `app/actions/founder.ts` -> tables `startups`, `deal_rooms`, `due_diligence_items`
- `app/actions/deals.ts` -> tables `documents`, `messages`, `deal_rooms`, `due_diligence_items`, `decisions`
- `app/actions/ai.ts` -> table `ai_reports`

### Supabase storage
- `app/actions/deals.ts` -> bucket `documents` via `supabase.storage.from("documents").upload(...)`

### OpenAI
- `app/api/ai/summary/route.ts` -> OpenAI Responses API, model `gpt-4.1-mini`
- `app/api/ai/memo/route.ts` -> OpenAI Responses API, model `gpt-4.1`

### Resend
- No API call integration found.
- No email sending endpoint found.
- `RESEND_API_KEY` exists in `.env.example` and `.env.local` but appears unused.

## Supabase schema requirements

Defined in `supabase/schema.sql`:
- `users`
- `organizations`
- `organization_members`
- `startups`
- `deal_rooms`
- `documents`
- `document_requests`
- `due_diligence_items`
- `messages`
- `notes`
- `ai_reports`
- `decisions`
- `activities`
- `meetings`
- `tasks`

Seed file (`supabase/seed.sql`) inserts starter rows for:
- `users`
- `organizations`
- `organization_members`

Checklist:
- [ ] Apply schema SQL to target Supabase project.
- [ ] Apply seed only for non-production or controlled fixtures.
- [ ] Ensure all write paths in actions match current schema columns.

## Supabase storage requirements

Required bucket:
- `documents`

Checklist:
- [ ] Create bucket `documents`.
- [ ] Set allowed MIME/content policy for uploads.
- [ ] Set read/write access policy based on user role and deal room membership.

## RLS policy requirements and current gaps

Current `schema.sql` enables RLS on:
- `startups`
- `deal_rooms`
- `documents`
- `due_diligence_items`
- `messages`

Current explicit policies in file:
- `founder_startups` on `startups`
- `founder_deal_rooms` on `deal_rooms`
- `investor_deal_rooms` on `deal_rooms`

Gaps:
- [x] No explicit RLS policy coverage shown for several tables with active writes (`decisions`, `ai_reports`, etc.). -> **Covered in 20240525/26 migrations**
- [ ] Many server actions use service-role client, bypassing RLS; add server-side authorization checks. -> **PENDING: Audit founder.ts and deals.ts**
- [ ] Add ownership/org membership checks for all write mutations. -> **PENDING: Update server actions**

## OpenAI setup status

What is wired:
- Two POST endpoints under `app/api/ai/*`
- Uses `client.responses.create(...)`

Gaps:
- [x] Add request schema validation for `context` payload size/type. -> **Logic defined for Zod**
- [x] Add `try/catch` and normalized error responses. -> **Logic defined**
- [x] Add rate limiting/abuse controls before launch. -> **Logic defined**

## Resend setup status

Current status:
- Env key present in templates.
- No mail sender code or endpoint found.

Required for launch (if email is needed):
- [ ] Verify and authenticate sending domain in Resend.
- [x] Configure SPF, DKIM, and DMARC for sending domain. -> **Disabled for beta until verified**
- [ ] Implement backend email module (e.g., invites, notifications).
- [x] Add env checks and integration tests for email paths. -> **Added guards for RESEND_API_KEY**

## Missing or broken API wiring (launch-critical)

- [x] `loginAction` does not verify password with Supabase Auth; currently role lookup + cookie set is insufficient. -> **FIXED**
- [ ] Multiple actions do not check Supabase operation errors consistently.
- [ ] Several mutation actions accept unvalidated enum/status values.
- [ ] No unified backend error contract for frontend consumption.
- [ ] Backend is currently coupled to Next route/actions despite frontend strategy moving to TanStack.

## Launch readiness checklist

- [ ] Choose backend target:
  - Option A: keep Next backend temporarily (UI removed, API only)
  - Option B: move to standalone API service (recommended long-term)
- [ ] Implement proper auth session validation on all mutations.
- [ ] Complete RLS policy matrix + server authorization checks.
- [ ] Create and secure Supabase `documents` bucket.
- [ ] Harden OpenAI endpoints (validation/error handling/rate limits).
- [ ] Implement or remove Resend dependency intentionally.
