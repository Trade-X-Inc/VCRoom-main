import pw from "/Users/macbookpro/VCROOM/VCRoom-main/frontend/node_modules/playwright-core/index.js";
const { chromium } = pw;
import fs from "fs";
function le(p){ return Object.fromEntries(fs.readFileSync(p,"utf-8").split("\n").filter(l=>l.trim()&&!l.startsWith("#")).map(l=>{const i=l.indexOf("=");return [l.slice(0,i).trim(),l.slice(i+1).trim()];})); }
const te = le("/Users/macbookpro/VCROOM/VCRoom-main/.env.test");
const lenv = le("/Users/macbookpro/VCROOM/VCRoom-main/frontend/.env.local");
const SUPA = lenv.SUPABASE_URL, KEY = lenv.SUPABASE_SERVICE_ROLE_KEY;
const OUT = "/private/tmp/claude-501/-Users-macbookpro-VCROOM-VCRoom-main/1901926f-93a8-43c1-b8da-dc83c0dd2d8e/scratchpad";
const ROOM = "11111111-2222-3333-4444-555555555555";
const svc=(p,o={})=>fetch(`${SUPA}/rest/v1/${p}`,{...o,headers:{apikey:KEY,Authorization:`Bearer ${KEY}`,"Content-Type":"application/json",Prefer:o.prefer||"return=representation"}});
async function mintS(email,password){ const r=await fetch(`${SUPA}/auth/v1/token?grant_type=password`,{method:"POST",headers:{"Content-Type":"application/json",apikey:KEY,Authorization:`Bearer ${KEY}`},body:JSON.stringify({email,password})}); const d=await r.json(); return { access_token:d.access_token, token_type:"bearer", expires_in:3600, expires_at:Math.floor(Date.now()/1000)+3600, refresh_token:d.refresh_token, user:d.user }; }
const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
const R=[]; const ck=(n,p,d="")=>{R.push({n,p});console.log(`${p?"PASS":"FAIL"} — ${n}${d?` (${d})`:""}`);};
fs.writeFileSync(`${OUT}/signed.pdf`,"%PDF-1.4 signed copy");
fs.writeFileSync(`${OUT}/proof.pdf`,"%PDF-1.4 wire proof");

const browser = await chromium.launch({ headless:true });
async function open(storage){
  const ctx = await browser.newContext({ viewport:{width:1440,height:1200}, acceptDownloads:true });
  await ctx.addInitScript((v)=>localStorage.setItem("sb-ldimninnjlvxozubheib-auth-token", JSON.stringify(v)), storage);
  const page = await ctx.newPage();
  await page.goto(`http://localhost:8080/app/deal-rooms/${ROOM}/close`,{waitUntil:"domcontentloaded"}).catch(()=>{});
  await page.waitForFunction(()=>!/^\s*Loading…?\s*$/.test(document.body.innerText.trim()),{timeout:20000}).catch(()=>{});
  await page.waitForTimeout(5000);
  return page;
}
const reloadW=async(p)=>{ await p.reload({waitUntil:"domcontentloaded"}); await p.waitForFunction(()=>!/^\s*Loading…?\s*$/.test(document.body.innerText.trim()),{timeout:20000}).catch(()=>{}); await wait(4500); };
const fSt=await mintS(te.TEST_FOUNDER_EMAIL,te.TEST_FOUNDER_PASSWORD);
const iSt=await mintS(te.TEST_INVESTOR_EMAIL,te.TEST_INVESTOR_PASSWORD);
const lSt=await mintS(te.TEST_LAWYER_EMAIL,te.TEST_LAWYER_PASSWORD);

const F=await open(fSt), I=await open(iSt);

// GATE 4a — founder sets fee (pre-filled), selects INVESTOR pays
let ft=await F.evaluate(()=>document.body.innerText);
ck("Gate4: founder sees fee form pre-filled + preview", /Deal amount/i.test(ft) && /Platform fee/i.test(ft) && /6,000,000|6000000/.test(ft.replace(/,/g,",")), "form + prefill");
// select investor pays
await F.getByRole("button",{name:/^investor pays$/i}).click().catch(()=>{});
await wait(400);
await F.getByRole("button",{name:/Confirm fee & who pays/i}).click();
await wait(2500);
const fee=(await svc(`deal_room_fees?deal_room_id=eq.${ROOM}&select=deal_amount,calculated_fee,fee_payer,payment_status`).then(r=>r.json()))[0];
ck("Gate4: fee set — $6M -> $15,000 cap, investor pays", fee && Number(fee.calculated_fee)===15000 && fee.fee_payer==="investor", JSON.stringify(fee));
await F.screenshot({path:`${OUT}/s8_fee_form.png`,fullPage:true});

// download gate INACTIVE (no confirm yet) — verify via investor session before confirm
await reloadW(I);
let it=await I.evaluate(()=>document.body.innerText);
ck("Gate4: download gate INACTIVE before fee confirmed", /Download unlocks once the platform fee is confirmed/i.test(it), "download locked");
await I.screenshot({path:`${OUT}/s8_download_inactive.png`,fullPage:true});

// GATE 4b — investor (payer) confirms fee (beta bypass)
await I.getByRole("button",{name:/Confirm payment \(beta\)/i}).click();
await wait(2500);
const feeC=(await svc(`deal_room_fees?deal_room_id=eq.${ROOM}&select=payment_status`).then(r=>r.json()))[0];
ck("Gate4: fee confirmed (beta_bypass)", feeC.payment_status==="beta_bypass", feeC.payment_status);

// GATE 5 — download now active + both sign
await reloadW(I); await reloadW(F);
ft=await F.evaluate(()=>document.body.innerText);
ck("Gate5: download active after fee confirmed", /Download agreement/i.test(ft) && !/Download unlocks once/i.test(ft), "download unlocked");
await F.screenshot({path:`${OUT}/s8_download_active.png`,fullPage:true});
// founder uploads signed copy
{ const inp=F.locator('input[type="file"]'); if(await inp.count()){ await inp.first().setInputFiles(`${OUT}/signed.pdf`); await wait(3500); } }
// investor uploads signed copy
await reloadW(I);
{ const inp=I.locator('input[type="file"]'); if(await inp.count()){ await inp.first().setInputFiles(`${OUT}/signed.pdf`); await wait(3500); } }
const signed=(await svc(`deal_room_signed_agreements?deal_room_id=eq.${ROOM}&select=founder_storage_path,investor_storage_path`).then(r=>r.json()))[0];
ck("Gate5: both signed copies uploaded", !!signed?.founder_storage_path && !!signed?.investor_storage_path, "both signed");
await reloadW(F); await F.screenshot({path:`${OUT}/s8_signing.png`,fullPage:true});

// GATE 6 — investor uploads payment proof, founder confirms
await reloadW(I);
{ const inp=I.locator('input[type="file"]'); if(await inp.count()){ await inp.first().setInputFiles(`${OUT}/proof.pdf`); await wait(3500); } }
let proof=(await svc(`deal_room_payment_proof?deal_room_id=eq.${ROOM}&select=id,version,founder_status`).then(r=>r.json()))[0];
ck("Gate6: investor uploaded payment proof v1", !!proof, JSON.stringify(proof));
await I.screenshot({path:`${OUT}/s8_payment_proof.png`,fullPage:true});
// founder confirms receipt
await reloadW(F);
await F.getByRole("button",{name:/Confirm receipt/i}).first().click().catch(()=>{});
await wait(2500);
proof=(await svc(`deal_room_payment_proof?deal_room_id=eq.${ROOM}&select=founder_status`).then(r=>r.json()))[0];
ck("Gate6: founder confirmed payment receipt", proof.founder_status==="confirmed", proof.founder_status);

// GATE 7 — mutual close
await reloadW(I);
await I.getByRole("button",{name:/Confirm receipt|Confirm delivery/i}).first().click().catch(()=>{});
await wait(2500);
await reloadW(F);
await F.getByRole("button",{name:/Confirm delivery|Confirm receipt/i}).first().click().catch(()=>{});
await wait(3500);
const roomStatus=(await svc(`deal_rooms?id=eq.${ROOM}&select=status,closed_at`).then(r=>r.json()))[0];
const invoices=(await svc(`deal_room_invoices?deal_room_id=eq.${ROOM}&select=invoice_number,bill_to_role`).then(r=>r.json()));
ck("Gate7: DEAL CLOSED (status=closed, closed_at set)", roomStatus.status==="closed" && !!roomStatus.closed_at, JSON.stringify(roomStatus));
ck("Gate7: 2 invoices auto-generated (founder + investor)", invoices.length===2 && invoices.some(i=>i.bill_to_role==="founder") && invoices.some(i=>i.bill_to_role==="investor"), JSON.stringify(invoices));
await reloadW(F); await F.screenshot({path:`${OUT}/s8_closed.png`,fullPage:true});

// READ-ONLY across surfaces: term-sheets closed state, and a Q&A write blocked
await F.goto(`http://localhost:8080/app/deal-rooms/${ROOM}/term-sheets`,{waitUntil:"domcontentloaded"}); await wait(5000);
const tsClosed=await F.evaluate(()=>document.body.innerText);
ck("Read-only: term-sheets shows finalized + NO edit actions in closed room", /Terms Finalized|Agreed terms summary/i.test(tsClosed) && !/Re-open terms|Upload agreement|Upload new version/i.test(tsClosed), "no edit controls");

// LAWYER view of closed room: sees summary+agreement, NOT R15C
const L=await open(lSt);
const lt=await L.evaluate(()=>document.body.innerText);
ck("Lawyer: closed room -> LEGAL COUNSEL VIEW, no R15C content", /LEGAL COUNSEL VIEW/i.test(lt) && !/Platform fee|Investment payment|Invoice|payment proof/i.test(lt), "no R15C");
await L.screenshot({path:`${OUT}/s8_lawyer_closed.png`,fullPage:true});

console.log(`\nCLOSING WALK: ${R.filter(r=>r.p).length}/${R.length} pass`);
await browser.close();
