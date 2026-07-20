import pw from "/Users/macbookpro/VCROOM/VCRoom-main/frontend/node_modules/playwright-core/index.js";
const { chromium } = pw;
import fs from "fs";
function le(p){ return Object.fromEntries(fs.readFileSync(p,"utf-8").split("\n").filter(l=>l.trim()&&!l.startsWith("#")).map(l=>{const i=l.indexOf("=");return [l.slice(0,i).trim(),l.slice(i+1).trim()];})); }
const te = le("/Users/macbookpro/VCROOM/VCRoom-main/.env.test");
const lenv = le("/Users/macbookpro/VCROOM/VCRoom-main/frontend/.env.local");
const SUPA = lenv.SUPABASE_URL, KEY = lenv.SUPABASE_SERVICE_ROLE_KEY;
const OUT = "/private/tmp/claude-501/-Users-macbookpro-VCROOM-VCRoom-main/1901926f-93a8-43c1-b8da-dc83c0dd2d8e/scratchpad";
const ROOM = "11111111-2222-3333-4444-555555555555";
const sb = (path, opts={}) => fetch(`${SUPA}/rest/v1/${path}`, { ...opts, headers:{ apikey:KEY, Authorization:`Bearer ${KEY}`, "Content-Type":"application/json", Prefer: opts.prefer||"return=representation", ...(opts.headers||{}) }});
async function mintS(email,password){ const r=await fetch(`${SUPA}/auth/v1/token?grant_type=password`,{method:"POST",headers:{"Content-Type":"application/json",apikey:KEY,Authorization:`Bearer ${KEY}`},body:JSON.stringify({email,password})}); const d=await r.json(); return { access_token:d.access_token, token_type:"bearer", expires_in:3600, expires_at:Math.floor(Date.now()/1000)+3600, refresh_token:d.refresh_token, user:d.user }; }
const wait = (ms)=>new Promise(r=>setTimeout(r,ms));

// Clean + seed SAFE with one proposed term so a reset would have something to wipe.
await sb(`deal_room_term_reset_requests?deal_room_id=eq.${ROOM}`, { method:"DELETE", prefer:"return=minimal" });
await sb(`deal_room_term_proposals?deal_room_id=eq.${ROOM}`, { method:"DELETE", prefer:"return=minimal" });
await sb(`deal_room_terms?deal_room_id=eq.${ROOM}`, { method:"DELETE", prefer:"return=minimal" });
await sb(`deal_room_term_config?deal_room_id=eq.${ROOM}`, { method:"DELETE", prefer:"return=minimal" });
await sb(`deal_room_term_config`, { method:"POST", body: JSON.stringify({ deal_room_id: ROOM, instrument_type:"safe", instrument_locked:true }), prefer:"return=minimal" });
await sb(`deal_room_terms`, { method:"POST", body: JSON.stringify({ deal_room_id: ROOM, instrument_type:"safe", term_key:"valuation_cap", term_label:"Valuation cap", value_type:"currency", status:"proposed", current_value:"$8,000,000", awaiting_role:"investor" }), prefer:"return=minimal" });

const fSt = await mintS(te.TEST_FOUNDER_EMAIL, te.TEST_FOUNDER_PASSWORD);
const iSt = await mintS(te.TEST_INVESTOR_EMAIL, te.TEST_INVESTOR_PASSWORD);
const browser = await chromium.launch({ headless:true });
async function open(storage){
  const ctx = await browser.newContext({ viewport:{width:1280,height:1000} });
  await ctx.addInitScript((v)=>localStorage.setItem("sb-ldimninnjlvxozubheib-auth-token", JSON.stringify(v)), storage);
  const page = await ctx.newPage();
  await page.goto(`http://localhost:8080/app/deal-rooms/${ROOM}/term-sheets`,{waitUntil:"domcontentloaded"}).catch(()=>{});
  await page.waitForTimeout(3500);
  return page;
}
const F = await open(fSt), I = await open(iSt);
const termCount = async () => (await sb(`deal_room_terms?deal_room_id=eq.${ROOM}&select=term_key`).then(r=>r.json())).length;
const results=[]; const check=(n,p,d="")=>{results.push({n,p});console.log(`${p?"PASS":"FAIL"} — ${n}${d?` (${d})`:""}`);};

console.log(`Before: ${await termCount()} SAFE terms exist.`);

// FOUNDER requests a reset to Equity (via the switch button -> dialog -> Request reset)
await F.getByRole("button",{name:/Switch to Equity/i}).click();
await wait(500);
await F.getByRole("button",{name:/Request reset/i}).click();
await wait(2000);
const req = (await sb(`deal_room_term_reset_requests?deal_room_id=eq.${ROOM}&status=eq.pending&select=*`).then(r=>r.json()))[0];
check("founder opened a pending reset request", !!req, req?`target=${req.target_instrument}`:"none");

// DIRECTION A: founder (requester) must NOT be able to approve their own request.
// The requester's UI shows NO approve button (only "awaiting"), so terms stay intact.
const founderSeesApprove = await F.getByRole("button",{name:/Approve reset/i}).count();
check("founder (requester) sees NO approve button on own request", founderSeesApprove===0, `${founderSeesApprove} buttons`);
// terms still intact after founder's unilateral attempt
check("DIRECTION A: founder alone did NOT wipe terms", (await termCount())===1, `${await termCount()} terms remain`);

// The investor SEES approve/decline (counterparty).
await wait(1500);
const investorSeesApprove = await I.getByRole("button",{name:/Approve reset/i}).count();
check("investor (counterparty) sees approve button", investorSeesApprove>0, `${investorSeesApprove} buttons`);

// INVESTOR approves -> reset happens (Equity seeded, SAFE terms wiped).
await I.getByRole("button",{name:/Approve reset/i}).click();
await wait(2500);
const after = await sb(`deal_room_terms?deal_room_id=eq.${ROOM}&select=term_key,instrument_type`).then(r=>r.json());
const isEquity = after.length>0 && after.every(t=>t.instrument_type==="equity");
check("counterparty approval performed the reset (now Equity terms)", isEquity, `${after.length} terms, instrument=${after[0]?.instrument_type}`);

// DIRECTION B: investor requests, investor must NOT approve own.
await sb(`deal_room_term_reset_requests?deal_room_id=eq.${ROOM}`, { method:"DELETE", prefer:"return=minimal" });
await I.reload({waitUntil:"domcontentloaded"}); await wait(3000);
await I.getByRole("button",{name:/Switch to SAFE/i}).click(); await wait(500);
await I.getByRole("button",{name:/Request reset/i}).click(); await wait(2000);
const req2 = (await sb(`deal_room_term_reset_requests?deal_room_id=eq.${ROOM}&status=eq.pending&select=*`).then(r=>r.json()))[0];
const investorSeesApproveOwn = await I.getByRole("button",{name:/Approve reset/i}).count();
check("DIRECTION B: investor (requester) sees NO approve on own request", investorSeesApproveOwn===0 && !!req2, `${investorSeesApproveOwn} buttons`);

await I.screenshot({ path:`${OUT}/r15a_reset_investor.png`, fullPage:false });
await F.screenshot({ path:`${OUT}/r15a_reset_founder.png`, fullPage:false });

// cleanup
await sb(`deal_room_term_reset_requests?deal_room_id=eq.${ROOM}`, { method:"DELETE", prefer:"return=minimal" });
console.log(`\nRESET-BYPASS: ${results.filter(r=>r.p).length}/${results.length} pass`);
await browser.close();
