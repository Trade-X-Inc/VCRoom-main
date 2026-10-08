# Lengdon — Environment Variable Security Rules

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
- RESEND_API_KEY             — can send email as lengdon.com
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

## Row Level Security reminder — CORRECTED 8 Oct 2026
The claim previously here ("RLS on all tables means attackers cannot read
other users' data") was FALSE as a guarantee. RLS is a second layer only.
The primary boundary is the action layer plus default-deny table grants
(column-level, value pinned in `WITH CHECK`). See Master Security Rules §0
below for the three proven failures (anon-readable `users`, client-writable
`users.role`, forgeable `documents`/`deal_rooms` columns) that disproved it.
Service role key bypasses RLS entirely — treat it like a database root password.

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

RLS is a second layer, not the guarantee it was once described as here — see the
correction above and Master Security Rules §0. The service role key is the one
catastrophic key, and it's properly secured without `VITE_`.

---

# Master Security Rules

Status: DRAFT for owner approval, added 8 Oct 2026. Supplements the env/secrets
rules above, `CLAUDE.md` §5–§7, and `ARCHITECTURE.md` §9–§11.

**Principle: every item below is a build gate. A failed item blocks merge.
Claims are not evidence — paste raw output.**

Items marked **REQUIRED – NOT YET BUILT** describe a control this document
requires but that does not exist in this codebase today, confirmed against
nothing more than their absence from the codebase's own existing security
documentation (`CLAUDE.md` §11.1, `ARCHITECTURE.md` §5/§12) — not verified
live against the database or infrastructure as part of this documentation
pass, since this pass made no code, SQL, or infrastructure changes and ran
no queries. Do not read "not marked NOT YET BUILT" as "confirmed built" —
only the items explicitly marked are asserted either way; everything else in
this checklist is a requirement, not a status report.

## 0. Corrections to existing docs

- `SECURITY.md`'s former claim "RLS on all tables means attackers cannot read
  other users' data" was FALSE as a guarantee. Proven: anon-readable `users`,
  client-writable `users.role`, forgeable `documents`/`deal_rooms` columns.
  RLS is a second layer only.
- `verify_jwt: true` alone is not authentication (the anon key is a valid
  JWT). Use `resolveUid()` (`ARCHITECTURE.md` §10/§11).

## 1. Data layer (Supabase/Postgres)

1. Default-deny: no client INSERT/UPDATE/DELETE on any public table unless
   an evidenced call site exists. Re-grant by column, never table-wide.
2. GRANT the column, PIN the value in `WITH CHECK`. Never leave a column
   writable that the flow does not write. Never grant role, status, owner,
   tenant, verification, scan, score, or timestamp columns to clients.
3. Every UPDATE policy has `USING` and `WITH CHECK`. Every `ALL` policy has
   an explicit `WITH CHECK`.
4. `anon` has zero table access except an explicit, reviewed allowlist. No
   `qual: true` policy on a table with personal data.
5. Default privileges: functions and tables created later must NOT be
   client-executable/writable by default (global
   `ALTER DEFAULT PRIVILEGES FOR ROLE postgres ... FROM PUBLIC, anon, authenticated`;
   verify with a rolled-back probe).
6. `SECURITY DEFINER`: fixed `search_path` including `pg_temp` last,
   schema-qualified names, explicit `REVOKE FROM PUBLIC/anon`, validated
   inputs, identity from `auth.uid()` only.
7. **CI guard: fail build on any new grant to anon/authenticated not on the
   allowlist** (like `check-action-split.mjs`). **REQUIRED – NOT YET BUILT**
   — no such CI guard exists in this repo today; `check-action-split.mjs`
   is a real, existing precedent for the mechanism, not the guard itself.
8. Every migration ships with a dry-run (`BEGIN`/`ROLLBACK`,
   `SET LOCAL ROLE`) asserting `SQLSTATE 42501` for each attack and a
   positive control for each legitimate flow, plus a real-HTTP smoke test
   (`safeupdate` and PostgREST behaviour are not exercised by `SET ROLE`).
9. Storage buckets: private by default, signed expiring URLs, path scoped
   to room/org, server-side size/MIME limits.
10. Backups: stated RPO/RTO, restore tested quarterly, point-in-time
    recovery on.

## 2. Authentication and sessions (account takeover)

1. **Mandatory MFA for every account**; admin/support/lawyer accounts
   require phishing-resistant MFA (passkeys/WebAuthn). **REQUIRED – NOT YET
   BUILT.** `CLAUDE.md` §11.1 currently lists "Mandatory MFA" under
   "Controls built from day one" — that claim conflicts with this item's
   status and is flagged separately below, not resolved here.
2. Passkeys (WebAuthn) are the fingerprint/face answer: biometrics stay on
   the user's device; we store only a public key. We do NOT collect or
   store raw fingerprints. **REQUIRED – NOT YET BUILT.**
3. Step-up authentication (fresh passkey/MFA within minutes) before:
   closing-gate actions, signing, payment/bank-detail changes,
   role/permission changes, data export, email/phone change, API key
   creation. **REQUIRED – NOT YET BUILT.**
4. Device trust: register devices after MFA; new device, new country, or
   impossible travel triggers step-up and email alert; user can view and
   revoke devices and sessions. **REQUIRED – NOT YET BUILT.**
5. Sessions: short access token, rotating refresh token with reuse
   detection, revoke-all on password/MFA change, idle and absolute
   timeouts, bind to device where possible.
6. Login protections: per-IP and per-account rate limits, progressive
   delay/lockout, CAPTCHA/Turnstile on signup, login, reset, invite;
   breached-password check; generic error messages (no account
   enumeration, including timing).
7. Password reset/magic link: single-use, short-lived, bound to requesting
   device/session, never in logs or referrers.
8. Roles are assigned server-side only. Client may never choose privilege.
   Allowed self-declared roles are a closed list; elevated roles (admin,
   lawyer, qualified investor) are granted only by server-side verified
   flows.
9. OAuth: PKCE, exact redirect-URI allowlist, state/nonce validated, no
   open redirects.

## 3. Identity verification at closing gates (KYC/KYB/biometric)

1. Use a regulated third-party IDV vendor (document + liveness + face
   match, sanctions/PEP screening). **REQUIRED – NOT YET BUILT** — no IDV
   vendor is integrated. Candidates to evaluate: Sumsub, Persona, Veriff,
   Onfido/Entrust, Jumio. Selection needs counsel review (DIFC/GDPR).
2. Biometric data is special-category data: explicit consent, purpose
   limitation, minimal retention, store only the vendor result/reference
   (not the image) where possible, DPA signed, data residency checked,
   erasure path defined. **REQUIRED – NOT YET BUILT**, contingent on item 1.
3. Liveness/deepfake injection resistance required (active or passive
   liveness with injection-attack detection). **REQUIRED – NOT YET BUILT.**
4. Verification result is written server-side from a signed vendor webhook
   only; never from client-reported state. **REQUIRED – NOT YET BUILT**,
   contingent on item 1.
5. Re-verify (step-up) at each irreversible closing step, and on
   bank-detail change. **REQUIRED – NOT YET BUILT.**

## 4. Abuse, bots, DoS, and cost control

1. Cloudflare WAF with managed rules, bot management, and rate limiting in
   front of everything. Per-IP and per-user/per-org limits on every route
   and server function. **REQUIRED – NOT YET BUILT** as a platform-wide
   control — an `ai_rate_limits` table exists in the schema (referenced in
   `CLAUDE.md`'s foreign-key inventory), but that is a narrower, unverified
   fact about one table, not evidence of the WAF/per-route/per-user control
   this item describes.
2. Turnstile on all unauthenticated forms; honeypot plus server validation.
3. Expensive operations (AI calls, document parsing, search, email sends,
   PDF generation): per-user daily quotas, global circuit breaker, and a
   hard monthly spend cap with alerting on provider dashboards (OpenAI,
   Resend, Supabase, Cloudflare). **REQUIRED – NOT YET BUILT** (spend caps).
4. Request size limits, upload size caps, pagination caps, query timeouts,
   `statement_timeout`, no unbounded exports.
5. No unauthenticated endpoint may trigger sends, AI, or service-role work.
   Inventory of edge functions reviewed monthly; unreferenced = inert (410)
   or deleted.
6. Email: per-recipient and per-sender send limits, SPF/DKIM/DMARC
   enforced, no user-controlled recipient on transactional mail, no
   reflected recipient data in responses.
7. Supabase network restrictions and connection pooling limits; alert on
   abnormal row counts, auth failures, 4xx/5xx spikes.
8. Cloudflare "Under Attack" runbook and a named incident owner.

## 5. Application attacks (OWASP-class)

- Injection: parameterized queries only; no string-built SQL; allowlist
  dynamic column/table names.
- IDOR/BOLA and tenant crossing: identity from session, never from
  request; every query scoped by org and room; test with a real account
  that has no access.
- Mass assignment: server picks allowed fields explicitly; never spread
  request bodies into writes.
- XSS: CSP enforcing with nonce, no `dangerouslySetInnerHTML` on user
  content, sanitize rich text, strip client `x-csp-nonce`.
- CSRF: `SameSite` cookies, origin checks, tokens on state-changing routes;
  CORS exact-origin allowlist, no wildcard with credentials.
- SSRF: server fetches only allowlisted hosts; block private/link-local/
  metadata ranges; resolve-then-connect checks; no redirects followed
  blindly.
- Open redirects, clickjacking (`frame-ancestors`), prototype pollution,
  ReDoS, path traversal, zip-slip, XXE: reviewed per feature.
- Race conditions/double-spend on state transitions: transactions, row
  locks, idempotency keys.
- Business-logic abuse: workflow transitions validated server-side against
  the state machine; no client-set stage/status.
- Webhooks: verify signature and timestamp, replay protection, idempotent
  handling.
- Security headers: HSTS preload, nosniff, strict referrer policy,
  permissions policy, COOP/CORP.

## 6. AI and prompt injection

1. All document, link, email and form text is attacker-controlled. Deliver
   to models as delimited data, never instruction.
2. Read-class AI output cannot chain into a Prepare/Commit tool in the same
   turn; content-derived values need human confirmation before use as tool
   arguments.
3. No AI scoring, ranking, recommendation, matching or assessment
   (Foundation §15/§25), including in email and marketing copy.
4. Model outputs are rendered as text (escaped), never as HTML/markdown
   with active content or auto-fetched URLs/images (data exfiltration
   channel).
5. AI tools run with least privilege; no model has service-role or
   cross-tenant data access; per-request tenant context fixed server-side.
6. Provider fallbacks fail closed. DPA and data-routing decision tracked
   with counsel. Log prompts/responses with PII controls.
7. Red-team suite of injection payloads in uploads runs in CI. **REQUIRED –
   NOT YET BUILT** as a CI suite — individual injection-containment rules
   are implemented per `ARCHITECTURE.md` §9/§10, but no automated red-team
   test suite exercising them exists in CI today.

## 7. Uploads and files

Server-side AV/reputation scan before a file is usable; quarantine on fail
or pending; content-type sniffing; extension and MIME allowlist; size
caps; strip metadata; never parse in the main process without sandboxing;
links reputation-checked and rendered with true destination,
`rel="noopener noreferrer"`. Client-side checks are not controls.

`ARCHITECTURE.md` §10 records this posture as **specified, not yet
independently verified** against a live upload pipeline — re-measure
rather than assume before treating any item here as closed.

## 8. Secrets, supply chain, and build

- No secrets in `VITE_` vars or the bundle; grep the built artifact on
  every rotation; rotate on any suspicion (`ADMIN_SECRET_KEY` and any key
  ever exposed).
- Secret scanning and push protection on the repo; pre-commit hook.
- Dependency scanning on every commit, pinned lockfile, `npm audit` gate,
  Renovate/Dependabot, review install scripts, SBOM. Track
  `xlsx@0.18.5` (unpatched, two high-severity advisories with no fixed
  version available per `ARCHITECTURE.md` §12) and replace.
- Signed commits, branch protection, required review, no direct pushes to
  main, least-privilege CI tokens, 2FA/passkeys on GitHub, Cloudflare,
  Supabase, Resend, OpenAI, HubSpot, domain registrar.
- Subdomain takeover checks, DNSSEC, CAA records, registrar lock.

## 9. Insider and admin risk

- Least privilege, just-in-time production access, all access logged; no
  shared accounts.
- Admin routes behind SSO + passkey + IP/device allowlist; separate from
  user app; never reachable by a secret header alone.
- Background checks and security training for anyone with production
  access.
- Immutable, hash-chained audit log of actor, action, object, time, IP,
  device; alerts on privileged actions and bulk reads. The append-only
  hash chain itself (`pack_v1.record_entry`, `ARCHITECTURE.md` §6) is real
  and live; IP/device fields and privileged-action/bulk-read alerting on
  top of it are not independently confirmed by this documentation pass.
- Break-glass procedure documented. **REQUIRED – NOT YET BUILT.**

## 10. Fraud specific to deal rooms

- Business email compromise/payment redirection: bank-detail changes
  require step-up plus out-of-band confirmation and a cooling-off delay.
  **REQUIRED – NOT YET BUILT**, contingent on §2's step-up authentication.
- Impersonation of founders/investors/lawyers: verified badges only from
  server-side verification; display true identity source. Note: Foundation
  §15/§25 and `CLAUDE.md` §19 prohibit verification *claims/badges* as a
  product feature — this item must be read as an internal fraud control
  constraining what an admin/ops process may assert, never as license to
  reintroduce the retired public-facing badge system.
- Phishing resistance: passkeys, link previews show true destination, no
  sensitive actions from email links without re-auth. **REQUIRED – NOT YET
  BUILT** (passkeys).
- Watermarking and per-viewer access logging on disclosed documents;
  download controls; revocation.

## 11. Detection and response

- Central logs (auth, admin, edge, DB), alerts on anomalies, uptime
  monitoring independent of our infra.
- Incident response plan, 72-hour breach notification workflow
  (DIFC/GDPR), customer communication templates, tabletop twice a year.
  **REQUIRED – NOT YET BUILT.**
- Annual third-party penetration test with summary letter; vulnerability
  disclosure policy and security.txt; bug bounty later. **REQUIRED – NOT
  YET BUILT.**

## 12. Compliance map (confirm with counsel)

DIFC Data Protection Law 2020 (erasure vs soft delete; pseudonymise
transaction records — open question, `CLAUDE.md` §11.2/`ARCHITECTURE.md`
§12), DFSA operational-risk and outsourcing expectations, UAE PDPL, GDPR
for EU users, AML/CFT and sanctions screening for KYC/KYB, eIDAS-compliant
e-signature vendor, SOC 2 Type II and ISO 27001 path, PCI DSS scope
avoided by using a hosted payment provider. **No claim of certification
until it is true** — `CLAUDE.md` §11.3 already states this independently:
"Claim nothing we do not hold. Publish what exists instead," and that a
regulatory sandbox licence does not substitute for SOC 2.

## 13. Pre-merge gate (every PR)

`tsc` error-set diff vs baseline; build; `check-action-split`;
grant-allowlist guard; secret scan; dependency audit; migration dry-run
with `42501` assertions plus real-HTTP smoke; adversarial test as a
no-access account; rate-limit and cost impact stated.

**Status note:** several of the checks this gate requires are themselves
marked REQUIRED – NOT YET BUILT above (the grant-allowlist guard, §1.7;
the CI red-team injection suite, §6.7). This gate cannot be fully enforced
until those exist. The checks that do exist today (`tsc` baseline,
`check-action-split`, build, gzip) are already run on every branch per
`CLAUDE.md` §5.
