import { createServerFn } from "@tanstack/react-start";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ClaimStatus =
  | "unverified"      // claim exists, no proof attached
  | "pending_review"  // proof document attached, not yet AI-checked
  | "ai_confirmed"    // AI says document supports the claim
  | "ai_mismatch";    // AI says document does NOT support the claim — worse than unverified

export type ClaimCategory = "financial" | "legal" | "operational" | "team";
export type ClaimVerdict = "verified" | "insufficient" | "contradicted";

export interface StartupClaim {
  id: string;
  startup_id: string;
  claim_type: string;
  claim_label: string;
  claim_value: string;
  claim_category: ClaimCategory | null;
  proof_document_id: string | null;
  proof_status: ClaimStatus;
  ai_verdict: ClaimVerdict | null;
  ai_reasoning: string | null;
  ai_confidence: "high" | "medium" | "low" | null;
  human_reviewed: boolean;
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
// 2b. Tier 2 claim verdict — the strict category-aware check.
// The founder states a claim, picks its category, and uploads one document
// specifically for that claim. GPT-4o returns verified / insufficient /
// contradicted with reasoning. Conservative by instruction: doubt = insufficient.
// ─────────────────────────────────────────────────────────────────────────────

type AddManualClaimInput = {
  startup_id: string;
  claim_text: string;
  claim_category: ClaimCategory;
};

export const addManualClaim = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as AddManualClaimInput)
  .handler(async ({ data }): Promise<{ ok: boolean; id: string | null; error?: string }> => {
    const { url, key } = getSupabaseAdmin();
    if (!url || !key) return { ok: false, id: null, error: "db_unavailable" };
    const text = (data.claim_text ?? "").trim();
    if (text.length < 8) return { ok: false, id: null, error: "Claim is too short — state a specific, checkable fact." };
    if (!["financial", "legal", "operational", "team"].includes(data.claim_category)) {
      return { ok: false, id: null, error: "invalid_category" };
    }
    const inserted: any[] = await sbFetch(url, key, "startup_claims", "POST", {
      startup_id: data.startup_id,
      claim_type: `custom_${crypto.randomUUID().slice(0, 8)}`,
      claim_label: "Claim",
      claim_value: text,
      claim_category: data.claim_category,
      proof_status: "unverified",
    }).catch(() => null);
    return inserted?.[0]?.id
      ? { ok: true, id: inserted[0].id }
      : { ok: false, id: null, error: "insert_failed" };
  });

export const deleteClaim = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as { startup_id: string; claim_id: string })
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const { url, key } = getSupabaseAdmin();
    if (!url || !key) return { ok: false };
    await sbFetch(url, key,
      `startup_claims?id=eq.${data.claim_id}&startup_id=eq.${data.startup_id}`,
      "DELETE"
    ).catch(() => null);
    return { ok: true };
  });

type VerifyClaimInput = {
  startup_id: string;
  claim_id: string;
  claim_text: string;
  claim_category: ClaimCategory;
  /** Plain text extracted client-side from the evidence document */
  document_text: string;
  document_name: string;
  user_id: string;
};

type VerifyClaimResult = {
  ok: boolean;
  verdict: ClaimVerdict | null;
  reasoning: string | null;
  confidence: "high" | "medium" | "low" | null;
  error?: string;
};

export const verifyClaim = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as VerifyClaimInput)
  .handler(async ({ data }): Promise<VerifyClaimResult> => {
    const { url, key } = getSupabaseAdmin();
    if (!url || !key) return { ok: false, verdict: null, reasoning: null, confidence: null, error: "db_unavailable" };

    const cfEnv = (globalThis as any).__cf_env || {};
    const openaiKey = cfEnv.OPENAI_API_KEY || cfEnv.OPEN_AI_API_KEY || cfEnv["OPEN AI API KEY"] || "";
    if (!openaiKey) return { ok: false, verdict: null, reasoning: null, confidence: null, error: "AI unavailable" };
    if (!data.document_text || data.document_text.length < 50) {
      return { ok: false, verdict: null, reasoning: null, confidence: null, error: "Could not read enough text from that document — try a text-based PDF or spreadsheet export." };
    }

    // Rate limit — same rpc as the rest of the AI stack
    const allowed = await sbFetch(url, key, "rpc/check_ai_rate_limit", "POST", {
      p_user_id: data.user_id,
      p_feature: "verification",
    }).catch(() => true);
    if (allowed === false) {
      return { ok: false, verdict: null, reasoning: null, confidence: null, error: "Daily verification limit reached — try again tomorrow." };
    }

    const systemPrompt = [
      "You are verifying a specific claim for a startup's Hockystick profile.",
      `The claim is: "${data.claim_text}". Category: ${data.claim_category}.`,
      "Read the attached document carefully.",
      "Return JSON only:",
      '{ "verdict": "verified" | "insufficient" | "contradicted", "reasoning": "[one sentence explaining why, specific to the document]", "confidence": "high" | "medium" | "low" }',
      "Rules:",
      "- 'verified': document contains specific evidence supporting this exact claim",
      "- 'insufficient': document is real but does not contain evidence for this specific claim",
      "- 'contradicted': document contains evidence that contradicts the claim",
      "Never verify a financial claim from a pitch deck.",
      "Never verify a legal claim from a financial document.",
      "Be conservative: when in doubt, return 'insufficient'.",
    ].join("\n");

    const userMessage = [
      `DOCUMENT NAME: ${data.document_name}`,
      "DOCUMENT TEXT (first 6000 characters):",
      data.document_text.slice(0, 6000),
    ].join("\n");

    let parsed: { verdict?: string; reasoning?: string; confidence?: string } | null = null;
    try {
      const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: "gpt-4o",
          max_tokens: 300,
          temperature: 0,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (aiResp.ok) {
        const aiData: any = await aiResp.json();
        const raw = aiData.choices?.[0]?.message?.content || "{}";
        const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
        parsed = JSON.parse(cleaned);
      }
    } catch {
      return { ok: false, verdict: null, reasoning: null, confidence: null, error: "AI check timed out — try again." };
    }

    const verdict = (["verified", "insufficient", "contradicted"].includes(parsed?.verdict ?? "")
      ? parsed!.verdict
      : null) as ClaimVerdict | null;
    if (!verdict) {
      return { ok: false, verdict: null, reasoning: null, confidence: null, error: "AI returned an unusable response — try again." };
    }
    const reasoning = (parsed?.reasoning ?? "").slice(0, 500) || null;
    const confidence = (["high", "medium", "low"].includes(parsed?.confidence ?? "")
      ? parsed!.confidence
      : "low") as "high" | "medium" | "low";

    const now = new Date().toISOString();
    await sbFetch(url, key,
      `startup_claims?id=eq.${data.claim_id}&startup_id=eq.${data.startup_id}`,
      "PATCH",
      {
        claim_category: data.claim_category,
        ai_verdict: verdict,
        ai_reasoning: reasoning,
        ai_confidence: confidence,
        ai_checked_at: now,
        proof_document_id: crypto.randomUUID(),
        // Legacy status kept in sync so FieldVerificationBadge renders correctly:
        proof_status: verdict === "verified" ? "ai_confirmed" : "ai_mismatch",
        updated_at: now,
      }
    ).catch(() => null);

    await sbFetch(url, key, "rpc/check_and_increment_ai_usage", "POST", {
      p_user_id: data.user_id,
      p_feature: "verification",
    }).catch(() => null);

    return { ok: true, verdict, reasoning, confidence };
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
