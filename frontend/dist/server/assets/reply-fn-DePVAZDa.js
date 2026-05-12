import { c as createServerRpc } from "./createServerRpc-D_-6bKnO.js";
import { createClient } from "@supabase/supabase-js";
import { c as createServerFn } from "../server.js";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core/ssr/server";
import "react";
import "@tanstack/react-router";
import "react/jsx-runtime";
import "@tanstack/react-router/ssr/server";
const generateReply_createServerFn_handler = createServerRpc({
  id: "08b07e340aa3dd2c22b3ea45b5ff6e1a1e3844f3dadeb4cfd75858793e9c8fb3",
  name: "generateReply",
  filename: "src/lib/reply-fn.ts"
}, (opts) => generateReply.__executeServer(opts));
const generateReply = createServerFn({
  method: "POST"
}).inputValidator((data) => data).handler(generateReply_createServerFn_handler, async ({
  data
}) => {
  const supabaseUrl = process.env.SUPABASE_URL || globalThis.SUPABASE_URL || "https://ldimninnjlvxozubheib.supabase.co";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || globalThis.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkaW1uaW5uamx2eG96dWJoZWliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczOTgzNjgsImV4cCI6MjA5Mjk3NDM2OH0.l57v3deTN8WraFeQM6HG_qMCYfo89R08wHa7L31T_wI";
  const openAIKey = process.env.OPENAI_API_KEY || globalThis.OPENAI_API_KEY || void 0 || "";
  const adminClient = createClient(supabaseUrl, serviceKey);
  const {
    data: lead,
    error: leadErr
  } = await adminClient.from("vc_leads").select("*").eq("id", data.leadId).single();
  if (leadErr || !lead) throw new Error("Lead not found");
  if (lead.founder_id !== data.userId) throw new Error("Unauthorized");
  const {
    data: startup
  } = await adminClient.from("startups").select("company_name, sector, stage, funding_target, founder_name").eq("founder_id", data.userId).limit(1).maybeSingle();
  const userPrompt = `The investor ${lead.investor_name}${lead.firm_name ? ` from ${lead.firm_name}` : ""} replied to the founder:

"${data.investorReply}"

Write a professional follow-up reply from ${startup?.founder_name ?? "the founder"} of ${startup?.company_name ?? "the startup"}.
Current lead status: ${lead.status}.
Keep it under 150 words. Be warm, professional, and move the conversation forward.`;
  if (!openAIKey) throw new Error("OpenAI not configured");
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openAIKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 300,
      temperature: 0.7,
      messages: [{
        role: "system",
        content: "You write professional email replies for startup founders responding to investors. Return only the reply text, no subject line, no explanation."
      }, {
        role: "user",
        content: userPrompt
      }]
    })
  });
  if (!resp.ok) throw new Error("OpenAI request failed");
  const json = await resp.json();
  const reply = (json.choices[0]?.message?.content ?? "").trim();
  if (!reply) throw new Error("Invalid AI response");
  await adminClient.from("ai_usage").insert({
    user_id: data.userId,
    action: "reply_gen"
  });
  return {
    reply
  };
});
export {
  generateReply_createServerFn_handler
};
