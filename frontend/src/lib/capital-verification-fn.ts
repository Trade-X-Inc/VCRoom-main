import { createServerFn } from "@tanstack/react-start";

export type CapitalSlot = "fund_formation" | "capital_commitment" | "aum_confirmation";

export type SlotAiResult = {
  confirmed: boolean;
  confidence: "low" | "medium" | "high";
  explanation: string;
  issues?: string;
};

export type CapitalVerificationData = {
  fund_formation_doc_path: string | null;
  fund_formation_doc_uploaded_at: string | null;
  fund_formation_ai_extracted: SlotAiResult | null;
  fund_formation_verified: boolean | null;
  capital_commitment_doc_path: string | null;
  capital_commitment_doc_uploaded_at: string | null;
  capital_commitment_ai_extracted: SlotAiResult | null;
  capital_commitment_verified: boolean | null;
  aum_confirmation_doc_path: string | null;
  aum_confirmation_doc_uploaded_at: string | null;
  aum_confirmation_ai_extracted: SlotAiResult | null;
  aum_confirmation_verified: boolean | null;
  tier3_passed: boolean | null;
  capital_tier_human_review_requested_at: string | null;
};

type CheckCapitalDocInput = {
  investor_id: string;
  slot: CapitalSlot;
  doc_path: string;
  document_text: string;
  fund_name: string;
};

type CheckCapitalDocResult = {
  ok: boolean;
  verified: boolean;
  ai_result: SlotAiResult | null;
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

function buildPrompt(slot: CapitalSlot, fundName: string): string {
  if (slot === "fund_formation") {
    return [
      `You are verifying a fund formation document for "${fundName}".`,
      `Answer ONLY with valid JSON — no markdown, no explanation outside the JSON.`,
      `Schema: { "confirmed": boolean, "confidence": "low"|"medium"|"high", "explanation": string (max 80 words), "issues": string|null }`,
      `confirmed = true ONLY if ALL of these are present in the document:`,
      `  1. The document establishes or references a fund named "${fundName}" (or a clear variant).`,
      `  2. The document is a fund formation instrument: Limited Partnership Agreement, Articles of Association, Operating Agreement, or equivalent legal founding document.`,
      `  3. A signing party with apparent authority (General Partner, Director, Managing Member, or equivalent) is identified by name or title.`,
      `If any condition is missing, confirmed = false. Set issues to a specific sentence describing what is missing.`,
      `confidence = "high" only if all three are unambiguous. "medium" if one is implied but not explicit. "low" if the document is unclear.`,
      `Never assume — only confirm what is explicitly stated in the document text.`,
    ].join("\n");
  }
  if (slot === "capital_commitment") {
    return [
      `You are verifying a capital commitment document for "${fundName}".`,
      `Answer ONLY with valid JSON — no markdown, no explanation outside the JSON.`,
      `Schema: { "confirmed": boolean, "confidence": "low"|"medium"|"high", "explanation": string (max 80 words), "issues": string|null }`,
      `confirmed = true ONLY if ALL of these are present in the document:`,
      `  1. A specific capital commitment amount (a dollar or currency figure) is stated.`,
      `  2. The entity name in the document matches or closely corresponds to "${fundName}".`,
      `  3. A named signatory is present (person's name, title, or signature block).`,
      `  4. The document appears to be a capital commitment letter, subscription agreement, or board resolution — it must be on organizational letterhead or clearly formatted as a formal commitment document.`,
      `If any condition is missing, confirmed = false. Set issues to a specific sentence describing what is missing.`,
      `confidence = "high" only if all four are unambiguous. "low" if the document is a generic financial statement or the commitment is not explicit.`,
      `Never assume — only confirm what is explicitly stated in the document text.`,
    ].join("\n");
  }
  // aum_confirmation
  return [
    `You are verifying an AUM (Assets Under Management) or fund balance confirmation document.`,
    `Answer ONLY with valid JSON — no markdown, no explanation outside the JSON.`,
    `Schema: { "confirmed": boolean, "confidence": "low"|"medium"|"high", "explanation": string (max 80 words), "issues": string|null }`,
    `confirmed = true ONLY if ALL of these are present in the document:`,
    `  1. A specific financial balance or AUM figure is stated (a dollar or currency amount).`,
    `  2. The document is one of: bank statement, audited financial statement, custodian letter, or fund administrator letter — not an invoice, pitch deck, or internally-generated summary.`,
    `  3. A date is present on the document AND that date appears to be within the last 12 months (relative to the current year 2026).`,
    `If any condition is missing, confirmed = false. Set issues to a specific sentence describing what is missing or why the date is out of range.`,
    `confidence = "high" only if all three are unambiguous. "low" if the document type is unclear or the date is missing.`,
    `Never assume — only confirm what is explicitly stated in the document text.`,
  ].join("\n");
}

// ── Server fn: check one capital document slot ────────────────────────────────

export const checkCapitalDoc = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as CheckCapitalDocInput)
  .handler(async ({ data }): Promise<CheckCapitalDocResult> => {
    const { url, key } = getAdmin();
    if (!url || !key) return { ok: false, verified: false, ai_result: null, error: "db_unavailable" };

    const cfEnv = (globalThis as any).__cf_env || {};
    const openaiKey = cfEnv.OPENAI_API_KEY || cfEnv.OPEN_AI_API_KEY || cfEnv["OPEN AI API KEY"] || "";

    const now = new Date().toISOString();

    // Write doc_path + uploaded_at immediately so the path is always stored
    const pathPatch: Record<string, unknown> = {
      [`${data.slot}_doc_path`]: data.doc_path,
      [`${data.slot}_doc_uploaded_at`]: now,
      updated_at: now,
    };

    // Upsert the investor_verifications row (may not exist yet)
    const existing: any[] = await sbFetch(url, key,
      `investor_verifications?investor_id=eq.${data.investor_id}&select=id`,
      "GET"
    ).catch(() => []);

    if (existing?.length) {
      await sbFetch(url, key, `investor_verifications?investor_id=eq.${data.investor_id}`, "PATCH", pathPatch)
        .catch(() => null);
    } else {
      await sbFetch(url, key, "investor_verifications", "POST", {
        id: globalThis.crypto.randomUUID(),
        investor_id: data.investor_id,
        ...pathPatch,
        verification_tier: "none",
        current_tier: 0,
      }).catch(() => null);
    }

    if (!openaiKey || !data.document_text || data.document_text.length < 80) {
      return { ok: true, verified: false, ai_result: null, error: "no_key_or_text" };
    }

    const systemPrompt = buildPrompt(data.slot, data.fund_name || "the fund");
    const userMessage = [
      "DOCUMENT TEXT (first 4000 characters):",
      data.document_text.slice(0, 4000),
    ].join("\n");

    let ai_result: SlotAiResult | null = null;
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
        const cleaned = raw
          .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
        ai_result = JSON.parse(cleaned) as SlotAiResult;
      }
    } catch {
      return { ok: true, verified: false, ai_result: null, error: "ai_timeout" };
    }

    if (!ai_result) return { ok: true, verified: false, ai_result: null, error: "ai_parse_failed" };

    const verified = ai_result.confirmed === true && ai_result.confidence !== "low";

    // Write ai_extracted + verified flag
    const aiPatch: Record<string, unknown> = {
      [`${data.slot}_ai_extracted`]: ai_result,
      [`${data.slot}_verified`]: verified,
      updated_at: now,
    };

    // Check if all 3 slots now verified → send admin notification
    const updatedRow: any[] = await sbFetch(url, key,
      `investor_verifications?investor_id=eq.${data.investor_id}&select=fund_formation_verified,capital_commitment_verified,aum_confirmation_verified`,
      "GET"
    ).catch(() => []);

    const row = updatedRow?.[0] ?? {};
    const slotResults = {
      fund_formation_verified: data.slot === "fund_formation" ? verified : (row.fund_formation_verified ?? false),
      capital_commitment_verified: data.slot === "capital_commitment" ? verified : (row.capital_commitment_verified ?? false),
      aum_confirmation_verified: data.slot === "aum_confirmation" ? verified : (row.aum_confirmation_verified ?? false),
    };
    const allThreeVerified =
      slotResults.fund_formation_verified &&
      slotResults.capital_commitment_verified &&
      slotResults.aum_confirmation_verified;

    await sbFetch(url, key, `investor_verifications?investor_id=eq.${data.investor_id}`, "PATCH", aiPatch)
      .catch(() => null);

    if (allThreeVerified) {
      // Send admin notification (same pattern as requestHumanReview)
      const resendKey = cfEnv.RESEND_API_KEY || "";
      const fromEmail = cfEnv.RESEND_FROM_EMAIL || "hello@hockystick.app";
      if (resendKey) {
        const html = `
          <h2>Capital Verification (Tier 3) — All 3 Documents AI-Verified</h2>
          <p><strong>Investor user ID:</strong> ${data.investor_id}</p>
          <p><strong>Fund:</strong> ${data.fund_name}</p>
          <p>All three capital evidence slots passed AI check. Human review required to set tier3_passed = true.</p>
          <hr/>
          <p>Review in the <a href="https://hockystick.app/app/users">admin panel</a>.</p>
        `;
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
          body: JSON.stringify({
            from: `Hockystick <${fromEmail}>`,
            to: ["admin@hockystick.app"],
            subject: `[Hockystick] Tier 3 capital review required — ${data.fund_name}`,
            html,
            tags: [{ name: "type", value: "tier3_capital_review" }],
          }),
        }).catch(() => null);
      }
    }

    return { ok: true, verified, ai_result };
  });

// ── Server fn: fetch current capital verification state ───────────────────────

type GetCapitalVerifInput = { investor_id: string };

export const getCapitalVerification = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as GetCapitalVerifInput)
  .handler(async ({ data }): Promise<{ data: CapitalVerificationData | null }> => {
    const { url, key } = getAdmin();
    if (!url || !key) return { data: null };
    const rows: any[] = await sbFetch(url, key,
      `investor_verifications?investor_id=eq.${data.investor_id}&select=fund_formation_doc_path,fund_formation_doc_uploaded_at,fund_formation_ai_extracted,fund_formation_verified,capital_commitment_doc_path,capital_commitment_doc_uploaded_at,capital_commitment_ai_extracted,capital_commitment_verified,aum_confirmation_doc_path,aum_confirmation_doc_uploaded_at,aum_confirmation_ai_extracted,aum_confirmation_verified,tier3_passed,capital_tier_human_review_requested_at`,
      "GET"
    ).catch(() => []);
    return { data: rows?.[0] ?? null };
  });

// ── Server fn: mark human review requested ────────────────────────────────────

type MarkReviewInput = { investor_id: string };

export const markCapitalReviewRequested = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as MarkReviewInput)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const { url, key } = getAdmin();
    if (!url || !key) return { ok: false };
    await sbFetch(url, key,
      `investor_verifications?investor_id=eq.${data.investor_id}`,
      "PATCH",
      { capital_tier_human_review_requested_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ).catch(() => null);
    return { ok: true };
  });
