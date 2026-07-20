import pw from "/Users/macbookpro/VCROOM/VCRoom-main/frontend/node_modules/playwright-core/index.js";
const { chromium } = pw; import fs from "fs";
function le(p){return Object.fromEntries(fs.readFileSync(p,"utf-8").split("\n").filter(l=>l.trim()&&!l.startsWith("#")).map(l=>{const i=l.indexOf("=");return[l.slice(0,i).trim(),l.slice(i+1).trim()];}));}
const te=le("/Users/macbookpro/VCROOM/VCRoom-main/.env.test"),lenv=le("/Users/macbookpro/VCROOM/VCRoom-main/frontend/.env.local");
const SUPA=lenv.SUPABASE_URL,KEY=lenv.SUPABASE_SERVICE_ROLE_KEY,ROOM="957f9750-00c7-402a-b1ba-d9c7a4e3ba2f";
const OUT="/private/tmp/claude-501/-Users-macbookpro-VCROOM-VCRoom-main/1901926f-93a8-43c1-b8da-dc83c0dd2d8e/scratchpad";
const svc=(p)=>fetch(`${SUPA}/rest/v1/${p}`,{headers:{apikey:KEY,Authorization:`Bearer ${KEY}`}}).then(r=>r.json());
async function mint(e,p){const r=await fetch(`${SUPA}/auth/v1/token?grant_type=password`,{method:"POST",headers:{"Content-Type":"application/json",apikey:KEY,Authorization:`Bearer ${KEY}`},body:JSON.stringify({email:e,password:p})});const d=await r.json();return{access_token:d.access_token,token_type:"bearer",expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,refresh_token:d.refresh_token,user:d.user};}
const wait=(ms)=>new Promise(r=>setTimeout(r,ms));const R=[];const ck=(n,p,d="")=>{R.push({n,p});console.log(`${p?"PASS":"FAIL"} — ${n}${d?` (${d})`:""}`);};
const fSt=await mint(te.TEST_FOUNDER_EMAIL,te.TEST_FOUNDER_PASSWORD);
const b=await chromium.launch({headless:true});const ctx=await b.newContext({viewport:{width:1440,height:1100}});
await ctx.addInitScript((v)=>localStorage.setItem("sb-ldimninnjlvxozubheib-auth-token",JSON.stringify(v)),fSt);
const page=await ctx.newPage();
await page.goto(`http://localhost:8080/app/deal-rooms/${ROOM}/close`,{waitUntil:"domcontentloaded"});
await page.waitForFunction(()=>!/^\s*Loading…?\s*$/.test(document.body.innerText.trim()),{timeout:20000}).catch(()=>{});
await wait(5000);
// FOUNDER PAYS path: select founder pays, confirm fee, then founder confirms payment (founder is payer)
await page.getByRole("button",{name:/^founder pays$/i}).click().catch(()=>{});
await wait(400);
await page.getByRole("button",{name:/Confirm fee & who pays/i}).click(); await wait(2500);
const fee=(await svc(`deal_room_fees?deal_room_id=eq.${ROOM}&select=fee_payer,calculated_fee`))[0];
ck("Founder-pays: fee set, payer=founder", fee?.fee_payer==="founder", JSON.stringify(fee));
await page.reload({waitUntil:"domcontentloaded"}); await wait(5000);
// founder is the payer -> sees Confirm payment button
const canPay=await page.getByRole("button",{name:/Confirm payment \(beta\)/i}).count();
ck("Founder-pays: founder (payer) sees confirm-payment button", canPay>=1, `${canPay} buttons`);
await page.screenshot({path:`${OUT}/s8_founder_pays.png`,fullPage:true});
// EXIT path (fee confirmed already? no — confirm first to test the 'already paid' branch)
await page.getByRole("button",{name:/Confirm payment \(beta\)/i}).first().click().catch(()=>{}); await wait(2500);
await page.reload({waitUntil:"domcontentloaded"}); await wait(5000);
await page.getByRole("button",{name:/Exit deal/i}).click().catch(()=>{}); await wait(700);
const et=await page.evaluate(()=>document.body.innerText);
ck("Exit: dialog shows 'nothing deleted'", /Nothing is deleted/i.test(et));
ck("Exit: fee-paid branch shows hello@hockystick.app / no auto-refund", /hello@hockystick.app/i.test(et) && /does not automatically refund|no auto-refund/i.test(et), "support path");
await page.screenshot({path:`${OUT}/s8_exit.png`,fullPage:true});
console.log(`\nFOUNDER-PAYS + EXIT: ${R.filter(r=>r.p).length}/${R.length} pass`);
await b.close();
