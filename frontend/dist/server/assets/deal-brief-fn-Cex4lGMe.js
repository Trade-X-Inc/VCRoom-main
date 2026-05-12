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
const generateDealBrief_createServerFn_handler = createServerRpc({
  id: "56f68b50d6d653ae4f4287eb005bbb35fecea7fa7ce69a4b2a6cc974383a502e",
  name: "generateDealBrief",
  filename: "src/lib/deal-brief-fn.ts"
}, (opts) => generateDealBrief.__executeServer(opts));
const generateDealBrief = createServerFn({
  method: "POST"
}).inputValidator((data) => data).handler(generateDealBrief_createServerFn_handler, async ({
  data
}) => {
  const supabaseUrl = process.env.SUPABASE_URL || globalThis.SUPABASE_URL || "https://ldimninnjlvxozubheib.supabase.co";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || globalThis.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkaW1uaW5uamx2eG96dWJoZWliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczOTgzNjgsImV4cCI6MjA5Mjk3NDM2OH0.l57v3deTN8WraFeQM6HG_qMCYfo89R08wHa7L31T_wI";
  const adminClient = createClient(supabaseUrl, serviceKey);
  const {
    data: member
  } = await adminClient.from("deal_room_members").select("user_id").eq("deal_room_id", data.dealRoomId).eq("user_id", data.userId).maybeSingle();
  if (!member) throw new Error("Unauthorized");
  const {
    data: room
  } = await adminClient.from("deal_rooms").select("startup_id").eq("id", data.dealRoomId).single();
  const {
    data: startup
  } = room?.startup_id ? await adminClient.from("startups").select("company_name, sector, stage, funding_target, traction, description").eq("id", room.startup_id).maybeSingle() : {
    data: null
  };
  const {
    data: activities
  } = await adminClient.from("activities").select("action, created_at").eq("deal_room_id", data.dealRoomId).order("created_at", {
    ascending: false
  }).limit(10);
  const activitySummary = (activities ?? []).map((a) => a.action).join(", ");
  const companyName = startup?.company_name ?? "Unknown startup";
  const userPrompt = `Analyze this startup for investment:
Company: ${companyName}
Sector: ${startup?.sector ?? "Unknown"}
Stage: ${startup?.stage ?? "Unknown"}
Funding target: ${startup?.funding_target ?? "Unknown"}
Traction: ${startup?.traction ?? "Unknown"}
Description: ${startup?.description ?? "None provided"}
Recent activity: ${activitySummary || "None"}`;
  const apiKey = process.env.OPENAI_API_KEY || globalThis.OPENAI_API_KEY || "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";
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 600,
      temperature: 0.4,
      messages: [{
        role: "system",
        content: `You are an investment analyst. Return ONLY valid JSON:
{"matchScore":0-100,"matchLabel":"Strong fit|Moderate fit|Weak fit","strengths":["...","...","..."],"risks":["...","...","..."],"mitigants":["...","...","..."],"nextAction":"..."}`
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
  if (typeof parsed.matchScore !== "number" || !Array.isArray(parsed.strengths)) {
    throw new Error("Invalid AI response shape");
  }
  return parsed;
});
export {
  generateDealBrief_createServerFn_handler
};
