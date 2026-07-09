import { createServerFn } from "@tanstack/react-start";

export type OperationalSlot = "operational_bank" | "operational_contract" | "operational_team";

export type OpSlotAiResult = {
  confirmed: boolean;
  confidence: "low" | "medium" | "high";
  explanation: string;
  issues?: string;
};

export type OperationalVerificationData = {
  operational_bank_doc_path: string | null;
  operational_bank_doc_uploaded_at: string | null;
  operational_bank_ai_extracted: OpSlotAiResult | null;
  operational_bank_verified: boolean | null;
  operational_contract_doc_path: string | null;
  operational_contract_doc_uploaded_at: string | null;
  operational_contract_ai_extracted: OpSlotAiResult | null;
  operational_contract_verified: boolean | null;
  operational_team_doc_path: string | null;
  operational_team_doc_uploaded_at: string | null;
  operational_team_ai_extracted: OpSlotAiResult | null;
  operational_team_verified: boolean | null;
  operational_human_review_requested_at: string | null;
};

type CheckOpDocInput = {
  startup_id: string;
  slot: OperationalSlot;
  doc_path: string;
  document_text: string;
  company_name: string;
};

type CheckOpDocResult = {
  ok: boolean;
  verified: boolean;
  ai_result: OpSlotAiResult | null;
  error?: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getAdmin() {
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
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: method === "POST" ? "return=representation" : "return=minimal",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`Supabase ${method} ${path} (${resp.status}): ${text}`);
  return text ? JSON.parse(text) : null;
}

function buildOpPrompt(slot: OperationalSlot, companyName: string): string {
  if (slot === "operational_bank") {
    return [
      `You are verifying a financial activity document for "${companyName}".`,
      `Answer ONLY with valid JSON — no markdown, no explanation outside the JSON.`,
      `Schema: { "confirmed": boolean, "confidence": "low"|"medium"|"high", "explanation": string (max 80 words), "issues": string|null }`,
      `confirmed = true ONLY if ALL of these are present:`,
      `  1. The document references a company name that matches or closely corresponds to "${companyName}".`,
      `  2. The document shows actual financial activity — transactions, debits, credits, or revenue entries — not merely an opening balance or zero-activity statement.`,
      `  3. The document is dated within the last 6 months (relative to 2026) or contains transactions within that period.`,
      `  4. The document is a bank statement, revenue statement, or equivalent financial record — not a projection, invoice, or pitch document.`,
      `If any condition is missing, confirmed = false. Set issues to a specific sentence about what is missing.`,
      `confidence = "high" only if all four are unambiguous. "low" if the document type is unclear or dates are missing.`,
      `Never assume — only confirm what is explicitly stated in the document text.`,
    ].join("\n");
  }

  if (slot === "operational_contract") {
    return [
      `You are verifying a customer or contract evidence document for "${companyName}".`,
      `Answer ONLY with valid JSON — no markdown, no explanation outside the JSON.`,
      `Schema: { "confirmed": boolean, "confidence": "low"|"medium"|"high", "explanation": string (max 80 words), "issues": string|null }`,
      `confirmed = true ONLY if ALL of these are present:`,
      `  1. The document references at least one named external party — a customer, client, or contracting counterparty — that is distinct from "${companyName}" itself.`,
      `  2. The document is not purely internal — it must reference an external organization or individual by name.`,
      `  3. The document is a contract, agreement, purchase order, statement of work, letter of intent, or similar external commitment — not an internal memo, pitch deck, or business plan.`,
      `If any condition is missing, confirmed = false. Set issues to a specific sentence about what is missing.`,
      `confidence = "high" only if the external party is clearly identified and the document is clearly a formal agreement. "low" if the document is vague or names are not present.`,
      `Never assume — only confirm what is explicitly stated in the document text.`,
    ].join("\n");
  }

  // operational_team
  return [
    `You are verifying a team evidence document for "${companyName}".`,
    `Answer ONLY with valid JSON — no markdown, no explanation outside the JSON.`,
    `Schema: { "confirmed": boolean, "confidence": "low"|"medium"|"high", "explanation": string (max 80 words), "issues": string|null }`,
    `confirmed = true ONLY if ALL of these are present:`,
    `  1. The document names at least one individual with a specific role or title at "${companyName}" or a related entity.`,
    `  2. The document is one of: a payroll record, employment contract, offer letter, organizational chart, or board resolution listing named team members.`,
    `  3. The document is not a founder bio, pitch deck team slide, or LinkedIn profile — it must be a formal operational document establishing an employment or role relationship.`,
    `If any condition is missing, confirmed = false. Set issues to a specific sentence about what is missing.`,
    `confidence = "high" only if a named individual with a title is unambiguously present in a formal document. "low" if names are present but the document type is unclear.`,
    `Never assume — only confirm what is explicitly stated in the document text.`,
  ].join("\n");
}

// ── Server fn: check one operational doc slot ─────────────────────────────────

export const checkOperationalDoc = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as CheckOpDocInput)
  .handler(async ({ data }): Promise<CheckOpDocResult> => {
    const { url, key } = getAdmin();
    if (!url || !key) return { ok: false, verified: false, ai_result: null, error: "db_unavailable" };

    const cfEnv = (globalThis as any).__cf_env || {};
    const openaiKey = cfEnv.OPENAI_API_KEY || cfEnv.OPEN_AI_API_KEY || cfEnv["OPEN AI API KEY"] || "";
    const now = new Date().toISOString();

    // Write doc_path + uploaded_at immediately
    const pathPatch: Record<string, unknown> = {
      [`${data.slot}_doc_path`]: data.doc_path,
      [`${data.slot}_doc_uploaded_at`]: now,
      updated_at: now,
    };

    const existing: any[] = await sbFetch(url, key,
      `founder_verifications?startup_id=eq.${data.startup_id}&select=id`,
      "GET"
    ).catch(() => []);

    if (existing?.length) {
      await sbFetch(url, key, `founder_verifications?startup_id=eq.${data.startup_id}`, "PATCH", pathPatch).catch(() => null);
    } else {
      await sbFetch(url, key, "founder_verifications", "POST", {
        startup_id: data.startup_id,
        ...pathPatch,
        tier1_passed: false,
        tier2_passed: false,
        tier3_passed: false,
        current_tier: 0,
      }).catch(() => null);
    }

    if (!openaiKey || !data.document_text || data.document_text.length < 80) {
      return { ok: true, verified: false, ai_result: null, error: "no_key_or_text" };
    }

    const systemPrompt = buildOpPrompt(data.slot, data.company_name || "the company");
    const userMessage = ["DOCUMENT TEXT (first 4000 characters):", data.document_text.slice(0, 4000)].join("\n");

    let ai_result: OpSlotAiResult | null = null;
    try {
      const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 300,
          temperature: 0,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
        }),
        signal: AbortSignal.timeout(25000),
      });
      if (aiResp.ok) {
        const aiData: any = await aiResp.json();
        const raw = aiData.choices?.[0]?.message?.content || "{}";
        const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
        ai_result = JSON.parse(cleaned) as OpSlotAiResult;
      }
    } catch {
      return { ok: true, verified: false, ai_result: null, error: "ai_timeout" };
    }

    if (!ai_result) return { ok: true, verified: false, ai_result: null, error: "ai_parse_failed" };

    const verified = ai_result.confirmed === true && ai_result.confidence !== "low";

    const aiPatch: Record<string, unknown> = {
      [`${data.slot}_ai_extracted`]: ai_result,
      [`${data.slot}_verified`]: verified,
      updated_at: now,
    };

    // Check if all 3 slots now verified → send admin notification
    const updatedRow: any[] = await sbFetch(url, key,
      `founder_verifications?startup_id=eq.${data.startup_id}&select=operational_bank_verified,operational_contract_verified,operational_team_verified`,
      "GET"
    ).catch(() => []);

    const row = updatedRow?.[0] ?? {};
    const allThreeVerified =
      (data.slot === "operational_bank" ? verified : (row.operational_bank_verified ?? false)) &&
      (data.slot === "operational_contract" ? verified : (row.operational_contract_verified ?? false)) &&
      (data.slot === "operational_team" ? verified : (row.operational_team_verified ?? false));

    await sbFetch(url, key, `founder_verifications?startup_id=eq.${data.startup_id}`, "PATCH", aiPatch).catch(() => null);

    // Recompute tier via the single source of truth
    const { recomputeVerificationTier } = await import("@/lib/tier-calc");
    await recomputeVerificationTier(url, key, data.startup_id).catch(() => null);

    if (allThreeVerified) {
      const resendKey = cfEnv.RESEND_API_KEY || "";
      const fromEmail = cfEnv.RESEND_FROM_EMAIL || "hello@hockystick.app";
      if (resendKey) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
          body: JSON.stringify({
            from: `Hockystick <${fromEmail}>`,
            to: ["admin@hockystick.app"],
            subject: `[Hockystick] Tier 3 operational review required — ${data.company_name}`,
            html: `<h2>Operational Verified (Tier 3) — All 3 Documents AI-Verified</h2><p><strong>Startup ID:</strong> ${data.startup_id}</p><p><strong>Company:</strong> ${data.company_name}</p><p>Human review required to set tier3_passed = true.</p>`,
            tags: [{ name: "type", value: "tier3_operational_review" }],
          }),
        }).catch(() => null);
      }
    }

    return { ok: true, verified, ai_result };
  });

// ── Server fn: fetch current operational verification state ───────────────────

type GetOpVerifInput = { startup_id: string };

export const getOperationalVerification = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as GetOpVerifInput)
  .handler(async ({ data }): Promise<{ data: OperationalVerificationData | null }> => {
    const { url, key } = getAdmin();
    if (!url || !key) return { data: null };
    const rows: any[] = await sbFetch(url, key,
      `founder_verifications?startup_id=eq.${data.startup_id}&select=operational_bank_doc_path,operational_bank_doc_uploaded_at,operational_bank_ai_extracted,operational_bank_verified,operational_contract_doc_path,operational_contract_doc_uploaded_at,operational_contract_ai_extracted,operational_contract_verified,operational_team_doc_path,operational_team_doc_uploaded_at,operational_team_ai_extracted,operational_team_verified,operational_human_review_requested_at`,
      "GET"
    ).catch(() => []);
    return { data: rows?.[0] ?? null };
  });

// ── Server fn: mark human review requested ────────────────────────────────────

type MarkOpReviewInput = { startup_id: string };

export const markOperationalReviewRequested = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as MarkOpReviewInput)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const { url, key } = getAdmin();
    if (!url || !key) return { ok: false };
    await sbFetch(url, key,
      `founder_verifications?startup_id=eq.${data.startup_id}`,
      "PATCH",
      { operational_human_review_requested_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ).catch(() => null);
    return { ok: true };
  });
