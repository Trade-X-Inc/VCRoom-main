import { createServerFn } from "@tanstack/react-start";

// ── Types (mirror of claims-fn.ts for investor_claims table) ──────────────

export type ClaimStatus =
  | "unverified"
  | "pending_review"
  | "ai_confirmed"
  | "ai_mismatch";

export interface InvestorClaim {
  id: string;
  investor_id: string;
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

type UpsertInvestorClaimInput = {
  investor_id: string;
  claim_type: string;
  claim_label: string;
  claim_value: string;
};

type AttachInvestorProofInput = {
  investor_id: string;
  claim_type: string;
  proof_document_id: string;
  document_text: string;
  claim_label: string;
  claim_value: string;
};

type AiCheckResult = {
  supports_claim: boolean;
  confidence: "low" | "medium" | "high";
  found_value: string | null;
  explanation: string;
};

type AttachInvestorProofResult = {
  ok: boolean;
  proof_status: ClaimStatus;
  ai_result: AiCheckResult | null;
  error?: string;
};

// ── DB helpers ─────────────────────────────────────────────────────────────

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

// ── 1. Upsert an investor claim ────────────────────────────────────────────

export const upsertInvestorClaim = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as UpsertInvestorClaimInput)
  .handler(async ({ data }): Promise<{ ok: boolean; id: string | null; error?: string }> => {
    const { url, key } = getSupabaseAdmin();
    if (!url || !key) return { ok: false, id: null, error: "db_unavailable" };

    const existing: any[] = await sbFetch(url, key,
      `investor_claims?investor_id=eq.${data.investor_id}&claim_type=eq.${encodeURIComponent(data.claim_type)}&select=id,claim_value,proof_status`,
      "GET"
    ).catch(() => []);

    const row = existing?.[0];

    if (row) {
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
      await sbFetch(url, key, `investor_claims?id=eq.${row.id}`, "PATCH", patch);
      return { ok: true, id: row.id };
    }

    const inserted: any[] = await sbFetch(url, key, "investor_claims", "POST", {
      investor_id: data.investor_id,
      claim_type: data.claim_type,
      claim_label: data.claim_label,
      claim_value: data.claim_value,
      proof_status: "unverified",
    });
    return { ok: true, id: inserted?.[0]?.id ?? null };
  });

// ── 2. Attach proof + AI cross-check ──────────────────────────────────────

export const attachInvestorProofAndCheck = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as AttachInvestorProofInput)
  .handler(async ({ data }): Promise<AttachInvestorProofResult> => {
    const { url, key } = getSupabaseAdmin();
    if (!url || !key) return { ok: false, proof_status: "pending_review", ai_result: null, error: "db_unavailable" };

    const cfEnv = (globalThis as any).__cf_env || {};
    const openaiKey = cfEnv.OPENAI_API_KEY || cfEnv.OPEN_AI_API_KEY || cfEnv["OPEN AI API KEY"] || "";

    // Step 1: mark pending immediately
    await sbFetch(url, key,
      `investor_claims?investor_id=eq.${data.investor_id}&claim_type=eq.${encodeURIComponent(data.claim_type)}`,
      "PATCH",
      { proof_document_id: data.proof_document_id, proof_status: "pending_review", updated_at: new Date().toISOString() }
    ).catch(() => null);

    if (!openaiKey || !data.document_text || data.document_text.length < 50) {
      return { ok: true, proof_status: "pending_review", ai_result: null };
    }

    const systemPrompt = [
      "You are a claim verification analyst reviewing investor fund documents.",
      "Given a specific claim and document text, determine whether the document contains evidence that supports the claim.",
      "Respond ONLY with valid JSON — no markdown, no explanation outside the JSON.",
      'Schema: { "supports_claim": boolean, "confidence": "low"|"medium"|"high", "found_value": string|null, "explanation": string (max 80 words) }',
      "- supports_claim = true only if the document contains specific evidence for this exact claim.",
      "- found_value = the actual value you found in the document (null if not found).",
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
      return { ok: true, proof_status: "pending_review", ai_result: null };
    }

    if (!ai_result) return { ok: true, proof_status: "pending_review", ai_result: null };

    const proof_status: ClaimStatus =
      ai_result.supports_claim && ai_result.confidence !== "low"
        ? "ai_confirmed"
        : "ai_mismatch";

    await sbFetch(url, key,
      `investor_claims?investor_id=eq.${data.investor_id}&claim_type=eq.${encodeURIComponent(data.claim_type)}`,
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
