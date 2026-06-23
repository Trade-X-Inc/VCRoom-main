import { createServerFn } from "@tanstack/react-start";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ClaimStatus =
  | "unverified"      // claim exists, no proof attached
  | "pending_review"  // proof document attached, not yet AI-checked
  | "ai_confirmed"    // AI says document supports the claim
  | "ai_mismatch";    // AI says document does NOT support the claim — worse than unverified

export interface StartupClaim {
  id: string;
  startup_id: string;
  claim_type: string;
  claim_label: string;
  claim_value: string;
  proof_document_id: string | null;
  proof_status: ClaimStatus;
  ai_check_result: {
    supports_claim: boolean;
    confidence: "low" | "medium" | "high";
    found_value: string | null;
    explanation: string;
  } | null;
  ai_checked_at: string | null;
  created_at: string;
  updated_at: string;
}

type UpsertClaimInput = {
  startup_id: string;
  claim_type: string;
  claim_label: string;
  claim_value: string;
};

type AttachProofInput = {
  startup_id: string;
  claim_type: string;
  proof_document_id: string;
  /** Plain text extracted client-side from the proof document */
  document_text: string;
  /** The claim label + value string shown to the AI */
  claim_label: string;
  claim_value: string;
  user_id: string;
};

type AiCheckResult = {
  supports_claim: boolean;
  confidence: "low" | "medium" | "high";
  found_value: string | null;
  explanation: string;
};

type AttachProofResult = {
  ok: boolean;
  proof_status: ClaimStatus;
  ai_result: AiCheckResult | null;
  error?: string;
};

type CheckSocialInput = {
  startup_id: string;
  cap_table_row_id: string;
  linkedin_url: string | null;
  x_url: string | null;
  instagram_url: string | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// DB helpers (service-role fetch, same pattern as verification-fn.ts)
// ─────────────────────────────────────────────────────────────────────────────

function getSupabaseAdmin() {
  const cfEnv = (globalThis as any).__cf_env || {};
  const url = cfEnv.SUPABASE_URL || cfEnv.VITE_SUPABASE_URL || (import.meta.env as any).VITE_SUPABASE_URL || "";
  const key = cfEnv.SUPABASE_SERVICE_ROLE_KEY || "";
  return { url, key };
}

async function sbFetch(url: string, key: string, path: string, method: string, body?: unknown) {
  const resp = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "apikey": key,
      "Authorization": `Bearer ${key}`,
      "Prefer": method === "POST" ? "return=representation" : "return=minimal",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`Supabase ${method} ${path} (${resp.status}): ${text}`);
  return text ? JSON.parse(text) : null;
}

async function urlResolves(rawUrl: string | null): Promise<boolean> {
  if (!rawUrl) return false;
  const url = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
  try {
    const r = await fetch(url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(6000) });
    return r.status < 400;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Upsert a claim row (called on save when a quantitative field has a value)
// Creates or updates a claim; resets to 'unverified' if value changed.
// ─────────────────────────────────────────────────────────────────────────────

export const upsertClaim = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as UpsertClaimInput)
  .handler(async ({ data }): Promise<{ ok: boolean; id: string | null; error?: string }> => {
    const { url, key } = getSupabaseAdmin();
    if (!url || !key) return { ok: false, id: null, error: "db_unavailable" };

    // Check if a row exists for this startup + claim_type
    const existing: any[] = await sbFetch(url, key,
      `startup_claims?startup_id=eq.${data.startup_id}&claim_type=eq.${encodeURIComponent(data.claim_type)}&select=id,claim_value,proof_status`,
      "GET"
    ).catch(() => []);

    const row = existing?.[0];

    if (row) {
      // Only reset to unverified if the value has changed
      const valueChanged = row.claim_value !== data.claim_value;
      const patch: Record<string, unknown> = {
        claim_label: data.claim_label,
        claim_value: data.claim_value,
        updated_at: new Date().toISOString(),
      };
      if (valueChanged) {
        patch.proof_status = "unverified";
        patch.proof_document_id = null;
        patch.ai_check_result = null;
        patch.ai_checked_at = null;
      }
      await sbFetch(url, key,
        `startup_claims?id=eq.${row.id}`,
        "PATCH", patch
      );
      return { ok: true, id: row.id };
    }

    // Insert new claim
    const inserted: any[] = await sbFetch(url, key, "startup_claims", "POST", {
      startup_id: data.startup_id,
      claim_type: data.claim_type,
      claim_label: data.claim_label,
      claim_value: data.claim_value,
      proof_status: "unverified",
    });
    return { ok: true, id: inserted?.[0]?.id ?? null };
  });

// ─────────────────────────────────────────────────────────────────────────────
// 2. Attach proof document + run AI cross-check
// Client extracts document text first, sends text (not bytes) to server.
// ─────────────────────────────────────────────────────────────────────────────

export const attachProofAndCheck = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as AttachProofInput)
  .handler(async ({ data }): Promise<AttachProofResult> => {
    const { url, key } = getSupabaseAdmin();
    if (!url || !key) return { ok: false, proof_status: "pending_review", ai_result: null, error: "db_unavailable" };

    const cfEnv = (globalThis as any).__cf_env || {};
    const openaiKey = cfEnv.OPENAI_API_KEY || cfEnv.OPEN_AI_API_KEY || cfEnv["OPEN AI API KEY"] || "";

    // Step 1: Mark as pending_review immediately (proof is attached)
    await sbFetch(url, key,
      `startup_claims?startup_id=eq.${data.startup_id}&claim_type=eq.${encodeURIComponent(data.claim_type)}`,
      "PATCH",
      { proof_document_id: data.proof_document_id, proof_status: "pending_review", updated_at: new Date().toISOString() }
    ).catch(() => null);

    // Step 2: AI cross-check if we have text and a key
    if (!openaiKey || !data.document_text || data.document_text.length < 50) {
      return { ok: true, proof_status: "pending_review", ai_result: null };
    }

    const systemPrompt = [
      "You are a claim verification analyst reviewing startup due diligence documents.",
      "Given a specific claim and document text, determine whether the document contains evidence that supports the claim.",
      "Respond ONLY with valid JSON — no markdown, no explanation outside the JSON.",
      'Schema: { "supports_claim": boolean, "confidence": "low"|"medium"|"high", "found_value": string|null, "explanation": string (max 80 words) }',
      "Rules:",
      "- supports_claim = true only if the document contains specific evidence for this exact claim.",
      "- found_value = the actual value you found in the document (null if not found).",
      "- If the document mentions different numbers than the claim, supports_claim = false.",
      "- confidence = 'low' if the document is ambiguous or too vague to confirm or deny.",
      "- Never assume or infer — only confirm what is explicitly stated.",
    ].join("\n");

    const userMessage = [
      `CLAIM TO VERIFY: "${data.claim_label}: ${data.claim_value}"`,
      "",
      `DOCUMENT TEXT (first 3000 chars):`,
      data.document_text.slice(0, 3000),
    ].join("\n");

    let ai_result: AiCheckResult | null = null;
    try {
      const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 250,
          temperature: 0,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
        }),
        signal: AbortSignal.timeout(20000),
      });

      if (aiResp.ok) {
        const aiData: any = await aiResp.json();
        const raw = aiData.choices?.[0]?.message?.content || "{}";
        const cleaned = raw
          .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
        ai_result = JSON.parse(cleaned) as AiCheckResult;
      }
    } catch {
      // AI check failed — leave as pending_review rather than crash
      return { ok: true, proof_status: "pending_review", ai_result: null };
    }

    if (!ai_result) return { ok: true, proof_status: "pending_review", ai_result: null };

    // Step 3: Determine final status
    // ai_mismatch is WORSE than unverified — surface it strongly
    const proof_status: ClaimStatus =
      ai_result.supports_claim && ai_result.confidence !== "low"
        ? "ai_confirmed"
        : "ai_mismatch";

    // Step 4: Persist AI result
    await sbFetch(url, key,
      `startup_claims?startup_id=eq.${data.startup_id}&claim_type=eq.${encodeURIComponent(data.claim_type)}`,
      "PATCH",
      {
        proof_status,
        ai_check_result: ai_result,
        ai_checked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    ).catch(() => null);

    return { ok: true, proof_status, ai_result };
  });

// ─────────────────────────────────────────────────────────────────────────────
// 3. Social URL verification for cap table rows
// HEAD-request each provided URL (same pattern as Tier 1 linkedin check).
// ─────────────────────────────────────────────────────────────────────────────

export const verifySocialUrls = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as CheckSocialInput)
  .handler(async ({ data }): Promise<{ ok: boolean; social_verified: boolean }> => {
    const { url, key } = getSupabaseAdmin();
    if (!url || !key) return { ok: false, social_verified: false };

    // At least one URL must be provided and resolve
    const provided = [data.linkedin_url, data.x_url, data.instagram_url].filter(Boolean);
    if (provided.length === 0) {
      await sbFetch(url, key,
        `startup_cap_table?id=eq.${data.cap_table_row_id}`,
        "PATCH", { social_verified: false, updated_at: new Date().toISOString() }
      ).catch(() => null);
      return { ok: true, social_verified: false };
    }

    // Check all provided URLs in parallel — pass if at least one resolves
    const results = await Promise.all(provided.map((u) => urlResolves(u)));
    const social_verified = results.some(Boolean);

    await sbFetch(url, key,
      `startup_cap_table?id=eq.${data.cap_table_row_id}`,
      "PATCH", { social_verified, updated_at: new Date().toISOString() }
    ).catch(() => null);

    return { ok: true, social_verified };
  });
