import { c as createServerRpc } from "./createServerRpc-DExtfMwW.js";
import { c as createClient } from "./index-DYJmQpRE.js";
import { $ as createServerFn } from "./worker-entry-4qtpAlX3.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
const adminClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const systemPrompt = `You are an expert fundraising advisor helping startup founders write concise, personalized investor outreach emails.
Return ONLY valid JSON in this exact format:
{"subject":"...","body":"..."}
No markdown, no explanation, just the JSON object.`;
const generateOutreachEmail_createServerFn_handler = createServerRpc({
  id: "1d719b02e5cbb8bfb1f5fdbf08bea97cdac2cfff952491ca07a2d91de6f74c81",
  name: "generateOutreachEmail",
  filename: "src/lib/ai-fn.ts"
}, (opts) => generateOutreachEmail.__executeServer(opts));
const generateOutreachEmail = createServerFn({
  method: "POST"
}).inputValidator((data) => data).handler(generateOutreachEmail_createServerFn_handler, async ({
  data
}) => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1e3).toISOString();
  const {
    count
  } = await adminClient.from("ai_usage").select("id", {
    count: "exact",
    head: true
  }).eq("user_id", data.userId).eq("action", "email_gen").gte("created_at", oneHourAgo);
  if ((count ?? 0) >= 10) throw new Error("Rate limit exceeded");
  const {
    data: lead,
    error: leadErr
  } = await adminClient.from("vc_leads").select("*").eq("id", data.leadId).single();
  if (leadErr || !lead) throw new Error("Lead not found");
  if (lead.founder_id !== data.userId) throw new Error("Unauthorized");
  const {
    data: startup
  } = await adminClient.from("startups").select("*").eq("founder_id", data.userId).limit(1).maybeSingle();
  const userPrompt = data.type === "cold" ? `Write a cold outreach email from ${startup?.company_name ?? "our startup"} founder to ${lead.investor_name} at ${lead.firm_name ?? "their firm"}.
Startup: ${startup?.sector ?? lead.sector ?? "tech"} sector, ${startup?.stage ?? lead.stage ?? "early"} stage, raising ${startup?.funding_target ?? "seed round"}.
Investor focus: ${lead.sector ?? "various"}, ${lead.stage ?? "early-stage"}.
Keep it under 120 words. Be specific, not generic.
Subject line should be intriguing, under 8 words.` : `Write a follow-up email. The founder previously contacted ${lead.investor_name} at ${lead.firm_name ?? "their firm"}.
Current status: ${lead.status}.
Notes context: ${lead.notes ?? "none"}.
Keep it under 80 words. Reference prior contact.
Be warm but direct.`;
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 400,
      temperature: 0.7,
      messages: [{
        role: "system",
        content: systemPrompt
      }, {
        role: "user",
        content: userPrompt
      }]
    })
  });
  if (!resp.ok) throw new Error("OpenAI request failed");
  const json = await resp.json();
  const raw = json.choices[0]?.message?.content ?? "";
  const parsed = JSON.parse(raw);
  if (!parsed.subject || !parsed.body) throw new Error("Invalid AI response");
  await adminClient.from("ai_usage").insert({
    user_id: data.userId,
    action: "email_gen"
  });
  return {
    subject: parsed.subject,
    body: parsed.body
  };
});
export {
  generateOutreachEmail_createServerFn_handler
};
