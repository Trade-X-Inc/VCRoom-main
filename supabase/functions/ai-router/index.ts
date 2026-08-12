import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveUid } from "./_shared/auth.ts";

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

const VALID_FEATURES = new Set(["coaching", "readiness", "investor_sim", "dd_report", "deal_brief"]);

// Identity derivation moved to ../_shared/auth.ts on 11 Aug 2026 (CLAUDE.md
// §19d.1) — this was the original implementation resolveUid() was extracted
// from. No behavior change: same check, same anon-key rejection, same return
// shape. See CLAUDE.md §7.1 and the ai-router audit (§17).

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

    // Authenticate the caller from their token before anything else. The
    // request body's user_id is never trusted for identity.
    const uid = await resolveUid(req, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    if (!uid) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { task_type, messages, system_prompt } = await req.json() as {
      task_type: string;
      messages: Array<{ role: string; content: string }>;
      system_prompt: string;
    };

    const model = MODEL_MAP[task_type] ?? "gpt-4o-mini";
    const p_feature = VALID_FEATURES.has(task_type) ? task_type : "chat";

    // Rate limit check — fail open on any infra error
    if (uid && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { data: allowed, error: rateLimitErr } = await sb.rpc("check_ai_rate_limit", {
          p_user_id: uid,
          p_feature,
        });
        if (!rateLimitErr && allowed === false) {
          return new Response(
            JSON.stringify({ error: "Daily limit reached" }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      } catch (_) {
        // fail open — rate limit check never blocks the request
      }
    }

    // Anti-fabrication guardrail — appended to EVERY task_type, not just chat.
    // This model has repeatedly invented platform features that do not exist
    // (see §17 audit). Assertion-boundary language, generalised from the DD
    // caller which already carried it, so no single caller can omit it.
    const ANTI_FABRICATION_RULE = "\n\nACCURACY RULE (never override): Treat all data provided to you as unverified claims, not established fact. Never invent, assume, or embellish — no features, tools, numbers, pages, scores, or capabilities you cannot see in what you were given. If you are unsure whether something exists or is true, say you don't have that information rather than fabricating it. Surface uncertainty; do not paper over it.";

    // Append formatting rule for chat task type
    const FORMATTING_RULE = "\n\nFORMATTING RULE: Never use markdown formatting. No ** bold **, no ## headers, no bullet points with *. Write in plain sentences. Use numbered lists (1. 2. 3.) only when listing steps. Keep responses under 150 words unless specifically asked for detail.";
    const effectiveSystemPrompt = system_prompt + ANTI_FABRICATION_RULE + (task_type === "chat" ? FORMATTING_RULE : "");

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
    if (uid && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      (async () => {
        try {
          const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          await sb.rpc("check_and_increment_ai_usage", {
            p_user_id: uid,
            p_feature,
          });
        } catch (_) {}
      })();
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
