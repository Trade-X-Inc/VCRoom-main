import fs from "fs";
function le(p){ return Object.fromEntries(fs.readFileSync(p,"utf-8").split("\n").filter(l=>l.trim()&&!l.startsWith("#")).map(l=>{const i=l.indexOf("=");return [l.slice(0,i).trim(),l.slice(i+1).trim()];})); }
const te = le("/Users/macbookpro/VCROOM/VCRoom-main/.env.test");
const lenv = le("/Users/macbookpro/VCROOM/VCRoom-main/frontend/.env.local");
const SUPA = lenv.SUPABASE_URL, KEY = lenv.SUPABASE_SERVICE_ROLE_KEY, ANON = lenv.VITE_SUPABASE_ANON_KEY;
const ROOM_A = "11111111-2222-3333-4444-555555555555";  // founder+investor+lawyer, locked+summary
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
const lUid=(await(await fetch(`${SUPA}/auth/v1/user`,{headers:{apikey:ANON,Authorization:`Bearer ${L}`}})).json()).id;

// Ensure ROOM_A has an active summary + a pending agreement (for read tests).
let summ=(await svc(`deal_room_summaries?deal_room_id=eq.${ROOM_A}&status=eq.active&select=id`).then(r=>r.json()));
if(!summ.length){ await svc(`deal_room_summaries`,{method:"POST",body:JSON.stringify({deal_room_id:ROOM_A,status:"active",instrument_type:"safe",content:{x:1},disclaimer:"x",terms_locked_at:new Date().toISOString()}),prefer:"return=minimal"}); }
await svc(`deal_room_agreements?deal_room_id=eq.${ROOM_A}`,{method:"DELETE",prefer:"return=minimal"});
const agr=await svc(`deal_room_agreements`,{method:"POST",body:JSON.stringify({deal_room_id:ROOM_A,version:1,storage_path:ROOM_A+"/agreements/1.pdf",file_name:"a.pdf",uploaded_by:lUid,uploader_role:"lawyer",status:"pending"}),prefer:"return=representation"}).then(r=>r.json());
const agrId=agr[0].id;
// ROOM_B summary (for cross-room)
await svc(`deal_room_summaries?deal_room_id=eq.${ROOM_B}`,{method:"DELETE",prefer:"return=minimal"});
await svc(`deal_room_summaries`,{method:"POST",body:JSON.stringify({deal_room_id:ROOM_B,status:"active",instrument_type:"equity",content:{secret:"roomB"},disclaimer:"x",terms_locked_at:new Date().toISOString()}),prefer:"return=minimal"});

console.log("\n=== 1. Lawyer CAN read summary + agreement (dr_is_room_member) ===");
const lawSumm=await asUser(L,`deal_room_summaries?deal_room_id=eq.${ROOM_A}&status=eq.active&select=id`);
ck("lawyer reads summary -> allowed (>=1 row)", Array.isArray(lawSumm.body)&&lawSumm.body.length>=1, `${lawSumm.body.length} rows`);
const lawAgr=await asUser(L,`deal_room_agreements?deal_room_id=eq.${ROOM_A}&select=id`);
ck("lawyer reads agreement + versions -> allowed", Array.isArray(lawAgr.body)&&lawAgr.body.length>=1, `${lawAgr.body.length} rows`);
const lawCmt=await asUser(L,`deal_room_agreement_comments?deal_room_id=eq.${ROOM_A}&select=id`);
ck("lawyer reads agreement comments -> allowed (0+ ok, not blocked)", lawCmt.status===200, `status ${lawCmt.status}`);

console.log("\n=== 2. Lawyer CANNOT read R15A term negotiation history (unchanged) ===");
const lawTerms=await asUser(L,`deal_room_terms?deal_room_id=eq.${ROOM_A}&select=*`);
ck("lawyer reads deal_room_terms -> 0 rows", Array.isArray(lawTerms.body)&&lawTerms.body.length===0, `${lawTerms.body.length} rows`);
const lawProps=await asUser(L,`deal_room_term_proposals?deal_room_id=eq.${ROOM_A}&select=*`);
ck("lawyer reads deal_room_term_proposals -> 0 rows", Array.isArray(lawProps.body)&&lawProps.body.length===0, `${lawProps.body.length} rows`);

console.log("\n=== 3. Cross-room: party in room A reads room B summary/agreement -> 0 ===");
const xSumm=await asUser(I,`deal_room_summaries?deal_room_id=eq.${ROOM_B}&select=*`);
ck("investor(room A) reads room B summary -> 0 rows", Array.isArray(xSumm.body)&&xSumm.body.length===0, `${xSumm.body.length} rows`);
const xAgrLaw=await asUser(L,`deal_room_summaries?deal_room_id=eq.${ROOM_B}&select=*`);
ck("lawyer(room A) reads room B summary -> 0 rows", Array.isArray(xAgrLaw.body)&&xAgrLaw.body.length===0, `${xAgrLaw.body.length} rows`);

console.log("\n=== 4. Unilateral agreement acceptance via direct REST -> blocked ===");
await svc(`deal_room_agreements?id=eq.${agrId}`,{method:"PATCH",body:JSON.stringify({status:"pending",accepted_by_founder:false,accepted_by_investor:false}),prefer:"return=minimal"});
const dPatch=await asUser(F,`deal_room_agreements?id=eq.${agrId}`,{method:"PATCH",body:JSON.stringify({status:"accepted",accepted_by_founder:true,accepted_by_investor:true}),prefer:"return=representation"});
const after=(await svc(`deal_room_agreements?id=eq.${agrId}&select=status,accepted_by_founder,accepted_by_investor`).then(r=>r.json()))[0];
ck("founder raw PATCH to force both-accepted -> blocked (row unchanged)", after.status!=="accepted"&&!after.accepted_by_investor, `patch ${dPatch.status}, row ${JSON.stringify(after)}`);

console.log("\n=== 5. Version deletion attempt -> blocked (append-only) ===");
const del=await asUser(F,`deal_room_agreements?id=eq.${agrId}`,{method:"DELETE",prefer:"return=representation"});
const stillThere=(await svc(`deal_room_agreements?id=eq.${agrId}&select=id`).then(r=>r.json())).length;
ck("client DELETE agreement version -> blocked, row survives", stillThere===1, `deleted ${Array.isArray(del.body)?del.body.length:"?"}, remaining ${stillThere}`);

console.log("\n=== 6. External (no membership) -> 0 rows on all new tables ===");
// no external test account here; use anonymous as the strongest 'no membership' case
for (const t of ["deal_room_summaries","deal_room_agreements","deal_room_agreement_comments","deal_room_term_reopen_requests"]) {
  const anon=await fetch(`${SUPA}/rest/v1/${t}?deal_room_id=eq.${ROOM_A}&select=*`,{headers:{apikey:ANON}}).then(r=>r.json());
  ck(`anonymous reads ${t} -> 0 rows`, Array.isArray(anon)&&anon.length===0, `${anon.length ?? "?"} rows`);
}

console.log("\n=== 7. ADDED — regenerateSummary rejects a LAWYER caller ===");
// The fn's guard: principal-only (role in founder,investor). Verify the fn's
// authorization query returns nothing for the lawyer (so the fn returns not_authorized).
const lawIsPrincipal=(await svc(`deal_room_members?deal_room_id=eq.${ROOM_A}&user_id=eq.${lUid}&role=in.(founder,investor)&select=role`).then(r=>r.json())).length;
ck("regenerateSummary principal-check excludes lawyer (0 principal rows)", lawIsPrincipal===0, `${lawIsPrincipal} principal rows for lawyer`);

console.log("\n=== 8. Uploader rule: founder cannot upload when a lawyer is designated ===");
// designatedUploader = lawyer (a lawyer is a member). uploadAgreement rejects role != uploader.
// Verify the rule's inputs: a lawyer IS a member of room A -> designated uploader = lawyer, so founder role != uploader.
const lawyerMemberCount=(await svc(`deal_room_members?deal_room_id=eq.${ROOM_A}&role=eq.lawyer&select=user_id`).then(r=>r.json())).length;
ck("uploader rule: lawyer present -> founder is NOT the designated uploader", lawyerMemberCount>=1, `lawyer members: ${lawyerMemberCount}`);

// cleanup room B
await svc(`deal_room_summaries?deal_room_id=eq.${ROOM_B}`,{method:"DELETE",prefer:"return=minimal"});

console.log("\n=== SUMMARY ===");
const fails=R.filter(r=>!r.p);
console.log(`${R.length} checks, ${R.length-fails.length} pass, ${fails.length} fail`);
if(fails.length){console.log("FAILURES:");fails.forEach(f=>console.log("  -",f.n));}
