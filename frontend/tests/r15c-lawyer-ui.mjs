import pw from "/Users/macbookpro/VCROOM/VCRoom-main/frontend/node_modules/playwright-core/index.js";
const { chromium } = pw; import fs from "fs";
function le(p){return Object.fromEntries(fs.readFileSync(p,"utf-8").split("\n").filter(l=>l.trim()&&!l.startsWith("#")).map(l=>{const i=l.indexOf("=");return[l.slice(0,i).trim(),l.slice(i+1).trim()];}));}
const te=le("/Users/macbookpro/VCROOM/VCRoom-main/.env.test"),lenv=le("/Users/macbookpro/VCROOM/VCRoom-main/frontend/.env.local");
const SUPA=lenv.SUPABASE_URL,KEY=lenv.SUPABASE_SERVICE_ROLE_KEY,ROOM="11111111-2222-3333-4444-555555555555";
const OUT="/private/tmp/claude-501/-Users-macbookpro-VCROOM-VCRoom-main/1901926f-93a8-43c1-b8da-dc83c0dd2d8e/scratchpad";
async function mint(e,p){const r=await fetch(`${SUPA}/auth/v1/token?grant_type=password`,{method:"POST",headers:{"Content-Type":"application/json",apikey:KEY,Authorization:`Bearer ${KEY}`},body:JSON.stringify({email:e,password:p})});const d=await r.json();return{access_token:d.access_token,token_type:"bearer",expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,refresh_token:d.refresh_token,user:d.user};}
const R=[];const ck=(n,p,d="")=>{R.push({n,p});console.log(`${p?"PASS":"FAIL"} — ${n}${d?` (${d})`:""}`);};
const lSt=await mint(te.TEST_LAWYER_EMAIL,te.TEST_LAWYER_PASSWORD);
const b=await chromium.launch({headless:true});const ctx=await b.newContext({viewport:{width:1440,height:1100}});
await ctx.addInitScript((v)=>localStorage.setItem("sb-ldimninnjlvxozubheib-auth-token",JSON.stringify(v)),lSt);
const page=await ctx.newPage();
// direct URL nav to /close as lawyer
await page.goto(`http://localhost:8080/app/deal-rooms/${ROOM}/close`,{waitUntil:"domcontentloaded"});
await page.waitForFunction(()=>!/^\s*Loading…?\s*$/.test(document.body.innerText.trim()),{timeout:20000}).catch(()=>{});
await page.waitForTimeout(6000);
const t=await page.evaluate(()=>document.body.innerText);
ck("lawyer /close shows LEGAL COUNSEL VIEW (intercepted)", /LEGAL COUNSEL VIEW/i.test(t));
ck("lawyer /close shows NO R15C content (fee/payment/close/invoice)", !/Platform fee|Investment payment|Close the deal|who pays|Deal amount|Invoice|payment proof/i.test(t.replace(/Legal Counsel/gi,"")), "no fee/payment/close/invoice text");
await page.screenshot({path:`${OUT}/lawyer_close.png`,fullPage:true});
console.log(`\nLAWYER UI CHECK: ${R.filter(r=>r.p).length}/${R.length} pass`);
await b.close();
