import { c as createServerRpc } from "./createServerRpc-DExtfMwW.js";
import { c as createClient } from "./index-DYJmQpRE.js";
import { $ as createServerFn } from "./worker-entry-4qtpAlX3.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
const adminClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
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
  const [startupRes, leadCountRes, meetingCountRes, roomCountRes, activityRes] = await Promise.all([adminClient.from("startups").select("company_name, sector, stage, funding_target, traction, revenue, team_size").eq("founder_id", data.userId).limit(1).maybeSingle(), adminClient.from("vc_leads").select("id", {
    count: "exact",
    head: true
  }).eq("founder_id", data.userId), adminClient.from("vc_leads").select("id", {
    count: "exact",
    head: true
  }).eq("founder_id", data.userId).eq("status", "meeting"), adminClient.from("deal_rooms").select("id", {
    count: "exact",
    head: true
  }).eq("founder_id", data.userId), adminClient.from("activities").select("action").eq("actor_id", data.userId).order("created_at", {
    ascending: false
  }).limit(10)]);
  const startup = startupRes.data;
  const leadCount = leadCountRes.count ?? 0;
  const meetingCount = meetingCountRes.count ?? 0;
  const dealRoomCount = roomCountRes.count ?? 0;
  const recentActivity = activityRes.data?.map((a) => a.action).join(", ") ?? "none";
  const systemPrompt = startup ? `You are a senior fundraising advisor for ${startup.company_name}, a ${startup.stage ?? "early-stage"} ${startup.sector ?? "tech"} startup raising ${startup.funding_target ?? "a funding round"}.

Current pipeline:
- Total VC leads tracked: ${leadCount}
- Currently in meetings: ${meetingCount}
- Active deal rooms: ${dealRoomCount}
- Revenue: ${startup.revenue ?? "not shared"}
- Traction: ${startup.traction ?? "not shared"}
- Team size: ${startup.team_size ?? "not shared"}

Recent founder activity: ${recentActivity}

Give specific, actionable fundraising advice based on this real context. Be direct and concise. Max 150 words per response. No generic platitudes.` : `You are a senior fundraising advisor. The founder hasn't completed their startup profile yet — encourage them to set up their profile at /app/profile for personalized advice. Be helpful and welcoming.`;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    await adminClient.from("ai_usage").insert({
      user_id: data.userId,
      action: "advisor_message"
    });
    return {
      reply: startup ? `Based on your pipeline (${leadCount} leads, ${meetingCount} in meetings, ${dealRoomCount} deal rooms): Focus on converting your meeting-stage leads first. Follow up within 48h of each meeting with a 3-bullet summary and clear next step. Aim for 1 new warm intro per day from existing connections.` : "Complete your startup profile first — I'll give you much more specific advice once I can see your stage, sector, metrics, and fundraising target.",
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
  if (!resp.ok) throw new Error("AI request failed");
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
