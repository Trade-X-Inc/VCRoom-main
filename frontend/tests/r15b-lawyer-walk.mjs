import pw from "/Users/macbookpro/VCROOM/VCRoom-main/frontend/node_modules/playwright-core/index.js";
const { chromium } = pw;
import fs from "fs";
function le(p){ return Object.fromEntries(fs.readFileSync(p,"utf-8").split("\n").filter(l=>l.trim()&&!l.startsWith("#")).map(l=>{const i=l.indexOf("=");return [l.slice(0,i).trim(),l.slice(i+1).trim()];})); }
const te = le("/Users/macbookpro/VCROOM/VCRoom-main/.env.test");
const lenv = le("/Users/macbookpro/VCROOM/VCRoom-main/frontend/.env.local");
const SUPA = lenv.SUPABASE_URL, KEY = lenv.SUPABASE_SERVICE_ROLE_KEY;
const OUT = "/private/tmp/claude-501/-Users-macbookpro-VCROOM-VCRoom-main/1901926f-93a8-43c1-b8da-dc83c0dd2d8e/scratchpad";
const ROOM = "11111111-2222-3333-4444-555555555555";
const svc=(p,o={})=>fetch(`${SUPA}/rest/v1/${p}`,{...o,headers:{apikey:KEY,Authorization:`Bearer ${KEY}`,"Content-Type":"application/json",Prefer:o.prefer||"return=representation",...(o.headers||{})}});
async function mintS(email,password){ const r=await fetch(`${SUPA}/auth/v1/token?grant_type=password`,{method:"POST",headers:{"Content-Type":"application/json",apikey:KEY,Authorization:`Bearer ${KEY}`},body:JSON.stringify({email,password})}); const d=await r.json(); return { access_token:d.access_token, token_type:"bearer", expires_in:3600, expires_at:Math.floor(Date.now()/1000)+3600, refresh_token:d.refresh_token, user:d.user }; }
const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
const R=[]; const ck=(n,p,d="")=>{R.push({n,p});console.log(`${p?"PASS":"FAIL"} — ${n}${d?` (${d})`:""}`);};

// (assumes autogen.mjs already ran: 4 locked terms + active summary present)
const summ0=(await svc(`deal_room_summaries?deal_room_id=eq.${ROOM}&status=eq.active&select=content`).then(r=>r.json()))[0];
ck("precondition: active summary present", !!summ0);
// clean any prior agreements
await svc(`deal_room_agreement_comments?deal_room_id=eq.${ROOM}`,{method:"DELETE",prefer:"return=minimal"});
await svc(`deal_room_agreements?deal_room_id=eq.${ROOM}`,{method:"DELETE",prefer:"return=minimal"});

const browser = await chromium.launch({ headless:true });
async function open(storage, path){
  const ctx = await browser.newContext({ viewport:{width:1440,height:1100} });
  await ctx.addInitScript((v)=>localStorage.setItem("sb-ldimninnjlvxozubheib-auth-token", JSON.stringify(v)), storage);
  const page = await ctx.newPage();
  await page.goto(`http://localhost:8080${path}`,{waitUntil:"domcontentloaded"}).catch(()=>{});
  await page.waitForFunction(()=>!/^\s*Loading…?\s*$/.test(document.body.innerText.trim()),{timeout:20000}).catch(()=>{});
  await page.waitForTimeout(5000);
  return page;
}
const fSt=await mintS(te.TEST_FOUNDER_EMAIL,te.TEST_FOUNDER_PASSWORD);
const iSt=await mintS(te.TEST_INVESTOR_EMAIL,te.TEST_INVESTOR_PASSWORD);
const lSt=await mintS(te.TEST_LAWYER_EMAIL,te.TEST_LAWYER_PASSWORD);

// SUMMARY VIEWS (all 3 roles) + screenshots
const I = await open(iSt, `/app/deal-rooms/${ROOM}/term-sheets`);
await I.waitForFunction(()=>/Agreed terms summary/.test(document.body.innerText),{timeout:12000}).catch(()=>{});
let it=await I.evaluate(()=>document.body.innerText);
ck("investor sees summary + disclaimer", /Agreed terms summary/.test(it) && /not a legal instrument/.test(it));
await I.screenshot({ path:`${OUT}/step7_summary_investor.png`, fullPage:true });

const F = await open(fSt, `/app/deal-rooms/${ROOM}/term-sheets`);
ck("founder sees summary", /Agreed terms summary/.test(await F.evaluate(()=>document.body.innerText)));
await F.screenshot({ path:`${OUT}/step7_summary_founder.png`, fullPage:true });

const L = await open(lSt, `/app/deal-rooms/${ROOM}/term-sheets`);
let lt=await L.evaluate(()=>document.body.innerText);
ck("lawyer sees summary", /Agreed terms summary/.test(lt));
ck("lawyer does NOT see negotiation history", !/countered|Your move|Counter-proposed/.test(lt));
await L.screenshot({ path:`${OUT}/step7_summary_lawyer.png`, fullPage:true });

// GATE 3: lawyer uploads v1
fs.writeFileSync(`${OUT}/agr_v1.pdf`,"%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF");
let up=L.locator('input[type="file"]');
await up.first().waitFor({state:"attached",timeout:8000}).catch(()=>{});
if(await up.count()){ await up.first().setInputFiles(`${OUT}/agr_v1.pdf`); await wait(4500); }
let agrs=(await svc(`deal_room_agreements?deal_room_id=eq.${ROOM}&select=version,uploader_role,status&order=version`).then(r=>r.json()));
ck("lawyer uploaded agreement v1 (pending)", agrs.length===1 && agrs[0].uploader_role==="lawyer" && agrs[0].status==="pending", JSON.stringify(agrs));

// founder requests changes
await F.reload({waitUntil:"domcontentloaded"}); await wait(5500);
let rb=F.getByRole("button",{name:/Request changes/i}).first();
await rb.waitFor({state:"visible",timeout:8000}).catch(()=>{});
if(await rb.count()){ await rb.click(); await wait(700);
  await F.locator("input[placeholder*='change' i]").last().fill("Clause 4 should say 12 months, not 6");
  await F.getByRole("button",{name:/Send request/i}).click(); await wait(3500); }
let v1=(await svc(`deal_room_agreements?deal_room_id=eq.${ROOM}&version=eq.1&select=status`).then(r=>r.json()))[0];
let cmts=(await svc(`deal_room_agreement_comments?deal_room_id=eq.${ROOM}&select=comment,author_role`).then(r=>r.json()));
ck("founder requested changes (v1 changes_requested + comment stored)", v1?.status==="changes_requested" && cmts.length>=1, `${v1?.status}, "${cmts[0]?.comment??""}"`);

// lawyer uploads v2
await L.reload({waitUntil:"domcontentloaded"}); await wait(5500);
fs.writeFileSync(`${OUT}/agr_v2.pdf`,"%PDF-1.4\n2 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 2 0 R>>\n%%EOF");
up=L.locator('input[type="file"]');
await up.first().waitFor({state:"attached",timeout:8000}).catch(()=>{});
if(await up.count()){ await up.first().setInputFiles(`${OUT}/agr_v2.pdf`); await wait(4500); }
agrs=(await svc(`deal_room_agreements?deal_room_id=eq.${ROOM}&select=version,status&order=version`).then(r=>r.json()));
ck("lawyer uploaded v2; v1 SUPERSEDED (history kept, 2 rows)", agrs.length===2 && agrs.find(a=>a.version===1)?.status==="superseded" && agrs.find(a=>a.version===2)?.status==="pending", JSON.stringify(agrs));
await L.screenshot({ path:`${OUT}/step7_versions_lawyer.png`, fullPage:true });

// founder accepts v2, investor accepts v2 -> finalized
const v2id=(await svc(`deal_room_agreements?deal_room_id=eq.${ROOM}&version=eq.2&select=id`).then(r=>r.json()))[0].id;
await F.reload({waitUntil:"domcontentloaded"}); await wait(5500);
{ const b=F.getByRole("button",{name:/^Accept$/}).first(); await b.waitFor({state:"visible",timeout:8000}).catch(()=>{}); if(await b.count()){await b.click();await wait(3500);} }
await I.reload({waitUntil:"domcontentloaded"}); await wait(5500);
{ const b=I.getByRole("button",{name:/^Accept$/}).first(); await b.waitFor({state:"visible",timeout:8000}).catch(()=>{}); if(await b.count()){await b.click();await wait(3500);} }
const fin=(await svc(`deal_room_agreements?id=eq.${v2id}&select=status,accepted_by_founder,accepted_by_investor`).then(r=>r.json()))[0];
ck("agreement FINALIZED (v2 accepted by both)", fin.status==="accepted"&&fin.accepted_by_founder&&fin.accepted_by_investor, JSON.stringify(fin));

// R15C entry condition
const r15c=(await svc(`deal_room_agreements?deal_room_id=eq.${ROOM}&status=eq.accepted&accepted_by_founder=eq.true&accepted_by_investor=eq.true&select=id,version,storage_path`).then(r=>r.json()));
console.log("R15C ENTRY:", JSON.stringify(r15c));

await F.reload({waitUntil:"domcontentloaded"}); await wait(5500);
await F.screenshot({ path:`${OUT}/step7_finalized_founder.png`, fullPage:true });
await L.reload({waitUntil:"domcontentloaded"}); await wait(5500);
await L.screenshot({ path:`${OUT}/step7_finalized_lawyer.png`, fullPage:true });

console.log(`\nLAWYER-PATH WALK: ${R.filter(r=>r.p).length}/${R.length} pass`);
await browser.close();
