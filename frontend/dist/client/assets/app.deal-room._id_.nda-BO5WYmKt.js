import{M as E,c as C,a as T,u as _,r as d,s as o,j as e,I as O}from"./index-Bcts4Hqi.js";import{u as m}from"./useQuery-BesSvuf-.js";import{L as S}from"./Logo-Z6YM5JTN.js";import{S as k}from"./shield-omtutKlr.js";import{L as D}from"./loader-circle-KXiTncxi.js";import{L}from"./lock-CrtSjIrQ.js";import"./createLucideIcon-4HN0_EW9.js";function q(t,r,s,a){return`MUTUAL NON-DISCLOSURE AGREEMENT

This Mutual Non-Disclosure Agreement ("Agreement") is entered into as of ${a} by and between:

${r}, on behalf of ${t} (the "Company"), a venture seeking investment consideration; and

${s} (the "Recipient"), an investor evaluating potential investment opportunities.

1. PURPOSE

The parties wish to explore a potential investment relationship between the Company and the Recipient (the "Transaction"). In connection with this evaluation, each party may disclose certain non-public, confidential, or proprietary information to the other.

2. DEFINITION OF CONFIDENTIAL INFORMATION

"Confidential Information" means any non-public information relating to the actual or anticipated business, research, or development of the disclosing party, including but not limited to: financial data and projections, business plans, customer lists, intellectual property, technical specifications, product roadmaps, pricing strategies, personnel information, and any documents shared within this deal room.

3. OBLIGATIONS OF RECEIVING PARTY

The Recipient agrees to:
(a) Hold all Confidential Information in strict confidence;
(b) Not disclose any Confidential Information to third parties without prior written consent from the Company;
(c) Use the Confidential Information solely for the purpose of evaluating the Transaction;
(d) Protect the Confidential Information using at least the same degree of care applied to its own confidential information, but in no event less than reasonable care.

4. EXCEPTIONS

These obligations do not apply to information that:
(a) Is or becomes publicly known through no breach of this Agreement;
(b) Was rightfully known to the Recipient prior to disclosure;
(c) Is independently developed by the Recipient without use of Confidential Information;
(d) Is required to be disclosed by applicable law or valid court order, provided the Recipient gives prompt notice to the Company where permitted by law.

5. MONITORING AND WATERMARKING

All materials accessed via the Venture Room deal room are electronically watermarked and access-logged. Activity within the deal room is monitored. Any breach of this Agreement may result in immediate revocation of access and legal action.

6. TERM

This Agreement remains in effect for two (2) years from the date of execution. All confidentiality obligations survive termination.

7. RETURN OR DESTRUCTION OF INFORMATION

Upon written request, the Recipient shall promptly return or destroy all Confidential Information and certify such action in writing.

8. NO LICENSE

Nothing herein grants the Recipient any rights in or to the Confidential Information except as expressly set forth.

9. GOVERNING LAW

This Agreement is governed by applicable law. Any disputes shall be subject to the exclusive jurisdiction of courts in the jurisdiction where the Company is domiciled.

10. ENTIRE AGREEMENT

This Agreement constitutes the entire agreement between the parties with respect to the subject matter hereof and supersedes all prior agreements, whether oral or written.

— — —

Company: ${t}
Representative: ${r}
Accepting Party: ${s}
Date of Acceptance: ${a}

This agreement is executed electronically via Venture Room. By checking the acknowledgement box and clicking "Accept & Enter Deal Room", you agree to be legally bound by the terms above.`}function K(){const{id:t}=E.useParams(),r=C(),s=T(),{user:a}=_(),[c,v]=d.useState(!1),[u,h]=d.useState(!1),[p,g]=d.useState(""),{data:f,isLoading:l}=m({queryKey:["nda-acceptance",t,a?.id],enabled:!!a?.id,queryFn:async()=>{const{data:n}=await o.from("nda_acceptances").select("id").eq("deal_room_id",t).eq("user_id",a.id).maybeSingle();return n??null}});d.useEffect(()=>{!l&&f&&r({to:"/app/deal-room/$id",params:{id:t}})},[l,f,r,t]);const{data:w,isLoading:j}=m({queryKey:["deal-room",t],queryFn:async()=>{const{data:n,error:i}=await o.from("deal_rooms").select("*, startups(company_name)").eq("id",t).single();if(i)throw i;return n}}),{data:I}=m({queryKey:["deal-room-founder",t],queryFn:async()=>{const{data:n}=await o.from("deal_room_members").select("users(full_name)").eq("deal_room_id",t).eq("role","founder").limit(1).maybeSingle();return n??null}}),b=w?.startups?.company_name??"the Company",A=I?.users?.full_name??"its authorized representative",x=a?.name??"Investor",y=new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"}),N=q(b,A,x,y),R=async()=>{if(!(!a?.id||!c)){h(!0),g("");try{const n=a.role??"investor",{error:i}=await o.from("nda_acceptances").insert({deal_room_id:t,user_id:a.id,role:n,user_agent:navigator.userAgent,nda_html:N});if(i)throw i;await o.from("deal_room_members").upsert({deal_room_id:t,user_id:a.id,role:n,accepted_at:new Date().toISOString()},{onConflict:"deal_room_id,user_id"}),await O(t,a.id,"Signed the NDA"),s.setQueryData(["nda-acceptance",t,a.id],{id:"accepted",accepted_at:new Date().toISOString()}),r({to:"/app/deal-room/$id",params:{id:t}})}catch{g("Could not save your acceptance. Please try again."),h(!1)}}};return l||j?e.jsx("div",{className:"min-h-[calc(100vh-4rem)] grid place-items-center",children:e.jsx("div",{className:"text-sm text-muted-foreground animate-pulse",children:"Loading…"})}):e.jsx("div",{className:"min-h-[calc(100vh-4rem)] bg-muted/30 py-10 px-4",children:e.jsxs("div",{className:"mx-auto max-w-2xl",children:[e.jsx("div",{className:"flex justify-center mb-8",children:e.jsx(S,{withWordmark:!0})}),e.jsxs("div",{className:"rounded-2xl border border-border/60 bg-card shadow-elev overflow-hidden",children:[e.jsxs("div",{className:"px-8 py-6 border-b border-border/60 flex items-center gap-4",children:[e.jsx("div",{className:"grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand/10 border border-brand/20",children:e.jsx(k,{className:"h-6 w-6 text-brand"})}),e.jsxs("div",{children:[e.jsx("h1",{className:"text-xl font-semibold tracking-tight",children:"Non-Disclosure Agreement"}),e.jsx("p",{className:"text-sm text-muted-foreground mt-0.5",children:"Review and sign to access this deal room."})]})]}),e.jsxs("div",{className:"px-8 py-6 space-y-6",children:[e.jsxs("div",{className:"grid grid-cols-3 gap-3 text-xs",children:[e.jsxs("div",{className:"rounded-lg border border-border/60 bg-background p-3",children:[e.jsx("div",{className:"text-muted-foreground mb-0.5",children:"Company"}),e.jsx("div",{className:"font-medium truncate",children:b})]}),e.jsxs("div",{className:"rounded-lg border border-border/60 bg-background p-3",children:[e.jsx("div",{className:"text-muted-foreground mb-0.5",children:"Signing as"}),e.jsx("div",{className:"font-medium truncate",children:x})]}),e.jsxs("div",{className:"rounded-lg border border-border/60 bg-background p-3",children:[e.jsx("div",{className:"text-muted-foreground mb-0.5",children:"Version"}),e.jsxs("div",{className:"font-medium",children:["v1.0 · ",y]})]})]}),e.jsxs("div",{children:[e.jsx("div",{className:"text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2",children:"Agreement text"}),e.jsx("div",{className:"h-64 overflow-y-auto rounded-xl border border-border/60 bg-background p-5 text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap",children:N})]}),e.jsxs("label",{className:"flex items-start gap-3 cursor-pointer",children:[e.jsx("input",{type:"checkbox",checked:c,onChange:n=>v(n.target.checked),className:"mt-0.5 h-4 w-4 shrink-0 accent-[var(--brand)] cursor-pointer"}),e.jsx("span",{className:"text-sm leading-snug",children:"I have read and agree to the terms of this Non-Disclosure Agreement. I understand this is a legally binding agreement executed electronically."})]}),p&&e.jsx("p",{className:"text-sm text-destructive",children:p}),e.jsx("button",{onClick:R,disabled:!c||u||!a?.id,className:"w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-brand text-brand-foreground py-3 text-sm font-medium shadow-glow disabled:opacity-50 disabled:shadow-none transition-all hover:scale-[1.01]",children:u?e.jsxs(e.Fragment,{children:[e.jsx(D,{className:"h-4 w-4 animate-spin"})," Saving…"]}):e.jsxs(e.Fragment,{children:[e.jsx(L,{className:"h-4 w-4"})," Accept & Enter Deal Room"]})}),e.jsx("p",{className:"text-center text-xs text-muted-foreground pb-2",children:"Your acceptance is timestamped and logged with your browser's user-agent string."})]})]})]})})}export{K as component};
