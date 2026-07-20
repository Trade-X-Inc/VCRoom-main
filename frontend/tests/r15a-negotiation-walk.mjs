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

await sb(`deal_room_term_proposals?deal_room_id=eq.${ROOM}`, { method:"DELETE", prefer:"return=minimal" });
await sb(`deal_room_terms?deal_room_id=eq.${ROOM}`, { method:"DELETE", prefer:"return=minimal" });
await sb(`deal_room_term_config?deal_room_id=eq.${ROOM}`, { method:"DELETE", prefer:"return=minimal" });

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
const rowOf = (page,key)=>page.locator(`[data-testid="term-row-${key}"]`);
async function clickIn(page,key,rx){ const r=rowOf(page,key); const b=r.getByRole("button",{name:rx}).first(); await b.waitFor({state:"visible",timeout:8000}); await b.click(); }
async function proposeIn(page,key,val,counter=false){
  await clickIn(page,key,counter?/Counter/:/Propose/);
  await wait(500);
  await page.locator("input").last().fill(val);
  await page.getByRole("button",{name:counter?/Send counter/:/Send proposal/}).click();
  await wait(1600);
}

// Founder selects SAFE
await F.getByRole("button",{name:/^SAFE/}).first().click();
await wait(2500);

// valuation_cap: F propose $8M -> I reject(suggest) -> I propose $6M -> F accept -> I accept -> lock
await proposeIn(F,"valuation_cap","$8,000,000");
await wait(1500);
await clickIn(I,"valuation_cap",/^Reject$/); await wait(400);
await I.locator("input").last().fill("prefer $6M"); await I.getByRole("button",{name:/Reject term/}).click(); await wait(1600);
// after reject, awaiting founder; founder re-proposes $6M as the value both want
await proposeIn(F,"valuation_cap","$6,000,000");
await wait(1500);
await clickIn(I,"valuation_cap",/Accept/); await wait(1600);   // investor accepts -> awaiting founder
await clickIn(F,"valuation_cap",/Accept/); await wait(1800);   // founder accepts -> lock

// remaining terms: F propose, I accept, F accept -> lock
for (const key of ["discount_rate","pro_rata_rights","mfn_clause"]) {
  await proposeIn(F,key,key==="discount_rate"?"20":"true");
  await wait(1200);
  await clickIn(I,key,/Accept/); await wait(1500);
  await clickIn(F,key,/Accept/); await wait(1600);
}
await wait(2500);

const terms = await (await sb(`deal_room_terms?deal_room_id=eq.${ROOM}&select=term_key,status&order=created_at`)).json();
const cfg = (await (await sb(`deal_room_term_config?deal_room_id=eq.${ROOM}&select=*`)).json())[0];
console.log("statuses:", terms.map(t=>`${t.term_key}=${t.status}`).join(", "));
console.log("AUTO-LOCK config.locked_at:", cfg?.locked_at, "| all locked:", terms.every(t=>t.status==="locked"));
const seam = await (await sb(`deal_room_terms?deal_room_id=eq.${ROOM}&status=eq.locked&select=term_key,term_label,value_type,current_value,is_custom&order=created_at`)).json();
console.log("R15B SEAM:", JSON.stringify(seam));

await F.reload({waitUntil:"domcontentloaded"}); await wait(3500);
await I.reload({waitUntil:"domcontentloaded"}); await wait(3500);
await F.screenshot({ path:`${OUT}/r15a_finalized_founder.png`, fullPage:false });
await I.screenshot({ path:`${OUT}/r15a_finalized_investor.png`, fullPage:false });
const h = rowOf(F,"valuation_cap").getByRole("button",{name:/History/});
if (await h.count()) { await h.click(); await wait(800); }
await F.screenshot({ path:`${OUT}/r15a_audit_trail.png`, fullPage:false });
console.log("screenshots saved");
await browser.close();
