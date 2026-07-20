import pw from "/Users/macbookpro/VCROOM/VCRoom-main/frontend/node_modules/playwright-core/index.js";
const { chromium } = pw; import fs from "fs";
function le(p){return Object.fromEntries(fs.readFileSync(p,"utf-8").split("\n").filter(l=>l.trim()&&!l.startsWith("#")).map(l=>{const i=l.indexOf("=");return[l.slice(0,i).trim(),l.slice(i+1).trim()];}));}
const te=le("/Users/macbookpro/VCROOM/VCRoom-main/.env.test"),lenv=le("/Users/macbookpro/VCROOM/VCRoom-main/frontend/.env.local");
const SUPA=lenv.SUPABASE_URL,KEY=lenv.SUPABASE_SERVICE_ROLE_KEY,ROOM="11111111-2222-3333-4444-555555555555";
const OUT="/private/tmp/claude-501/-Users-macbookpro-VCROOM-VCRoom-main/1901926f-93a8-43c1-b8da-dc83c0dd2d8e/scratchpad";
const svc=(p,o={})=>fetch(`${SUPA}/rest/v1/${p}`,{...o,headers:{apikey:KEY,Authorization:`Bearer ${KEY}`,"Content-Type":"application/json",Prefer:o.prefer||"return=representation"}});
async function mint(e,p){const r=await fetch(`${SUPA}/auth/v1/token?grant_type=password`,{method:"POST",headers:{"Content-Type":"application/json",apikey:KEY,Authorization:`Bearer ${KEY}`},body:JSON.stringify({email:e,password:p})});const d=await r.json();return{access_token:d.access_token,token_type:"bearer",expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,refresh_token:d.refresh_token,user:d.user};}
const wait=(ms)=>new Promise(r=>setTimeout(r,ms));const R=[];const ck=(n,p,d="")=>{R.push({n,p});console.log(`${p?"PASS":"FAIL"} — ${n}${d?` (${d})`:""}`);};
// clean state: locked terms + active summary, NO agreements, NO reopen reqs
for(const t of ["deal_room_agreement_comments","deal_room_agreements","deal_room_term_reopen_requests","deal_room_summaries","deal_room_terms","deal_room_term_config"]) await svc(`${t}?deal_room_id=eq.${ROOM}`,{method:"DELETE",prefer:"return=minimal"});
await svc(`deal_room_term_config`,{method:"POST",body:JSON.stringify({deal_room_id:ROOM,instrument_type:"safe",instrument_locked:true,locked_at:new Date().toISOString()}),prefer:"return=minimal"});
await svc(`deal_room_terms`,{method:"POST",body:JSON.stringify({deal_room_id:ROOM,instrument_type:"safe",term_key:"valuation_cap",term_label:"Valuation cap",value_type:"currency",current_value:"$6,000,000",status:"locked",accepted_by_founder:true,accepted_by_investor:true}),prefer:"return=minimal"});
await svc(`deal_room_summaries`,{method:"POST",body:JSON.stringify({deal_room_id:ROOM,status:"active",instrument_type:"safe",content:{instrument_type:"safe",instrument_label:"SAFE",terms:[{term_key:"valuation_cap",term_label:"Valuation cap",value_type:"currency",value:"$6,000,000",is_custom:false}],parties:{founder:{name:"Playwright Test Founder",entity:"Playwright Test Co"},investor:{name:"Playwright Test Investor"}},deal_room_ref:ROOM,generated_at:new Date().toISOString(),disclaimer:"This is a summary of agreed terms for use by legal counsel in preparing a formal agreement. It is not a legal instrument."},disclaimer:"x",terms_locked_at:new Date().toISOString()}),prefer:"return=minimal"});
const fSt=await mint(te.TEST_FOUNDER_EMAIL,te.TEST_FOUNDER_PASSWORD),iSt=await mint(te.TEST_INVESTOR_EMAIL,te.TEST_INVESTOR_PASSWORD);
const b=await chromium.launch({headless:true});
async function open(s,path){const ctx=await b.newContext({viewport:{width:1440,height:1100}});await ctx.addInitScript((v)=>localStorage.setItem("sb-ldimninnjlvxozubheib-auth-token",JSON.stringify(v)),s);const page=await ctx.newPage();await page.goto(`http://localhost:8080${path}`,{waitUntil:"domcontentloaded"});await page.waitForFunction(()=>!/^\s*Loading…?\s*$/.test(document.body.innerText.trim()),{timeout:20000}).catch(()=>{});await page.waitForTimeout(5000);return page;}
const F=await open(fSt,`/app/deal-rooms/${ROOM}/term-sheets`);
await F.waitForFunction(()=>/Agreed terms summary/.test(document.body.innerText),{timeout:12000}).catch(()=>{});
const rb=F.getByRole("button",{name:/Re-open terms/i}).first();
await rb.waitFor({state:"visible",timeout:8000}).catch(()=>{});
ck("founder sees 'Re-open terms'", await rb.count()>=1);
if(await rb.count()){await rb.click();await wait(700);
  const inp=F.locator("input[placeholder*='Why' i]"); if(await inp.count()) await inp.last().fill("Revisit the cap");
  await F.getByRole("button",{name:/Request re-open/i}).click();await wait(3500);}
let req=(await svc(`deal_room_term_reopen_requests?deal_room_id=eq.${ROOM}&status=eq.pending&select=requested_role`).then(r=>r.json()))[0];
ck("pending re-open request by founder", req?.requested_role==="founder");
const I=await open(iSt,`/app/deal-rooms/${ROOM}/term-sheets`);await wait(2500);
const ab=I.getByRole("button",{name:/Approve re-open/i}).first();
await ab.waitFor({state:"visible",timeout:8000}).catch(()=>{});
ck("investor sees 'Approve re-open'", await ab.count()>=1);
await I.screenshot({path:`${OUT}/step7_reopen_request.png`,fullPage:true});
if(await ab.count()){await ab.click();await wait(4000);}
const cfg=(await svc(`deal_room_term_config?deal_room_id=eq.${ROOM}&select=locked_at`).then(r=>r.json()))[0];
const act=(await svc(`deal_room_summaries?deal_room_id=eq.${ROOM}&status=eq.active&select=id`).then(r=>r.json())).length;
const arc=(await svc(`deal_room_summaries?deal_room_id=eq.${ROOM}&status=eq.archived&select=id`).then(r=>r.json())).length;
ck("approved: terms UNLOCKED", cfg?.locked_at===null, `locked_at=${cfg?.locked_at}`);
ck("approved: summary ARCHIVED", act===0&&arc>=1, `active=${act} archived=${arc}`);
console.log(`\nRE-OPEN WALK: ${R.filter(r=>r.p).length}/${R.length} pass`);
await b.close();
