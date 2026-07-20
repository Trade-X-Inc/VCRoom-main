import pw from "/Users/macbookpro/VCROOM/VCRoom-main/frontend/node_modules/playwright-core/index.js";
const { chromium } = pw;
import fs from "fs";
function le(p){ return Object.fromEntries(fs.readFileSync(p,"utf-8").split("\n").filter(l=>l.trim()&&!l.startsWith("#")).map(l=>{const i=l.indexOf("=");return [l.slice(0,i).trim(),l.slice(i+1).trim()];})); }
const te = le("/Users/macbookpro/VCROOM/VCRoom-main/.env.test");
const lenv = le("/Users/macbookpro/VCROOM/VCRoom-main/frontend/.env.local");
const SUPA = lenv.SUPABASE_URL, KEY = lenv.SUPABASE_SERVICE_ROLE_KEY;
const OUT = "/private/tmp/claude-501/-Users-macbookpro-VCROOM-VCRoom-main/1901926f-93a8-43c1-b8da-dc83c0dd2d8e/scratchpad";
const ROOM = "11111111-2222-3333-4444-555555555555";
const svc=(p,o={})=>fetch(`${SUPA}/rest/v1/${p}`,{...o,headers:{apikey:KEY,Authorization:`Bearer ${KEY}`,"Content-Type":"application/json",Prefer:o.prefer||"return=minimal"}});
async function mintS(email,password){ const r=await fetch(`${SUPA}/auth/v1/token?grant_type=password`,{method:"POST",headers:{"Content-Type":"application/json",apikey:KEY,Authorization:`Bearer ${KEY}`},body:JSON.stringify({email,password})}); const d=await r.json(); return { access_token:d.access_token, token_type:"bearer", expires_in:3600, expires_at:Math.floor(Date.now()/1000)+3600, refresh_token:d.refresh_token, user:d.user }; }
const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
const R=[]; const ck=(n,p,d="")=>{R.push({n,p});console.log(`${p?"PASS":"FAIL"} — ${n}${d?` (${d})`:""}`);};

// fn endpoint builder (same encoding sniffed in R15A; but framing differs -> instead drive via UI)
const browser = await chromium.launch({ headless:true });
async function open(storage, path){
  const ctx = await browser.newContext({ viewport:{width:1280,height:1000} });
  await ctx.addInitScript((v)=>localStorage.setItem("sb-ldimninnjlvxozubheib-auth-token", JSON.stringify(v)), storage);
  const page = await ctx.newPage();
  await page.goto(`http://localhost:8080${path}`,{waitUntil:"domcontentloaded"}).catch(()=>{});
  // wait until the deal-room shell hydrated past "Loading…"
  await page.waitForFunction(()=>!/^\s*Loading…?\s*$/.test(document.body.innerText.trim()), { timeout: 20000 }).catch(()=>{});
  await page.waitForTimeout(5000);
  return page;
}
const fSt=await mintS(te.TEST_FOUNDER_EMAIL,te.TEST_FOUNDER_PASSWORD);
const lSt=await mintS(te.TEST_LAWYER_EMAIL,te.TEST_LAWYER_PASSWORD);

// ── ADDED TEST 2 — honest summary-failure UI state ──────────────────────────
// Force the failure marker: locked terms, NO active summary, summary_error set.
async function forceFailedState(){
  await svc(`deal_room_summaries?deal_room_id=eq.${ROOM}`,{method:"DELETE"});
  await svc(`deal_room_terms?deal_room_id=eq.${ROOM}`,{method:"PATCH",body:JSON.stringify({status:"locked"})});
  await svc(`deal_room_term_config?deal_room_id=eq.${ROOM}`,{method:"PATCH",body:JSON.stringify({locked_at:new Date().toISOString(),summary_error:"generation_failed",summary_error_at:new Date().toISOString()})});
}
await forceFailedState();

const founder = await open(fSt, `/app/deal-rooms/${ROOM}/term-sheets`);
await wait(2500);
let t = await founder.page ? "" : "";
t = await founder.evaluate(()=>document.body.innerText);
const showsError = /Summary generation failed/.test(t);
const showsRetry = await founder.getByRole("button",{name:/Retry generation/i}).count();
const showsFakeGenerating = /being generated|Generating the agreed-terms summary/.test(t) && !showsError;
ck("ADDED-2: failure shows honest error (not fake 'generating')", showsError && !showsFakeGenerating, showsError?"error state shown":"NOT shown");
ck("ADDED-2: principal sees a Retry action", showsRetry>0, `${showsRetry} retry buttons`);
await founder.screenshot({ path:`${OUT}/r15b_summary_error.png`, fullPage:false });

// lawyer view of the SAME failed state: should NOT see a retry (principal-only), but an honest 'not available'
const lawyer = await open(lSt, `/app/deal-rooms/${ROOM}/term-sheets`);
await wait(2500);
const lt = await lawyer.evaluate(()=>document.body.innerText);
const lawRetry = await lawyer.getByRole("button",{name:/Retry generation/i}).count();
ck("ADDED-2: lawyer does NOT get a retry button (principal-only)", lawRetry===0, `${lawRetry} retry buttons`);

console.log(`\nR15B UI SECURITY: ${R.filter(r=>r.p).length}/${R.length} pass`);
await browser.close();
