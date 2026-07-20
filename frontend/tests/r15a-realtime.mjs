import pw from "/Users/macbookpro/VCROOM/VCRoom-main/frontend/node_modules/playwright-core/index.js";
const { chromium } = pw;
import fs from "fs";
function le(p){ return Object.fromEntries(fs.readFileSync(p,"utf-8").split("\n").filter(l=>l.trim()&&!l.startsWith("#")).map(l=>{const i=l.indexOf("=");return [l.slice(0,i).trim(),l.slice(i+1).trim()];})); }
const te = le("/Users/macbookpro/VCROOM/VCRoom-main/.env.test");
const lenv = le("/Users/macbookpro/VCROOM/VCRoom-main/frontend/.env.local");
const SUPA = lenv.SUPABASE_URL, KEY = lenv.SUPABASE_SERVICE_ROLE_KEY;
const OUT = "/private/tmp/claude-501/-Users-macbookpro-VCROOM-VCRoom-main/1901926f-93a8-43c1-b8da-dc83c0dd2d8e/scratchpad";
const ROOM = "11111111-2222-3333-4444-555555555555";
const sb = (path, opts={}) => fetch(`${SUPA}/rest/v1/${path}`, { ...opts, headers:{ apikey:KEY, Authorization:`Bearer ${KEY}`, "Content-Type":"application/json", Prefer: opts.prefer||"return=minimal", ...(opts.headers||{}) }});
async function mint(email,password){ const r=await fetch(`${SUPA}/auth/v1/token?grant_type=password`,{method:"POST",headers:{"Content-Type":"application/json",apikey:KEY,Authorization:`Bearer ${KEY}`},body:JSON.stringify({email,password})}); const d=await r.json(); return { access_token:d.access_token, token_type:"bearer", expires_in:3600, expires_at:Math.floor(Date.now()/1000)+3600, refresh_token:d.refresh_token, user:d.user }; }

// Clean slate for this room
await sb(`deal_room_term_proposals?deal_room_id=eq.${ROOM}`, { method:"DELETE" });
await sb(`deal_room_terms?deal_room_id=eq.${ROOM}`, { method:"DELETE" });
await sb(`deal_room_term_config?deal_room_id=eq.${ROOM}`, { method:"DELETE" });
console.log("cleaned prior R15A state for room");

const fSt = await mint(te.TEST_FOUNDER_EMAIL, te.TEST_FOUNDER_PASSWORD);
const iSt = await mint(te.TEST_INVESTOR_EMAIL, te.TEST_INVESTOR_PASSWORD);
const browser = await chromium.launch({ headless:true });

async function open(storage){
  const ctx = await browser.newContext({ viewport:{width:1280,height:1000} });
  await ctx.addInitScript((v)=>localStorage.setItem("sb-ldimninnjlvxozubheib-auth-token", JSON.stringify(v)), storage);
  const page = await ctx.newPage();
  await page.goto(`http://localhost:8080/app/deal-rooms/${ROOM}/term-sheets`,{waitUntil:"domcontentloaded"}).catch(()=>{});
  await page.waitForTimeout(4000);
  return { ctx, page };
}

const inv = await open(iSt);
const fnd = await open(fSt);

// Founder selects SAFE instrument (seeds terms). Both should show the terms.
await fnd.page.getByRole("button",{name:/SAFE/i}).first().click().catch(()=>{});
await fnd.page.waitForTimeout(3000);
const invHasTermsAfterSelect = await inv.page.getByText(/Valuation cap/i).count();
console.log("[realtime] investor sees seeded terms after founder selected SAFE (no reload):", invHasTermsAfterSelect>0);

// Founder proposes a valuation cap value. Investor's OPEN page must update live.
// Find the Valuation cap row's Propose button on founder side.
await fnd.page.getByRole("button",{name:/^Propose$/i}).first().click().catch(()=>{});
await fnd.page.waitForTimeout(800);
await fnd.page.locator("input[placeholder*='valuation cap' i]").first().fill("$8,000,000").catch(async()=>{
  await fnd.page.locator("input").first().fill("$8,000,000");
});
await fnd.page.getByRole("button",{name:/Send proposal/i}).click().catch(()=>{});
console.log("[founder] sent valuation cap proposal: $8,000,000");

// Poll investor page for the value WITHOUT reloading
let arrived=false, ms=0;
for (let i=0;i<20;i++){
  await inv.page.waitForTimeout(500); ms+=500;
  const t = await inv.page.evaluate(()=>document.body.innerText);
  if (t.includes("$8,000,000")) { arrived=true; break; }
}
console.log(`[realtime] investor received founder's proposed value WITHOUT reload: ${arrived} (~${ms}ms)`);

// Screenshot both views side-by-side proof
await inv.page.screenshot({ path:`${OUT}/r15a_realtime_investor.png`, fullPage:false });
await fnd.page.screenshot({ path:`${OUT}/r15a_realtime_founder.png`, fullPage:false });
console.log("screenshots saved");
await browser.close();
