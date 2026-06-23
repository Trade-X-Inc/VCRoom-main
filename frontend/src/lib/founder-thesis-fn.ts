import { createServerFn } from "@tanstack/react-start";
import { getEnvVar } from "@/lib/env";

export type FounderThesis = {
  id: string;
  startup_id: string;
  preferred_check_size_min: string | null;
  preferred_check_size_max: string | null;
  preferred_investor_type: string | null;
  board_preference: string | null;
  sector_expertise_wanted: string | null;
  geography_preference: string | null;
  exclusions: string | null;
  what_good_fit_looks_like: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
};

type GetInput = { startupId: string };
type SaveInput = {
  startupId: string;
  preferred_check_size_min: string;
  preferred_check_size_max: string;
  preferred_investor_type: string;
  board_preference: string;
  sector_expertise_wanted: string;
  geography_preference: string;
  exclusions: string;
  what_good_fit_looks_like: string;
  status: "draft" | "complete";
};

export const getFounderThesis = createServerFn({ method: "POST" })
  .inputValidator((d: unknown): GetInput => d as GetInput)
  .handler(async ({ data }): Promise<FounderThesis | null> => {
    const supabaseUrl = getEnvVar("SUPABASE_URL") || getEnvVar("VITE_SUPABASE_URL");
    const supabaseKey = getEnvVar("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) return null;
    const resp = await fetch(
      `${supabaseUrl}/rest/v1/founder_thesis?startup_id=eq.${data.startupId}&limit=1`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, "Content-Type": "application/json" } },
    );
    const rows = await resp.json() as FounderThesis[];
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  });

export const saveFounderThesis = createServerFn({ method: "POST" })
  .inputValidator((d: unknown): SaveInput => d as SaveInput)
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const supabaseUrl = getEnvVar("SUPABASE_URL") || getEnvVar("VITE_SUPABASE_URL");
    const supabaseKey = getEnvVar("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) return { ok: false, error: "Missing config" };

    const now = new Date().toISOString();
    const payload = {
      startup_id: data.startupId,
      preferred_check_size_min: data.preferred_check_size_min || null,
      preferred_check_size_max: data.preferred_check_size_max || null,
      preferred_investor_type: data.preferred_investor_type || null,
      board_preference: data.board_preference || null,
      sector_expertise_wanted: data.sector_expertise_wanted || null,
      geography_preference: data.geography_preference || null,
      exclusions: data.exclusions || null,
      what_good_fit_looks_like: data.what_good_fit_looks_like || null,
      status: data.status,
      updated_at: now,
    };

    const resp = await fetch(
      `${supabaseUrl}/rest/v1/founder_thesis?startup_id=eq.${data.startupId}`,
      {
        method: "PATCH",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(payload),
      },
    );

    // If no row exists yet, insert
    if (resp.status === 404 || resp.headers.get("content-range") === "*/0") {
      const insertResp = await fetch(`${supabaseUrl}/rest/v1/founder_thesis`, {
        method: "POST",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ ...payload, created_at: now }),
      });
      if (!insertResp.ok) {
        const body = await insertResp.text();
        return { ok: false, error: `Insert failed: ${body}` };
      }
      return { ok: true };
    }

    if (!resp.ok) {
      const body = await resp.text();
      // If PATCH matched 0 rows (no existing record), fall through to upsert via POST
      if (resp.status === 200 || resp.status === 204) return { ok: true };
      return { ok: false, error: `Save failed: ${body}` };
    }
    return { ok: true };
  });

// Upsert (handles both insert and update cleanly via Supabase upsert)
export const upsertFounderThesis = createServerFn({ method: "POST" })
  .inputValidator((d: unknown): SaveInput => d as SaveInput)
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const supabaseUrl = getEnvVar("SUPABASE_URL") || getEnvVar("VITE_SUPABASE_URL");
    const supabaseKey = getEnvVar("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) return { ok: false, error: "Missing config" };

    const now = new Date().toISOString();
    const resp = await fetch(`${supabaseUrl}/rest/v1/founder_thesis`, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        startup_id: data.startupId,
        preferred_check_size_min: data.preferred_check_size_min || null,
        preferred_check_size_max: data.preferred_check_size_max || null,
        preferred_investor_type: data.preferred_investor_type || null,
        board_preference: data.board_preference || null,
        sector_expertise_wanted: data.sector_expertise_wanted || null,
        geography_preference: data.geography_preference || null,
        exclusions: data.exclusions || null,
        what_good_fit_looks_like: data.what_good_fit_looks_like || null,
        status: data.status,
        updated_at: now,
        created_at: now,
      }),
    });

    if (!resp.ok) {
      const body = await resp.text();
      console.error("[upsertFounderThesis] error:", resp.status, body);
      return { ok: false, error: `Save failed ${resp.status}: ${body}` };
    }
    return { ok: true };
  });

// AI-propose thesis defaults from founder profile context
type ProposeInput = {
  sector: string;
  stage: string;
  problem: string;
  solution: string;
  revenue: string;
  traction: string;
  country: string;
  company_name: string;
};

type ThesisProposal = {
  ok: boolean;
  preferred_check_size_min: string;
  preferred_check_size_max: string;
  preferred_investor_type: string;
  board_preference: string;
  sector_expertise_wanted: string;
  geography_preference: string;
  exclusions: string;
  what_good_fit_looks_like: string;
  error?: string;
};

export const proposeFounderThesis = createServerFn({ method: "POST" })
  .inputValidator((d: unknown): ProposeInput => d as ProposeInput)
  .handler(async ({ data }): Promise<ThesisProposal> => {
    const cfEnv = (globalThis as any).__cf_env || {};
    const openaiKey = cfEnv.OPENAI_API_KEY || cfEnv.OPEN_AI_API_KEY || cfEnv["OPEN AI API KEY"] || "";

    const blank: ThesisProposal = {
      ok: false,
      preferred_check_size_min: "", preferred_check_size_max: "",
      preferred_investor_type: "", board_preference: "",
      sector_expertise_wanted: "", geography_preference: "",
      exclusions: "", what_good_fit_looks_like: "",
    };

    if (!openaiKey) return { ...blank, error: "AI unavailable" };

    const ctx = [
      `Company: ${data.company_name || "Unknown"}`,
      data.sector ? `Sector: ${data.sector}` : "",
      data.stage ? `Stage: ${data.stage}` : "",
      data.problem ? `Problem: ${data.problem}` : "",
      data.solution ? `Solution: ${data.solution}` : "",
      data.revenue ? `Revenue: ${data.revenue}` : "",
      data.traction ? `Traction: ${data.traction}` : "",
      data.country ? `Location: ${data.country}` : "",
    ].filter(Boolean).join("\n");

    try {
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 500,
          temperature: 0.3,
          messages: [
            {
              role: "system",
              content: [
                "You are helping a startup founder define what kind of investor they are looking for.",
                "Based on their profile, suggest realistic defaults.",
                "Respond ONLY with valid JSON — no markdown fences, no explanation.",
                'Schema: { "preferred_check_size_min": string, "preferred_check_size_max": string, "preferred_investor_type": "Capital only"|"Capital + sector expertise"|"Capital + network access", "board_preference": "Hands-on (board seat, regular check-ins)"|"Collaborative (available but not directive)"|"Hands-off (capital only, minimal involvement)", "sector_expertise_wanted": string, "geography_preference": string, "exclusions": string, "what_good_fit_looks_like": string }',
              ].join("\n"),
            },
            {
              role: "user",
              content: `Founder profile:\n${ctx}\n\nPropose realistic investor criteria.`,
            },
          ],
        }),
        signal: AbortSignal.timeout(20000),
      });

      if (!resp.ok) return { ...blank, error: "OpenAI request failed" };

      const aiData: any = await resp.json();
      const raw = aiData.choices?.[0]?.message?.content || "{}";
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
      const proposed = JSON.parse(cleaned);

      return {
        ok: true,
        preferred_check_size_min: proposed.preferred_check_size_min || "",
        preferred_check_size_max: proposed.preferred_check_size_max || "",
        preferred_investor_type: proposed.preferred_investor_type || "",
        board_preference: proposed.board_preference || "",
        sector_expertise_wanted: proposed.sector_expertise_wanted || "",
        geography_preference: proposed.geography_preference || "",
        exclusions: proposed.exclusions || "",
        what_good_fit_looks_like: proposed.what_good_fit_looks_like || "",
      };
    } catch (e: any) {
      return { ...blank, error: e.message ?? "AI proposal failed" };
    }
  });
