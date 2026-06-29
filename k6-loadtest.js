import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const errorRate     = new Rate('errors');
const dealRoomP95   = new Trend('deal_room_latency_ms');
const rlsViolations = new Counter('rls_violations');

const SITE = 'https://hockystick.app';
const SUPA = 'https://ldimninnjlvxozubheib.supabase.co';

// Credentials — all passed via -e flags, never hardcoded
// ANON_KEY  — used for REST API calls (PostgREST apikey header)
// SVC_KEY   — used ONLY for auth/v1/token to bypass hCaptcha (same pattern as Playwright)
const ANON_KEY      = __ENV.ANON_KEY  || '';
const SVC_KEY       = __ENV.SVC_KEY   || '';
const FOUNDER_EMAIL = 'test-founder@hockystick.app';
const FOUNDER_PASS  = __ENV.FOUNDER_PASS  || '';
// Use the permanent test-investor account, NOT drhenry10th (real account)
const INVESTOR_EMAIL = 'test-investor@hockystick.app';
const INVESTOR_PASS  = __ENV.INVESTOR_PASS || '';

// Stable fixture IDs (from CLAUDE.md section 25)
const STARTUP_ID          = 'c9101e5d-619a-4490-a6c9-ce4f0ed78812';
const DEAL_ROOM_ID        = '957f9750-00c7-402a-b1ba-d9c7a4e3ba2f';
const FOUNDER_USER_ID     = 'a5f889f9-d3fa-466f-bd37-b3f00a44c1d9';
const INVESTOR_USER_ID    = '920727d9-77fa-4ecc-a3e4-467e04a0bb38'; // auth UID, used in watchlist.investor_id
const INVESTOR_PROF_ID    = 'c5e48bf8-4991-405d-b21b-23b7e029e427'; // investor_profiles.id
// The test founder is a member of 2 deal rooms via deal_room_members (RLS-expected):
//   957f9750 (Atlas Robotics demo) + 11111111 (own test startup room)
const FOUNDER_ALLOWED_ROOMS = new Set([
  '957f9750-00c7-402a-b1ba-d9c7a4e3ba2f',
  '11111111-2222-3333-4444-555555555555',
]);

// ── Ramp profile for 30,000-user target ──────────────────────────────────────
export const options = {
  stages: [
    { duration: '2m',  target: 500   },   // warm-up
    { duration: '3m',  target: 2000  },   // ramp
    { duration: '5m',  target: 10000 },   // ramp to mid
    { duration: '5m',  target: 30000 },   // target peak
    { duration: '3m',  target: 30000 },   // hold peak
    { duration: '2m',  target: 0     },   // cool-down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<3000'],  // 3s at peak is acceptable
    'http_req_failed':   ['rate<0.05'],
    'errors':            ['rate<0.05'],
    'rls_violations':    ['count<1'],
  },
};

// ── Auth: runs ONCE before VUs start, result passed to all VUs ───────────────
export function setup() {
  if (!ANON_KEY) console.error('ANON_KEY is empty — pass it with -e ANON_KEY=...');
  if (!SVC_KEY)  console.error('SVC_KEY is empty — pass it with -e SVC_KEY=...');
  if (!FOUNDER_PASS)  console.error('FOUNDER_PASS is empty — pass it with -e FOUNDER_PASS=...');
  if (!INVESTOR_PASS) console.error('INVESTOR_PASS is empty — pass it with -e INVESTOR_PASS=...');

  if (!SVC_KEY) return { founderToken: null, investorToken: null };

  // Auth requires the SERVICE ROLE key to bypass hCaptcha (same as Playwright pattern)
  // The resulting user JWT is a normal limited-scope token — safe for test use
  const authHeaders = {
    'apikey':        SVC_KEY,
    'Authorization': `Bearer ${SVC_KEY}`,
    'Content-Type':  'application/json',
  };

  const founderRes = http.post(
    `${SUPA}/auth/v1/token?grant_type=password`,
    JSON.stringify({ email: FOUNDER_EMAIL, password: FOUNDER_PASS }),
    { headers: authHeaders }
  );
  const investorRes = http.post(
    `${SUPA}/auth/v1/token?grant_type=password`,
    JSON.stringify({ email: INVESTOR_EMAIL, password: INVESTOR_PASS }),
    { headers: authHeaders }
  );

  let founderToken  = null;
  let investorToken = null;

  if (founderRes.status === 200) {
    founderToken = JSON.parse(founderRes.body).access_token;
    console.log('Founder auth OK');
  } else {
    console.error('Founder auth FAILED (' + founderRes.status + '): ' + founderRes.body);
  }

  if (investorRes.status === 200) {
    investorToken = JSON.parse(investorRes.body).access_token;
    console.log('Investor auth OK');
  } else {
    console.error('Investor auth FAILED (' + investorRes.status + '): ' + investorRes.body);
  }

  return { founderToken, investorToken };
}

// ── Header builder — uses user JWT as Bearer, anon key as apikey ─────────────
function h(userJwt) {
  return {
    'apikey':        ANON_KEY,
    'Authorization': `Bearer ${userJwt}`,
    'Content-Type':  'application/json',
  };
}

// ── Main VU function ─────────────────────────────────────────────────────────
// 4 personas spread across VUs:
//   0 → anonymous (public pages)
//   1 → founder (Supabase REST reads)
//   2 → investor (Supabase REST reads)
//   3 → team member simulation (subset of founder reads, different pattern)
export default function (data) {
  const { founderToken, investorToken } = data;
  const persona = __VU % 4;

  // ── Persona 0: Anonymous visitor ─────────────────────────────────────────
  if (persona === 0) {
    group('Public pages', () => {
      const responses = http.batch([
        ['GET', `${SITE}/`,         null, { tags: { name: 'landing'  } }],
        ['GET', `${SITE}/sign-in`,  null, { tags: { name: 'sign-in'  } }],
        ['GET', `${SITE}/sign-up`,  null, { tags: { name: 'sign-up'  } }],
        ['GET', `${SITE}/pricing`,  null, { tags: { name: 'pricing'  } }],
      ]);
      responses.forEach(res => {
        const ok = check(res, { 'public 200': r => r.status === 200 });
        errorRate.add(!ok);
      });
      sleep(1);
    });
    return;
  }

  // ── Persona 1: Founder ────────────────────────────────────────────────────
  if (persona === 1) {
    if (!founderToken) { sleep(1); return; }

    group('Founder — profile reads', () => {
      const batch = http.batch([
        ['GET', `${SUPA}/rest/v1/startups?id=eq.${STARTUP_ID}&select=*`,
          null, { headers: h(founderToken), tags: { name: 'startup-profile' } }],
        ['GET', `${SUPA}/rest/v1/startup_profile_sections?startup_id=eq.${STARTUP_ID}&select=section_key,visibility`,
          null, { headers: h(founderToken), tags: { name: 'profile-sections' } }],
        ['GET', `${SUPA}/rest/v1/deal_rooms?startup_id=eq.${STARTUP_ID}&select=id,workflow_stage`,
          null, { headers: h(founderToken), tags: { name: 'founder-deal-rooms' } }],
        ['GET', `${SUPA}/rest/v1/founder_documents?startup_id=eq.${STARTUP_ID}&select=id,title,template_slug&limit=20`,
          null, { headers: h(founderToken), tags: { name: 'founder-docs' } }],
      ]);
      batch.forEach(res => {
        const ok = check(res, { 'founder read 200': r => r.status === 200 });
        errorRate.add(!ok);
      });
    });

    group('Founder — deal room', () => {
      const start = Date.now();
      const batch = http.batch([
        ['GET', `${SUPA}/rest/v1/deal_rooms?id=eq.${DEAL_ROOM_ID}&select=*`,
          null, { headers: h(founderToken), tags: { name: 'deal-room-meta' } }],
        ['GET', `${SUPA}/rest/v1/deal_room_qa?deal_room_id=eq.${DEAL_ROOM_ID}&limit=50`,
          null, { headers: h(founderToken), tags: { name: 'deal-room-qa' } }],
        ['GET', `${SUPA}/rest/v1/deal_room_dd_goals?deal_room_id=eq.${DEAL_ROOM_ID}&select=*`,
          null, { headers: h(founderToken), tags: { name: 'deal-room-dd' } }],
        ['GET', `${SUPA}/rest/v1/deal_room_notes?deal_room_id=eq.${DEAL_ROOM_ID}&select=id,title,created_at&limit=20`,
          null, { headers: h(founderToken), tags: { name: 'deal-room-notes' } }],
      ]);
      dealRoomP95.add(Date.now() - start);
      batch.forEach(res => {
        const ok = check(res, { 'deal room 200': r => r.status === 200 });
        errorRate.add(!ok);
      });
    });

    // RLS check: founder must not see deal rooms they are not a member of.
    // The test founder is legitimately a member of exactly 2 rooms (deal_room_members rows).
    // Any room outside FOUNDER_ALLOWED_ROOMS is a genuine RLS leak.
    group('Founder — RLS check', () => {
      const allRooms = http.get(
        `${SUPA}/rest/v1/deal_rooms?select=id&limit=100`,
        { headers: h(founderToken), tags: { name: 'rls-founder-rooms' } }
      );
      if (allRooms.status === 200) {
        let rows;
        try { rows = JSON.parse(allRooms.body); } catch { rows = []; }
        const leaked = rows.filter(r => !FOUNDER_ALLOWED_ROOMS.has(r.id));
        if (leaked.length > 0) {
          rlsViolations.add(leaked.length);
          console.error(`RLS VIOLATION: founder sees ${leaked.length} deal rooms they are not a member of`);
        }
      }
    });

    sleep(1);
    return;
  }

  // ── Persona 2: Investor ───────────────────────────────────────────────────
  if (persona === 2) {
    if (!investorToken) { sleep(1); return; }

    group('Investor — dashboard reads', () => {
      const batch = http.batch([
        ['GET', `${SUPA}/rest/v1/investor_watchlist?investor_id=eq.${INVESTOR_PROF_ID}&select=*&limit=20`,
          null, { headers: h(investorToken), tags: { name: 'watchlist' } }],
        ['GET', `${SUPA}/rest/v1/deal_rooms?select=id,workflow_stage&limit=10`,
          null, { headers: h(investorToken), tags: { name: 'investor-deal-rooms' } }],
        ['GET', `${SUPA}/rest/v1/notifications?read=eq.false&select=id,title&limit=10`,
          null, { headers: h(investorToken), tags: { name: 'notifications' } }],
        ['GET', `${SUPA}/rest/v1/investor_profiles?user_id=eq.${INVESTOR_PROF_ID}&select=fund_name,thesis,sectors,stages`,
          null, { headers: h(investorToken), tags: { name: 'investor-profile' } }],
      ]);
      batch.forEach(res => {
        const ok = check(res, { 'investor read 200': r => r.status === 200 });
        errorRate.add(!ok);
      });
    });

    // RLS check: investor must not see private founder profile sections
    group('Investor — RLS private sections check', () => {
      const priv = http.get(
        `${SUPA}/rest/v1/startup_profile_sections?visibility=eq.private&select=id,startup_id&limit=10`,
        { headers: h(investorToken), tags: { name: 'rls-private-sections' } }
      );
      if (priv.status === 200) {
        let rows;
        try { rows = JSON.parse(priv.body); } catch { rows = []; }
        if (rows.length > 0) {
          rlsViolations.add(rows.length);
          console.error(`RLS VIOLATION: investor can read ${rows.length} private profile sections`);
        }
      }
    });

    // RLS check: investor must only see their own watchlist rows.
    // investor_watchlist.investor_id stores the auth user ID (not profile ID).
    group('Investor — RLS watchlist isolation check', () => {
      const allWatchlist = http.get(
        `${SUPA}/rest/v1/investor_watchlist?select=id,investor_id&limit=50`,
        { headers: h(investorToken), tags: { name: 'rls-watchlist-isolation' } }
      );
      if (allWatchlist.status === 200) {
        let rows;
        try { rows = JSON.parse(allWatchlist.body); } catch { rows = []; }
        // investor_id in this table is the auth UID, not the profile row ID
        const leaked = rows.filter(r => r.investor_id && r.investor_id !== INVESTOR_USER_ID);
        if (leaked.length > 0) {
          rlsViolations.add(leaked.length);
          console.error(`RLS VIOLATION: investor sees ${leaked.length} watchlist rows from other investors`);
        }
      }
    });

    sleep(1);
    return;
  }

  // ── Persona 3: Team member (uses founder token — same startup, member role) ─
  // Simulates a manager/analyst team member browsing shared pages
  if (persona === 3) {
    if (!founderToken) { sleep(1); return; }

    group('Team member — read-only views', () => {
      const batch = http.batch([
        ['GET', `${SUPA}/rest/v1/startups?id=eq.${STARTUP_ID}&select=company_name,stage,sector,tagline`,
          null, { headers: h(founderToken), tags: { name: 'team-startup-read' } }],
        ['GET', `${SUPA}/rest/v1/startup_team_accounts?startup_id=eq.${STARTUP_ID}&select=id,role,user_id`,
          null, { headers: h(founderToken), tags: { name: 'team-members-list' } }],
        ['GET', `${SUPA}/rest/v1/deal_rooms?startup_id=eq.${STARTUP_ID}&select=id,workflow_stage,created_at`,
          null, { headers: h(founderToken), tags: { name: 'team-deal-rooms' } }],
        ['GET', `${SUPA}/rest/v1/activity_log?account_id=eq.${FOUNDER_USER_ID}&select=id,action_type,created_at&limit=20`,
          null, { headers: h(founderToken), tags: { name: 'team-activity-log' } }],
      ]);
      batch.forEach(res => {
        const ok = check(res, { 'team member read 200': r => r.status === 200 });
        errorRate.add(!ok);
      });
    });

    sleep(1);
  }
}

// ── Summary report ────────────────────────────────────────────────────────────
export function handleSummary(data) {
  const m       = data.metrics;
  const errRate = ((m.http_req_failed?.values?.rate ?? 0) * 100).toFixed(2);
  const p95     = m.http_req_duration?.values?.['p(95)']?.toFixed(0) ?? 'N/A';
  const reqs    = m.http_reqs?.values?.count ?? 0;
  const rls     = m.rls_violations?.values?.count ?? 0;
  const drP95   = m.deal_room_latency_ms?.values?.['p(95)']?.toFixed(0) ?? 'N/A';
  const passed  = parseFloat(errRate) < 5 && rls === 0;

  const out = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  HOCKYSTICK — LOAD-1 RESULTS (30K target)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Total requests:     ${reqs}
  Error rate:         ${errRate}%
  HTTP p(95):         ${p95}ms
  Deal room p(95):    ${drP95}ms
  RLS violations:     ${rls}
  Result:             ${passed ? '✅  PASSED' : '❌  FAILED'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

  console.log(out);
  return { stdout: out + '\n' };
}
