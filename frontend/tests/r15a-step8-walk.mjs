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
const R=[]; const ck=(n,p,d="")=>{R.push({n,p});console.log(`${p?"PASS":"FAIL"} — ${n}${d?` (${d})`:""}`);};

// Clean slate
await sb(`deal_room_term_reset_requests?deal_room_id=eq.${ROOM}`, { method:"DELETE", prefer:"return=minimal" });
await sb(`deal_room_term_proposals?deal_room_id=eq.${ROOM}`, { method:"DELETE", prefer:"return=minimal" });
await sb(`deal_room_terms?deal_room_id=eq.${ROOM}`, { method:"DELETE", prefer:"return=minimal" });
await sb(`deal_room_term_config?deal_room_id=eq.${ROOM}`, { method:"DELETE", prefer:"return=minimal" });

const fSt = await mintS(te.TEST_FOUNDER_EMAIL, te.TEST_FOUNDER_PASSWORD);
const iSt = await mintS(te.TEST_INVESTOR_EMAIL, te.TEST_INVESTOR_PASSWORD);
const lSt = await mintS(te.TEST_LAWYER_EMAIL, te.TEST_LAWYER_PASSWORD);
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
const rowOf = (page,key)=>page.locator(`[data-testid="term-row-${key}"]`);
async function clickIn(page,key,rx){ const b=rowOf(page,key).getByRole("button",{name:rx}).first(); await b.waitFor({state:"visible",timeout:8000}); await b.click(); }
async function proposeIn(page,key,val,counter=false){
  await clickIn(page,key,counter?/Counter/:/Propose/); await wait(500);
  await page.locator("input").last().fill(val);
  await page.getByRole("button",{name:counter?/Send counter/:/Send proposal/}).click(); await wait(1600);
}

// STEP 8.1 — founder selects SAFE
await F.getByRole("button",{name:/^SAFE/}).first().click(); await wait(2500);
ck("8.1 SAFE selected — 4 standard terms seeded", (await sb(`deal_room_terms?deal_room_id=eq.${ROOM}&select=term_key`).then(r=>r.json())).length===4);

// STEP 8.2 — founder proposes valuation cap -> investor sees real-time -> investor REJECTS WITH COUNTER -> founder ACCEPTS COUNTER -> locked
await proposeIn(F,"valuation_cap","$8,000,000");
await wait(1500);
// investor sees it live (no reload)
const invSaw = (await I.evaluate(()=>document.body.innerText)).includes("$8,000,000");
ck("8.2 investor sees founder's proposal in real-time (no reload)", invSaw);
// investor counter-proposes $6M (reject-with-counter: the Counter action carries the new value)
await proposeIn(I,"valuation_cap","$6,000,000",true);
await wait(1500);
// founder accepts the counter -> awaiting investor's own accept (mutual) -> investor accepts -> lock
await clickIn(F,"valuation_cap",/Accept/); await wait(2000);
// settle the investor view (close any lingering editor) before the final accept
await I.reload({waitUntil:"domcontentloaded"}); await wait(3500);
{ const b=rowOf(I,"valuation_cap").getByRole("button",{name:/Accept/}); await b.first().waitFor({state:"visible",timeout:8000}); await b.first().click(); await wait(2000); }
const vcStatus = (await sb(`deal_room_terms?deal_room_id=eq.${ROOM}&term_key=eq.valuation_cap&select=status,current_value`).then(r=>r.json()))[0];
ck("8.2 valuation_cap locked at counter value $6M", vcStatus.status==="locked" && vcStatus.current_value==="$6,000,000", JSON.stringify(vcStatus));

// STEP 8.3 — repeat for remaining SAFE terms until AUTO-LOCK
for (const key of ["discount_rate","pro_rata_rights","mfn_clause"]) {
  await proposeIn(F,key,key==="discount_rate"?"20":"true"); await wait(1300);
  await clickIn(I,key,/Accept/); await wait(1500);   // investor accepts founder's proposal (no counter -> no editor race)
  await clickIn(F,key,/Accept/); await wait(1500);   // founder accepts -> lock
}
await wait(2500);
const terms = await sb(`deal_room_terms?deal_room_id=eq.${ROOM}&select=term_key,status&order=created_at`).then(r=>r.json());
const cfg = (await sb(`deal_room_term_config?deal_room_id=eq.${ROOM}&select=*`).then(r=>r.json()))[0];
ck("8.3 all 4 terms locked", terms.every(t=>t.status==="locked"), terms.map(t=>`${t.term_key}=${t.status}`).join(","));
ck("8.3 AUTO-LOCK fired (config.locked_at set)", !!cfg?.locked_at, cfg?.locked_at||"null");

// STEP 8.4 — screenshots: finalized state both roles + audit trail
await F.reload({waitUntil:"domcontentloaded"}); await wait(3500);
await I.reload({waitUntil:"domcontentloaded"}); await wait(3500);
await F.screenshot({ path:`${OUT}/step8_finalized_founder.png`, fullPage:false });
await I.screenshot({ path:`${OUT}/step8_finalized_investor.png`, fullPage:false });
// audit trail for valuation_cap
{ const h=rowOf(F,"valuation_cap").getByRole("button",{name:/History/}); if(await h.count()){await h.click();await wait(800);} }
await F.screenshot({ path:`${OUT}/step8_audit_trail.png`, fullPage:false });

// lawyer view — must NOT see the negotiation (LawyerRoomView interception)
const L = await open(lSt);
await wait(3000);
const lawText = await L.evaluate(()=>document.body.innerText);
const lawSeesNegotiation = /Valuation cap|Term negotiation|\$6,000,000|Propose/.test(lawText);
ck("8.4 lawyer at /term-sheets does NOT see term negotiation", !lawSeesNegotiation, lawSeesNegotiation?"LEAK":"intercepted");
await L.screenshot({ path:`${OUT}/step8_lawyer_view.png`, fullPage:false });

// R15B seam
const seam = await sb(`deal_room_terms?deal_room_id=eq.${ROOM}&status=eq.locked&select=term_key,term_label,value_type,current_value,is_custom&order=created_at`).then(r=>r.json());
console.log("\nR15B SEAM:", JSON.stringify(seam));
console.log(`\nSTEP 8: ${R.filter(r=>r.p).length}/${R.length} pass`);
await browser.close();
