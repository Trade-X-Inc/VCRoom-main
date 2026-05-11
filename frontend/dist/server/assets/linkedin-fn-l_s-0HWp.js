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
const generateLinkedInMessage_createServerFn_handler = createServerRpc({
  id: "272077c9c144c7cbae7da95efd3b0536517866897833aab391e7e9e60debb102",
  name: "generateLinkedInMessage",
  filename: "src/lib/linkedin-fn.ts"
}, (opts) => generateLinkedInMessage.__executeServer(opts));
const generateLinkedInMessage = createServerFn({
  method: "POST"
}).inputValidator((data) => data).handler(generateLinkedInMessage_createServerFn_handler, async ({
  data
}) => {
  const supabaseUrl = process.env.SUPABASE_URL || "https://ldimninnjlvxozubheib.supabase.co";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkaW1uaW5uamx2eG96dWJoZWliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczOTgzNjgsImV4cCI6MjA5Mjk3NDM2OH0.l57v3deTN8WraFeQM6HG_qMCYfo89R08wHa7L31T_wI";
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
  const userPrompt = `Write a LinkedIn connection request from ${startup?.founder_name ?? "a founder"} of ${startup?.company_name ?? "a startup"} to ${lead.investor_name}${lead.firm_name ? ` at ${lead.firm_name}` : ""}.
Startup: ${startup?.sector ?? lead.sector ?? "tech"} sector, ${startup?.stage ?? lead.stage ?? "early"} stage, raising ${startup?.funding_target ?? "seed round"}.
Keep the message under 300 characters. Be genuine and specific, not salesy. Just ask to connect.`;
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 150,
      temperature: 0.7,
      messages: [{
        role: "system",
        content: "You write short LinkedIn connection request messages. Return only the message text, no quotes, no explanation."
      }, {
        role: "user",
        content: userPrompt
      }]
    })
  });
  if (!resp.ok) throw new Error("OpenAI request failed");
  const json = await resp.json();
  const message = (json.choices[0]?.message?.content ?? "").trim();
  if (!message) throw new Error("Invalid AI response");
  await adminClient.from("ai_usage").insert({
    user_id: data.userId,
    action: "linkedin_gen"
  });
  return {
    message
  };
});
export {
  generateLinkedInMessage_createServerFn_handler
};
