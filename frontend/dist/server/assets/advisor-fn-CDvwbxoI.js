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
const sendAdvisorMessage_createServerFn_handler = createServerRpc({
  id: "b0451d818a4af8f61f8d6702b0a87626ab580dea9833910b8d678173c48d62e2",
  name: "sendAdvisorMessage",
  filename: "src/lib/advisor-fn.ts"
}, (opts) => sendAdvisorMessage.__executeServer(opts));
const sendAdvisorMessage = createServerFn({
  method: "POST"
}).inputValidator((data) => data).handler(sendAdvisorMessage_createServerFn_handler, async ({
  data
}) => {
  const supabaseUrl = process.env.SUPABASE_URL || globalThis.SUPABASE_URL || "https://ldimninnjlvxozubheib.supabase.co";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || globalThis.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkaW1uaW5uamx2eG96dWJoZWliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczOTgzNjgsImV4cCI6MjA5Mjk3NDM2OH0.l57v3deTN8WraFeQM6HG_qMCYfo89R08wHa7L31T_wI";
  const adminClient = createClient(supabaseUrl, serviceKey);
  const todayStart = /* @__PURE__ */ new Date();
  todayStart.setHours(0, 0, 0, 0);
  const {
    count: usedToday
  } = await adminClient.from("ai_usage").select("id", {
    count: "exact",
    head: true
  }).eq("user_id", data.userId).eq("action", "advisor_message").gte("created_at", todayStart.toISOString());
  const used = usedToday ?? 0;
  if (used >= 20) throw new Error("RATE_LIMIT: Daily limit of 20 messages reached. Resets tomorrow.");
  const [startup, leads, meetings, dealRooms] = await Promise.all([adminClient.from("startups").select("*").eq("founder_id", data.userId).maybeSingle().then((r) => r.data), adminClient.from("vc_leads").select("investor_name, firm_name, status, follow_up_date, email, next_action").eq("founder_id", data.userId).then((r) => r.data || []), adminClient.from("meetings").select("title, scheduled_at, platform, prep_notes").eq("created_by", data.userId).gte("scheduled_at", (/* @__PURE__ */ new Date()).toISOString()).order("scheduled_at", {
    ascending: true
  }).limit(5).then((r) => r.data || []), adminClient.from("deal_rooms").select("id, status, updated_at").limit(20).then((r) => r.data || [])]);
  const statusCounts = ["New", "Shortlisted", "Contacted", "Replied", "Meeting Booked", "Interested", "Deal Room Created", "Rejected", "Follow Up"].map((s) => ({
    status: s,
    count: leads.filter((l) => l.status === s).length
  })).filter((s) => s.count > 0);
  const overdueFollowUps = leads.filter((l) => l.follow_up_date && new Date(l.follow_up_date) < /* @__PURE__ */ new Date());
  const systemPrompt = `You are an expert fundraising advisor for ${startup?.company_name || "this startup"}.

COMPANY: ${startup?.company_name || "Not set"}
STAGE: ${startup?.stage || "Not set"}
SECTOR: ${startup?.sector || "Not set"}
RAISING: ${startup?.funding_target || "Not set"}
ARR: ${startup?.revenue || "Not set"}
TRACTION: ${startup?.traction || "Not set"}

PIPELINE SUMMARY (${leads.length} total leads):
${statusCounts.map((s) => `  ${s.status}: ${s.count}`).join("\n") || "  No leads yet"}

${overdueFollowUps.length > 0 ? `OVERDUE FOLLOW-UPS (${overdueFollowUps.length}):
${overdueFollowUps.slice(0, 5).map((l) => `  - ${l.investor_name} at ${l.firm_name || "unknown firm"} (due ${l.follow_up_date})`).join("\n")}` : "No overdue follow-ups"}

${meetings.length > 0 ? `UPCOMING MEETINGS:
${meetings.map((m) => `  - ${m.title} on ${new Date(m.scheduled_at).toLocaleDateString()}`).join("\n")}` : "No upcoming meetings scheduled"}

DEAL ROOMS: ${dealRooms.length} active

YOUR ROLE:
You are a senior fundraising advisor. Help the founder with:
- Pipeline analysis and prioritization
- Follow-up strategies for specific investors
- Meeting preparation
- Email and outreach advice
- Deal room strategy
- Investor objection handling
- Round strategy and timing

Always reference specific investors/meetings from the data above when relevant.
Be direct and actionable.
Max 150 words per response unless asked for more.
End every response with one clear next action.`;
  const apiKey = process.env.OPENAI_API_KEY || globalThis.OPENAI_API_KEY || "";
  if (!apiKey) {
    await adminClient.from("ai_usage").insert({
      user_id: data.userId,
      action: "advisor_message"
    });
    return {
      reply: startup?.company_name ? `Based on your pipeline (${leads.length} leads, ${dealRooms.length} deal rooms): Focus on converting meeting-stage leads first. Follow up within 48h of each meeting with a 3-bullet summary and a clear next step.` : "Complete your startup profile first — I'll give you much more specific advice once I can see your stage, sector, metrics, and fundraising target.",
      rateLimitRemaining: 20 - used - 1
    };
  }
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 300,
      temperature: 0.7,
      messages: [{
        role: "system",
        content: systemPrompt
      }, ...data.messages]
    })
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`OpenAI request failed (${resp.status}): ${errText}`);
  }
  const json = await resp.json();
  const reply = json.choices[0]?.message?.content ?? "No response generated.";
  await adminClient.from("ai_usage").insert({
    user_id: data.userId,
    action: "advisor_message"
  });
  return {
    reply,
    rateLimitRemaining: 20 - used - 1
  };
});
export {
  sendAdvisorMessage_createServerFn_handler
};
