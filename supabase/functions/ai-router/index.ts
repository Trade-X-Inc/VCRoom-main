import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL_MAP: Record<string, string> = {
  chat: "gpt-4o-mini",
  readiness_score: "gpt-4o-mini",
  coaching: "gpt-4o-mini",
  nudge: "gpt-4o-mini",
  investor_sim: "gpt-4o",
  verification: "gpt-4o",
  deal_brief: "gpt-4o",
  dd_report: "gpt-4o",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OpenAI key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { task_type, messages, system_prompt, user_id } = await req.json() as {
      task_type: string;
      messages: Array<{ role: string; content: string }>;
      system_prompt: string;
      user_id?: string;
    };

    const model = MODEL_MAP[task_type] ?? "gpt-4o-mini";

    // Rate limit check — fail open on any infra error
    if (user_id && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: allowed, error: rateLimitErr } = await sb.rpc("check_ai_rate_limit", {
        p_user_id: user_id,
        p_feature: task_type,
      });
      if (!rateLimitErr && allowed === false) {
        return new Response(
          JSON.stringify({ error: "Daily limit reached" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Append formatting rule to every system prompt — ensures no markdown bleed-through
    const FORMATTING_RULE = "\n\nFORMATTING RULE: Never use markdown formatting. No ** bold **, no ## headers, no bullet points with *. Write in plain sentences. Use numbered lists (1. 2. 3.) only when listing steps. Keep responses under 150 words unless specifically asked for detail.";
    const effectiveSystemPrompt = system_prompt + (task_type === "chat" ? FORMATTING_RULE : "");

    // Build message array — system prompt first, then conversation history
    const openAIMessages = [
      { role: "system", content: effectiveSystemPrompt },
      ...messages,
    ];

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: openAIMessages,
        max_tokens: 1500,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return new Response(
        JSON.stringify({ error: `OpenAI error ${resp.status}: ${errText.slice(0, 200)}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const completion = await resp.json() as any;
    const content = completion.choices?.[0]?.message?.content ?? "";

    // Increment usage — fire and forget, never block response
    if (user_id && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      sb.rpc("check_and_increment_ai_usage", {
        p_user_id: user_id,
        p_feature: task_type,
      }).catch(() => {});
    }

    return new Response(
      JSON.stringify({ content, model, task_type }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message ?? "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
