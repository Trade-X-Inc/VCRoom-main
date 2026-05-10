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
  const supabaseUrl = process.env.SUPABASE_URL || "https://ldimninnjlvxozubheib.supabase.co";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkaW1uaW5uamx2eG96dWJoZWliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczOTgzNjgsImV4cCI6MjA5Mjk3NDM2OH0.l57v3deTN8WraFeQM6HG_qMCYfo89R08wHa7L31T_wI";
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
  const upcomingCutoff = new Date(Date.now() + 14 * 24 * 60 * 60 * 1e3).toISOString();
  const [startupRes, leadsRes, meetingsRes, roomCountRes, activityRes] = await Promise.all([adminClient.from("startups").select("company_name, sector, stage, funding_target, traction, revenue, team_size, key_metric, growth_rate, customer_count, tagline").eq("founder_id", data.userId).limit(1).maybeSingle(), adminClient.from("vc_leads").select("status").eq("founder_id", data.userId), adminClient.from("meetings").select("title, scheduled_at, meeting_type, platform").gte("scheduled_at", (/* @__PURE__ */ new Date()).toISOString()).lte("scheduled_at", upcomingCutoff).order("scheduled_at", {
    ascending: true
  }).limit(5), adminClient.from("deal_rooms").select("id", {
    count: "exact",
    head: true
  }).eq("founder_id", data.userId), adminClient.from("activities").select("action").eq("actor_id", data.userId).order("created_at", {
    ascending: false
  }).limit(10)]);
  const startup = startupRes.data;
  const leads = leadsRes.data ?? [];
  const leadCount = leads.length;
  const dealRoomCount = roomCountRes.count ?? 0;
  const recentActivity = activityRes.data?.map((a) => a.action).join(", ") ?? "none";
  const statusCounts = {};
  for (const l of leads) {
    const s = l.status ?? "Unknown";
    statusCounts[s] = (statusCounts[s] ?? 0) + 1;
  }
  const leadBreakdown = Object.entries(statusCounts).map(([s, n]) => `${n} ${s}`).join(", ") || "none";
  const upcomingMeetings = (meetingsRes.data ?? []).map((m) => `${m.title} on ${new Date(m.scheduled_at).toLocaleDateString()} via ${m.platform ?? "TBD"}`).join("; ") || "none scheduled";
  const systemPrompt = startup ? `You are a senior fundraising advisor for ${startup.company_name}, a ${startup.stage ?? "early-stage"} ${startup.sector ?? "tech"} startup raising ${startup.funding_target ?? "a funding round"}.
${startup.tagline ? `
Tagline: ${startup.tagline}` : ""}

Current pipeline:
- Total VC leads tracked: ${leadCount}
- Lead breakdown by status: ${leadBreakdown}
- Active deal rooms (investor data rooms): ${dealRoomCount}
- Upcoming meetings (next 14 days): ${upcomingMeetings}

Company metrics:
- Revenue / ARR: ${startup.revenue ?? "not shared"}
- Traction: ${startup.traction ?? "not shared"}
- Key metric: ${startup.key_metric ?? "not shared"}
- Growth rate: ${startup.growth_rate ?? "not shared"}
- Customers: ${startup.customer_count ?? "not shared"}
- Team size: ${startup.team_size ?? "not shared"}

Recent founder activity: ${recentActivity}

Give specific, actionable fundraising advice based on this real context. Reference exact numbers when relevant. Be direct and concise. Max 150 words per response. No generic platitudes.` : `You are a senior fundraising advisor. The founder hasn't completed their startup profile yet — encourage them to set up their profile at /app/profile for personalized advice. Be helpful and welcoming.`;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    await adminClient.from("ai_usage").insert({
      user_id: data.userId,
      action: "advisor_message"
    });
    return {
      reply: startup ? `Based on your pipeline (${leadCount} leads across statuses: ${leadBreakdown}; ${dealRoomCount} deal rooms): Focus on converting meeting-stage leads first. Follow up within 48h of each meeting with a 3-bullet summary and clear next step. Aim for 1 new warm intro per day from existing connections.` : "Complete your startup profile first — I'll give you much more specific advice once I can see your stage, sector, metrics, and fundraising target.",
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
