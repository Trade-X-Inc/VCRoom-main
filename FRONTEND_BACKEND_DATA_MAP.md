# Frontend to Backend Data Map

Canonical UI: `frontend/`

## Route mapping and backend data requirements

- `/sign-in`  
  - Data/actions: Supabase auth `signInWithPassword`, profile fetch from `users`.
- `/sign-up`  
  - Data/actions: Supabase auth `signUp`, upsert `users` row.

- `/app` (founder overview)  
  - Needs: aggregated counts from `deal_rooms`, `documents`, `messages`, `due_diligence_items`, `decisions`, and startup profile from `startups`.  
  - Current: still mostly static cards.

- `/app/leads`  
  - Needs: VC leads source/table (`vc_leads` equivalent).  
  - Current: static mock data (no matching table in current schema).

- `/app/pipeline`  
  - Needs: deal pipeline records and stage transitions.  
  - Current: static mock data.

- `/app/deal-rooms`  
  - Uses: Supabase `deal_rooms` (+ `organizations`, `startups` joins).

- `/app/deal-room/$id`  
  - Needs: room-scoped `documents`, `messages`, `due_diligence_items`, `decisions`, `notes`, `meetings`, `ai_reports`.  
  - Current: mostly static, AI chat wired to existing `/api/ai/*`.

- `/app/documents`  
  - Uses: Supabase `documents` table + `documents` storage bucket upload/download.

- `/app/messages`  
  - Uses: Supabase `messages` table.

- `/app/investor/diligence`  
  - Uses: Supabase `due_diligence_items`.

- `/app/investor/decisions`  
  - Uses: Supabase `decisions`.

- `/app/investor/startups`  
  - Uses: Supabase `startups`.

- `/app/investor` (investor overview)  
  - Needs: aggregated `deal_rooms`, `startups`, `decisions`, diligence progress.  
  - Current: static cards.

- `/app/email`  
  - Uses: existing backend endpoint `/api/invites` (Resend send flow).

- `/app/advisor` and deal-room AI panel  
  - Uses: existing backend OpenAI endpoints:
    - `/api/ai/summary`
    - `/api/ai/memo`
