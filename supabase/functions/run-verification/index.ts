import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY =
  Deno.env.get("OPENAI_API_KEY") ??
  Deno.env.get("OPEN_AI_API_KEY") ??
  "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Atlas Robotics — hardcoded guard: this startup must never reach tier 1.
// It is used as a demo/test fixture and must never acquire a real verification badge.
const ATLAS_ROBOTICS_ID = "ebfcaf98-13e5-4e33-a0ad-175d8c041580";

const FREE_EMAIL_PROVIDERS = new Set([
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com",
  "icloud.com", "me.com", "live.com", "protonmail.com",
]);

function emailDomain(email: string): string {
  return (email.split("@")[1] ?? "").toLowerCase().trim();
}

function urlDomain(url: string): string {
  if (!url) return "";
  try {
    const normalized = url.startsWith("http") ? url : `https://${url}`;
    return new URL(normalized).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].toLowerCase();
  }
}

async function checkUrlResolves(url: string): Promise<boolean> {
  if (!url) return false;
  const normalized = url.startsWith("http") ? url : `https://${url}`;
  try {
    const resp = await fetch(normalized, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(6000),
    });
    return resp.status < 400;
  } catch {
    try {
      const http = normalized.replace("https://", "http://");
      const resp2 = await fetch(http, {
        method: "HEAD",
        redirect: "follow",
        signal: AbortSignal.timeout(5000),
      });
      return resp2.status < 400;
    } catch {
      return false;
    }
  }
}

async function fetchPageText(url: string): Promise<string> {
  if (!url) return "";
  const normalized = url.startsWith("http") ? url : `https://${url}`;
  try {
    const resp = await fetch(normalized, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "Hockystick-Verification-Bot/1.0" },
    });
    if (!resp.ok) return "";
    const html = await resp.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 3000);
  } catch {
    return "";
  }
}

// Check if founder has uploaded a legal/registration document
async function checkRegistrationDocument(sb: any, startup_id: string): Promise<boolean> {
  const { data } = await sb
    .from("founder_documents")
    .select("id")
    .eq("startup_id", startup_id)
    .in("template_slug", ["legal_registration", "company_registration", "certificate_of_incorporation", "trade_license"])
    .limit(1);
  return (data ?? []).length > 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json() as { startup_id: string; user_id: string };
    const { startup_id, user_id } = body;

    if (!startup_id || !user_id) {
      return new Response(
        JSON.stringify({ error: "startup_id and user_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── 1. Rate limit ──────────────────────────────────────────────────────────
    const { data: allowed, error: rateLimitErr } = await sb.rpc("check_ai_rate_limit", {
      p_user_id: user_id,
      p_feature: "verification",
    });
    if (!rateLimitErr && allowed === false) {
      return new Response(
        JSON.stringify({ error: "Daily verification limit reached" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 2. Fetch startup ───────────────────────────────────────────────────────
    const { data: startup, error: startupErr } = await sb
      .from("startups")
      .select("id, company_name, website, founder_linkedin, founder_email, sector, stage, tagline, description")
      .eq("id", startup_id)
      .maybeSingle();

    if (startupErr || !startup) {
      return new Response(
        JSON.stringify({ error: "Startup not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 3. Atlas Robotics guard — must never pass tier 1 ──────────────────────
    const isAtlas = startup_id === ATLAS_ROBOTICS_ID;

    // ── 4. Run checks in parallel ──────────────────────────────────────────────
    // Registry check is now document-based — founder uploads their registration document
    const [website_resolves, registry_confirmed] = await Promise.all([
      isAtlas ? Promise.resolve(false) : checkUrlResolves(startup.website ?? ""),
      isAtlas ? Promise.resolve(false) : checkRegistrationDocument(sb, startup_id),
    ]);

    // LinkedIn: format check only — no fetch (ToS)
    const linkedin_valid = isAtlas
      ? false
      : /linkedin\.com\/(in|company)\/[a-zA-Z0-9_-]+/.test(startup.founder_linkedin ?? "");

    // Email domain
    let email_domain_matches = false;
    if (!isAtlas && startup.founder_email && startup.website) {
      const eDomain = emailDomain(startup.founder_email);
      const wDomain = urlDomain(startup.website);
      if (eDomain && wDomain && !FREE_EMAIL_PROVIDERS.has(eDomain)) {
        email_domain_matches =
          eDomain === wDomain ||
          eDomain.endsWith(`.${wDomain}`) ||
          wDomain.endsWith(`.${eDomain}`);
      }
    }

    // Website content AI match (only if website resolves)
    let website_matches_pitch = false;
    let website_content_summary = "";

    if (!isAtlas && website_resolves && startup.website && OPENAI_API_KEY) {
      const pageText = await fetchPageText(startup.website);
      if (pageText.length > 100) {
        const pitchContext = [
          startup.company_name && `Company: ${startup.company_name}`,
          startup.sector && `Sector: ${startup.sector}`,
          startup.stage && `Stage: ${startup.stage}`,
          startup.tagline && `Tagline: ${startup.tagline}`,
          startup.description && `Description: ${startup.description?.slice(0, 300)}`,
        ].filter(Boolean).join("\n");

        try {
          const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              max_tokens: 200,
              messages: [
                {
                  role: "system",
                  content: 'You are a verification analyst. Given a company profile and website text, determine if the website content is consistent with the company profile. Respond with JSON only: {"matches": true/false, "summary": "one sentence explanation"}',
                },
                {
                  role: "user",
                  content: `COMPANY PROFILE:\n${pitchContext}\n\nWEBSITE TEXT (first 3000 chars):\n${pageText}`,
                },
              ],
            }),
            signal: AbortSignal.timeout(15000),
          });
          if (aiResp.ok) {
            const aiData: any = await aiResp.json();
            const raw = aiData.choices?.[0]?.message?.content ?? "{}";
            const cleaned = raw
              .replace(/^```json\s*/i, "")
              .replace(/^```\s*/i, "")
              .replace(/```\s*$/i, "")
              .trim();
            const parsed = JSON.parse(cleaned);
            website_matches_pitch = parsed.matches === true;
            website_content_summary = parsed.summary ?? "";
          }
        } catch {
          website_content_summary = "AI check unavailable";
        }
      }
    } else if (!OPENAI_API_KEY) {
      website_content_summary = "AI check skipped (no key)";
    }

    // ── 5. Score ───────────────────────────────────────────────────────────────
    // New document-based scoring:
    //   20 pts: business email domain (not gmail/yahoo)
    //   20 pts: website resolves
    //   20 pts: LinkedIn URL format valid
    //   40 pts: registration document uploaded
    // 60+ = checks passed
    let tier1_score: number;
    let tier1_passed: boolean;

    if (isAtlas) {
      // Hardcoded guard: Atlas Robotics always tier 0
      tier1_score = 0;
      tier1_passed = false;
    } else {
      tier1_score =
        (email_domain_matches ? 20 : 0) +
        (website_resolves ? 20 : 0) +
        (linkedin_valid ? 20 : 0) +
        (registry_confirmed ? 40 : 0);
      tier1_passed = tier1_score >= 60;
    }

    const current_tier = tier1_passed ? 1 : 0;
    const tier1_checked_at = new Date().toISOString();

    // ── 6. Upsert founder_verifications ───────────────────────────────────────
    const verifPayload = {
      startup_id,
      website_resolves,
      website_matches_pitch,
      website_content_summary,
      linkedin_valid,
      email_domain_matches,
      registry_confirmed,
      tier1_score,
      tier1_passed,
      tier1_checked_at,
      current_tier,
      last_full_check_at: tier1_checked_at,
      updated_at: tier1_checked_at,
    };

    const { error: upsertErr } = await sb
      .from("founder_verifications")
      .upsert(verifPayload, { onConflict: "startup_id" });

    if (upsertErr) {
      console.error("[run-verification] upsert error:", upsertErr);
    }

    // ── 7. Update startups.registry_verified ───────────────────────────────────
    Promise.resolve(
      sb.from("startups")
        .update({
          registry_verified: tier1_passed,
          registry_verified_at: tier1_passed ? tier1_checked_at : null,
          updated_at: tier1_checked_at,
        })
        .eq("id", startup_id)
    ).catch((e: any) => console.warn("[run-verification] startups update failed:", e));

    // ── 8. Increment usage (fire and forget) ───────────────────────────────────
    Promise.resolve(
      sb.rpc("check_and_increment_ai_usage", {
        p_user_id: user_id,
        p_feature: "verification",
      })
    ).catch((e: any) => console.warn("[run-verification] usage increment failed:", e));

    console.log(
      `[run-verification] done: startup=${startup_id} atlas=${isAtlas} tier1_score=${tier1_score} tier1_passed=${tier1_passed}`
    );

    return new Response(
      JSON.stringify({
        startup_id,
        website_resolves,
        website_matches_pitch,
        website_content_summary,
        linkedin_valid,
        email_domain_matches,
        registry_confirmed,
        tier1_score,
        tier1_passed,
        current_tier,
        tier1_checked_at,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("[run-verification] unexpected error:", err?.message ?? err);
    return new Response(
      JSON.stringify({ error: err?.message ?? "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
