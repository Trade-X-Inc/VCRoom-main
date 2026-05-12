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
const getAIAdvice_createServerFn_handler = createServerRpc({
  id: "397b3f65700da6e488c63bfeb016aac33e5f67ff2f57bcca85b9c84f5eace701",
  name: "getAIAdvice",
  filename: "src/lib/advisor-fn.ts"
}, (opts) => getAIAdvice.__executeServer(opts));
const getAIAdvice = createServerFn({
  method: "POST"
}).inputValidator((data) => data).handler(getAIAdvice_createServerFn_handler, async ({
  data
}) => {
  const openAIKey = process.env.OPENAI_API_KEY || globalThis.OPENAI_API_KEY || void 0 || "";
  const supabaseUrl = process.env.SUPABASE_URL || globalThis.SUPABASE_URL || "https://ldimninnjlvxozubheib.supabase.co";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || globalThis.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkaW1uaW5uamx2eG96dWJoZWliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczOTgzNjgsImV4cCI6MjA5Mjk3NDM2OH0.l57v3deTN8WraFeQM6HG_qMCYfo89R08wHa7L31T_wI";
  if (!openAIKey) {
    return {
      reply: "AI Advisor is not configured yet. Please add your OpenAI API key to get started.",
      error: "missing_key"
    };
  }
  let context = "";
  {
    try {
      const admin = createClient(supabaseUrl, supabaseKey);
      const [{
        data: startup
      }, {
        data: leads
      }, {
        data: meetings
      }] = await Promise.all([admin.from("startups").select("company_name, stage, sector, funding_target, revenue, traction").eq("founder_id", data.userId).maybeSingle(), admin.from("vc_leads").select("investor_name, firm_name, status, follow_up_date").eq("founder_id", data.userId), admin.from("meetings").select("title, scheduled_at").eq("created_by", data.userId).gte("scheduled_at", (/* @__PURE__ */ new Date()).toISOString()).limit(3)]);
      if (startup) {
        context = [`Company: ${startup.company_name || "Not set"}`, `Stage: ${startup.stage || "Not set"}`, `Sector: ${startup.sector || "Not set"}`, `Raising: ${startup.funding_target || "Not set"}`, `ARR: ${startup.revenue || "Not set"}`, `Total leads: ${leads?.length || 0}`, `Upcoming meetings: ${meetings?.length || 0}`].join("\n");
      }
    } catch (e) {
      console.error("Context fetch failed:", e);
    }
  }
  const systemPrompt = ["You are an expert fundraising advisor for startup founders.", context ? `
Current context:
${context}` : "", "\nHelp with: pipeline strategy, investor outreach, meeting prep, deal room advice.", "Be specific, direct, and actionable. Max 150 words. End with one clear next action."].join("");
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAIKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 400,
        messages: [{
          role: "system",
          content: systemPrompt
        }, ...data.history.slice(-6), {
          role: "user",
          content: data.message
        }]
      })
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error("OpenAI error:", err);
      return {
        reply: `AI error: ${err?.error?.message || "Unknown error"}`,
        error: "api_error"
      };
    }
    const result = await response.json();
    return {
      reply: result.choices[0].message.content,
      error: null
    };
  } catch (err) {
    console.error("Fetch error:", err);
    return {
      reply: "Connection error. Please try again.",
      error: "fetch_error"
    };
  }
});
export {
  getAIAdvice_createServerFn_handler
};
