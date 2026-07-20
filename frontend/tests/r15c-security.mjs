import fs from "fs";
function le(p){ return Object.fromEntries(fs.readFileSync(p,"utf-8").split("\n").filter(l=>l.trim()&&!l.startsWith("#")).map(l=>{const i=l.indexOf("=");return [l.slice(0,i).trim(),l.slice(i+1).trim()];})); }
const te = le("/Users/macbookpro/VCROOM/VCRoom-main/.env.test");
const lenv = le("/Users/macbookpro/VCROOM/VCRoom-main/frontend/.env.local");
const SUPA = lenv.SUPABASE_URL, KEY = lenv.SUPABASE_SERVICE_ROLE_KEY, ANON = lenv.VITE_SUPABASE_ANON_KEY;
const ROOM_A = "11111111-2222-3333-4444-555555555555";  // founder+investor+lawyer
const ROOM_B = "99999999-aaaa-bbbb-cccc-000000000001";  // founder ONLY

async function mint(email,password){ const r=await fetch(`${SUPA}/auth/v1/token?grant_type=password`,{method:"POST",headers:{"Content-Type":"application/json",apikey:KEY,Authorization:`Bearer ${KEY}`},body:JSON.stringify({email,password})}); return (await r.json()).access_token; }
async function asUser(jwt, path, opts={}) {
  const r = await fetch(`${SUPA}/rest/v1/${path}`, { ...opts, headers:{ apikey:ANON, Authorization:`Bearer ${jwt}`, "Content-Type":"application/json", Prefer: opts.prefer||"return=representation", ...(opts.headers||{}) }});
  const t = await r.text(); let body; try{body=JSON.parse(t);}catch{body=t;}
  return { status:r.status, body };
}
const svc = (path, opts={}) => fetch(`${SUPA}/rest/v1/${path}`, { ...opts, headers:{ apikey:KEY, Authorization:`Bearer ${KEY}`, "Content-Type":"application/json", Prefer: opts.prefer||"return=representation", ...(opts.headers||{}) }});
const R=[]; const ck=(n,p,d="")=>{R.push({n,p});console.log(`${p?"PASS":"FAIL"} — ${n}${d?` (${d})`:""}`);};

const F = await mint(te.TEST_FOUNDER_EMAIL, te.TEST_FOUNDER_PASSWORD);
const I = await mint(te.TEST_INVESTOR_EMAIL, te.TEST_INVESTOR_PASSWORD);
const L = await mint(te.TEST_LAWYER_EMAIL, te.TEST_LAWYER_PASSWORD);
const fUid=(await(await fetch(`${SUPA}/auth/v1/user`,{headers:{apikey:ANON,Authorization:`Bearer ${F}`}})).json()).id;
const iUid=(await(await fetch(`${SUPA}/auth/v1/user`,{headers:{apikey:ANON,Authorization:`Bearer ${I}`}})).json()).id;

// Seed R15C data in room A (service role) so there IS something for the lawyer/attacker to (fail to) touch.
await svc(`deal_room_fees?deal_room_id=eq.${ROOM_A}`,{method:"DELETE",prefer:"return=minimal"});
const feeRow = await svc(`deal_room_fees`,{method:"POST",body:JSON.stringify({deal_room_id:ROOM_A,deal_amount:500000,calculated_fee:7500,fee_payer:"investor",payment_status:"pending"}),prefer:"return=representation"}).then(r=>r.json());
await svc(`deal_room_signed_agreements?deal_room_id=eq.${ROOM_A}`,{method:"DELETE",prefer:"return=minimal"});
await svc(`deal_room_signed_agreements`,{method:"POST",body:JSON.stringify({deal_room_id:ROOM_A}),prefer:"return=minimal"});
await svc(`deal_room_payment_proof?deal_room_id=eq.${ROOM_A}`,{method:"DELETE",prefer:"return=minimal"});
const proofRow = await svc(`deal_room_payment_proof`,{method:"POST",body:JSON.stringify({deal_room_id:ROOM_A,version:1,storage_path:ROOM_A+"/payment-proof/x.pdf",file_name:"x.pdf",uploaded_by:iUid,founder_status:"pending"}),prefer:"return=representation"}).then(r=>r.json());
await svc(`deal_room_close?deal_room_id=eq.${ROOM_A}`,{method:"DELETE",prefer:"return=minimal"});
await svc(`deal_room_close`,{method:"POST",body:JSON.stringify({deal_room_id:ROOM_A}),prefer:"return=minimal"});
await svc(`deal_room_invoices?deal_room_id=eq.${ROOM_A}`,{method:"DELETE",prefer:"return=minimal"});
await svc(`deal_room_invoices`,{method:"POST",body:JSON.stringify({deal_room_id:ROOM_A,invoice_number:"HS-TEST-1",bill_to_role:"founder",content:{x:1}}),prefer:"return=minimal"});
// room B fee (cross-room target)
await svc(`deal_room_fees?deal_room_id=eq.${ROOM_B}`,{method:"DELETE",prefer:"return=minimal"});
await svc(`deal_room_fees`,{method:"POST",body:JSON.stringify({deal_room_id:ROOM_B,deal_amount:1,calculated_fee:500,fee_payer:"founder",payment_status:"pending"}),prefer:"return=minimal"});

console.log("=== 1. Lawyer reads every R15C table -> 0 rows ===");
for (const t of ["deal_room_fees","deal_room_signed_agreements","deal_room_payment_proof","deal_room_close","deal_room_invoices"]) {
  const r=await asUser(L,`${t}?deal_room_id=eq.${ROOM_A}&select=*`);
  ck(`lawyer ${t} -> 0 rows`, Array.isArray(r.body)&&r.body.length===0, `${Array.isArray(r.body)?r.body.length:"?"} rows`);
}

console.log("\n=== 2. Cross-room: investor(A) reads room B R15C tables -> 0 rows ===");
for (const t of ["deal_room_fees","deal_room_close"]) {
  const r=await asUser(I,`${t}?deal_room_id=eq.${ROOM_B}&select=*`);
  ck(`investor reads room B ${t} -> 0 rows`, Array.isArray(r.body)&&r.body.length===0, `${Array.isArray(r.body)?r.body.length:"?"} rows`);
}

console.log("\n=== 3. Fee manipulation via direct REST -> blocked (no client write policy) ===");
const feePatch=await asUser(I,`deal_room_fees?deal_room_id=eq.${ROOM_A}`,{method:"PATCH",body:JSON.stringify({calculated_fee:1,fee_payer:"founder",payment_status:"beta_bypass"}),prefer:"return=representation"});
const feeAfter=(await svc(`deal_room_fees?deal_room_id=eq.${ROOM_A}&select=calculated_fee,fee_payer,payment_status`).then(r=>r.json()))[0];
ck("investor raw PATCH fee (amount/payer/status) -> blocked, row unchanged", feeAfter.calculated_fee==7500 && feeAfter.fee_payer==="investor" && feeAfter.payment_status==="pending", JSON.stringify(feeAfter));
const feeInsert=await asUser(F,`deal_room_fees`,{method:"POST",body:JSON.stringify({deal_room_id:ROOM_A,deal_amount:1,calculated_fee:1,fee_payer:"founder"}),prefer:"return=representation"});
ck("founder raw INSERT fee -> blocked", feeInsert.status===403||(Array.isArray(feeInsert.body)&&feeInsert.body.length===0), `status ${feeInsert.status}`);

console.log("\n=== 4. Unilateral close via direct deal_rooms PATCH -> blocked (guard trigger) ===");
const closePatch=await asUser(F,`deal_rooms?id=eq.${ROOM_A}`,{method:"PATCH",body:JSON.stringify({status:"closed"}),prefer:"return=representation"});
const statusAfter=(await svc(`deal_rooms?id=eq.${ROOM_A}&select=status`).then(r=>r.json()))[0].status;
ck("founder unilateral close -> blocked", statusAfter!=="closed", `status ${statusAfter}, http ${closePatch.status}`);
// also: setting both deal_room_close flags directly (no client write policy)
const closeFlags=await asUser(F,`deal_room_close?deal_room_id=eq.${ROOM_A}`,{method:"PATCH",body:JSON.stringify({founder_confirmed:true,investor_confirmed:true,closed_at:new Date().toISOString()}),prefer:"return=representation"});
const cAfter=(await svc(`deal_room_close?deal_room_id=eq.${ROOM_A}&select=founder_confirmed,investor_confirmed,closed_at`).then(r=>r.json()))[0];
ck("founder raw-set both close flags -> blocked (no client write)", !cAfter.founder_confirmed && !cAfter.investor_confirmed && !cAfter.closed_at, JSON.stringify(cAfter));

console.log("\n=== 5. Payment proof + signed deletion -> blocked (append-only / no client write) ===");
const delProof=await asUser(I,`deal_room_payment_proof?id=eq.${proofRow[0].id}`,{method:"DELETE",prefer:"return=representation"});
const proofStill=(await svc(`deal_room_payment_proof?id=eq.${proofRow[0].id}&select=id`).then(r=>r.json())).length;
ck("investor DELETE payment proof -> blocked, row survives", proofStill===1, `remaining ${proofStill}`);
const delSigned=await asUser(F,`deal_room_signed_agreements?deal_room_id=eq.${ROOM_A}`,{method:"DELETE",prefer:"return=representation"});
const signedStill=(await svc(`deal_room_signed_agreements?deal_room_id=eq.${ROOM_A}&select=deal_room_id`).then(r=>r.json())).length;
ck("founder DELETE signed_agreements -> blocked, row survives", signedStill===1, `remaining ${signedStill}`);

console.log("\n=== 6. Anonymous -> 0 rows on all R15C tables ===");
for (const t of ["deal_room_fees","deal_room_signed_agreements","deal_room_payment_proof","deal_room_close","deal_room_invoices"]) {
  const anon=await fetch(`${SUPA}/rest/v1/${t}?deal_room_id=eq.${ROOM_A}&select=*`,{headers:{apikey:ANON}}).then(r=>r.json());
  ck(`anonymous ${t} -> 0 rows`, Array.isArray(anon)&&anon.length===0, `${Array.isArray(anon)?anon.length:"?"} rows`);
}

console.log("\n=== 7. Room-wide read-only: writes to content tables in a CLOSED room -> blocked at RLS ===");
// close room B properly via the fn path (seed both flags + call rpc)
await svc(`deal_room_close?deal_room_id=eq.${ROOM_B}`,{method:"DELETE",prefer:"return=minimal"});
await svc(`deal_room_close`,{method:"POST",body:JSON.stringify({deal_room_id:ROOM_B,founder_confirmed:true,investor_confirmed:true}),prefer:"return=minimal"});
const rpc=await fetch(`${SUPA}/rest/v1/rpc/finalize_deal_close`,{method:"POST",headers:{apikey:KEY,Authorization:`Bearer ${KEY}`,"Content-Type":"application/json"},body:JSON.stringify({p_deal_room_id:ROOM_B})});
const bStatus=(await svc(`deal_rooms?id=eq.${ROOM_B}&select=status`).then(r=>r.json()))[0].status;
console.log(`  (room B closed via finalize_deal_close: status=${bStatus}, rpc ${rpc.status})`);
// founder of room B tries to insert a Q&A / note in the closed room -> must fail (dr_is_open)
const qaClosed=await asUser(F,`deal_room_qa`,{method:"POST",body:JSON.stringify({deal_room_id:ROOM_B,question:"late question",asked_by:fUid}),prefer:"return=representation"});
ck("write Q&A in CLOSED room -> blocked (dr_is_open RLS)", qaClosed.status===403||(Array.isArray(qaClosed.body)&&qaClosed.body.length===0)|| (qaClosed.body&&qaClosed.body.code), `status ${qaClosed.status}`);
const noteClosed=await asUser(F,`deal_room_notes`,{method:"POST",body:JSON.stringify({deal_room_id:ROOM_B,user_id:fUid,title:"late",content:"x",visibility:"deal_room"}),prefer:"return=representation"});
ck("write note in CLOSED room -> blocked (dr_is_open RLS)", noteClosed.status===403||(Array.isArray(noteClosed.body)&&noteClosed.body.length===0)||(noteClosed.body&&noteClosed.body.code), `status ${noteClosed.status}`);
// re-open attempt on the closed room -> blocked by guard
const reopen=await asUser(F,`deal_rooms?id=eq.${ROOM_B}`,{method:"PATCH",body:JSON.stringify({status:"active"}),prefer:"return=representation"});
const bStatus2=(await svc(`deal_rooms?id=eq.${ROOM_B}&select=status`).then(r=>r.json()))[0].status;
ck("re-open a CLOSED room -> blocked (guard), stays closed", bStatus2==="closed", `status ${bStatus2}, http ${reopen.status}`);

// cleanup: restore room B to active for future test runs. The guard blocks any
// status change away from 'closed', so temporarily disable the trigger (service
// role) to reset the side fixture, then re-enable. This is test-only teardown.
async function execSql(sql){ return fetch(`${SUPA}/rest/v1/rpc/exec_test_sql`,{method:"POST",headers:{apikey:KEY,Authorization:`Bearer ${KEY}`,"Content-Type":"application/json"},body:JSON.stringify({q:sql})}); }
// (exec_test_sql may not exist — fall back handled by caller via MCP after run)
console.log("\n(room B left closed; restore via a follow-up service query)");

console.log("\n=== SUMMARY ===");
const fails=R.filter(r=>!r.p);
console.log(`${R.length} checks, ${R.length-fails.length} pass, ${fails.length} fail`);
if(fails.length){console.log("FAILURES:");fails.forEach(f=>console.log("  -",f.n,f.d||""));}
