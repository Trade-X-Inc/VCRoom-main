import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

function getAdminClient(url?: string, key?: string) {
  const cfEnv = (globalThis as any).__cf_env || {};
  const resolvedUrl = url || cfEnv.SUPABASE_URL || cfEnv.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const resolvedKey = key || cfEnv.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!resolvedUrl || !resolvedKey)
    throw new Error(`Missing Supabase config URL:${!!resolvedUrl} KEY:${!!resolvedKey}`);
  return createClient(resolvedUrl, resolvedKey, { auth: { persistSession: false } });
}

// ─── getDDData ────────────────────────────────────────────────────────────────
export const getDDData = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown): {
      dealRoomId: string; userId: string; userAccessToken: string;
      supabaseUrl?: string; supabaseKey?: string;
    } => data as any,
  )
  .handler(async ({ data }) => {
    const sb = getAdminClient(data.supabaseUrl, data.supabaseKey);

    // Verify user is a member
    const { data: member } = await sb
      .from("deal_room_members")
      .select("user_id")
      .eq("deal_room_id", data.dealRoomId)
      .eq("user_id", data.userId)
      .maybeSingle();
    if (!member) return { categories: [], items: [], error: "Unauthorized" };

    // Seed if first time
    const { data: existing } = await sb
      .from("dd_categories")
      .select("id")
      .eq("deal_room_id", data.dealRoomId)
      .limit(1);

    if (!existing || existing.length === 0) {
      await sb.rpc("seed_dd_for_deal_room", { p_deal_room_id: data.dealRoomId });
    }

    const [{ data: categories }, { data: items }] = await Promise.all([
      sb
        .from("dd_categories")
        .select("id, category, status, investor_notes, updated_at")
        .eq("deal_room_id", data.dealRoomId)
        .order("category"),
      sb
        .from("dd_checklist_items")
        .select("id, category, label, checked")
        .eq("deal_room_id", data.dealRoomId)
        .order("created_at"),
    ]);

    return { categories: categories ?? [], items: items ?? [] };
  });

// ─── updateDDStatus ───────────────────────────────────────────────────────────
export const updateDDStatus = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown): {
      dealRoomId: string; userId: string; category: string; status: string;
      userAccessToken: string; supabaseUrl?: string; supabaseKey?: string;
    } => data as any,
  )
  .handler(async ({ data }) => {
    const sb = getAdminClient(data.supabaseUrl, data.supabaseKey);
    const { data: member } = await sb
      .from("deal_room_members")
      .select("user_id")
      .eq("deal_room_id", data.dealRoomId)
      .eq("user_id", data.userId)
      .maybeSingle();
    if (!member) return { success: false, error: "Unauthorized" };

    const { error } = await sb
      .from("dd_categories")
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .eq("deal_room_id", data.dealRoomId)
      .eq("category", data.category);
    if (error) return { success: false, error: error.message };
    return { success: true };
  });

// ─── updateDDNotes ────────────────────────────────────────────────────────────
export const updateDDNotes = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown): {
      dealRoomId: string; userId: string; category: string; notes: string;
      userAccessToken: string; supabaseUrl?: string; supabaseKey?: string;
    } => data as any,
  )
  .handler(async ({ data }) => {
    const sb = getAdminClient(data.supabaseUrl, data.supabaseKey);
    const { data: member } = await sb
      .from("deal_room_members")
      .select("user_id")
      .eq("deal_room_id", data.dealRoomId)
      .eq("user_id", data.userId)
      .maybeSingle();
    if (!member) return { success: false, error: "Unauthorized" };

    const { error } = await sb
      .from("dd_categories")
      .update({ investor_notes: data.notes, updated_at: new Date().toISOString() })
      .eq("deal_room_id", data.dealRoomId)
      .eq("category", data.category);
    if (error) return { success: false, error: error.message };
    return { success: true };
  });

// ─── toggleChecklistItem ──────────────────────────────────────────────────────
export const toggleChecklistItem = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown): {
      itemId: string; userId: string; dealRoomId: string; checked: boolean;
      userAccessToken: string; supabaseUrl?: string; supabaseKey?: string;
    } => data as any,
  )
  .handler(async ({ data }) => {
    const sb = getAdminClient(data.supabaseUrl, data.supabaseKey);
    const { data: member } = await sb
      .from("deal_room_members")
      .select("user_id")
      .eq("deal_room_id", data.dealRoomId)
      .eq("user_id", data.userId)
      .maybeSingle();
    if (!member) return { success: false, error: "Unauthorized" };

    const { error } = await sb
      .from("dd_checklist_items")
      .update({ checked: data.checked })
      .eq("id", data.itemId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  });

// ─── overrideAutoDetectedItem ─────────────────────────────────────────────────
// Called when investor clicks an auto-detected checkbox — sets manually_overridden=true
export const overrideAutoDetectedItem = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown): {
      itemId: string; userId: string; dealRoomId: string; checked: boolean;
      supabaseUrl?: string; supabaseKey?: string;
    } => data as any,
  )
  .handler(async ({ data }) => {
    const sb = getAdminClient(data.supabaseUrl, data.supabaseKey);
    const { data: member } = await sb
      .from("deal_room_members")
      .select("user_id")
      .eq("deal_room_id", data.dealRoomId)
      .eq("user_id", data.userId)
      .maybeSingle();
    if (!member) return { success: false, error: "Unauthorized" };

    const { error } = await sb
      .from("dd_checklist_items")
      .update({ checked: data.checked, manually_overridden: true })
      .eq("id", data.itemId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  });

// ─── runAutoDetection ─────────────────────────────────────────────────────────
// Runs auto-detection for a deal room's checklist items from real data sources.
// Only updates items not already manually_overridden.
//
// CORE PRINCIPLE: one document never satisfies multiple unrelated items.
// Each item is checked independently. Document-based detection uses AI to confirm
// the document actually contains the specific element claimed — never inferred
// from filename, category label, or broad category matching.
//
// Structured sources (no AI needed — binary data):
//   1. startup_cap_table rows > 0  → "Cap table"
//   2. startup_claims with proof_status='ai_confirmed' and revenue types → "Revenue projections (3yr)"
//   3. startups.founder_linkedin non-null AND founder_verifications.linkedin_valid=true → "Founder CVs / LinkedIn"
//   4. founder_verifications.license_doc_path non-null → "Certificate of incorporation"
//
// Document-based (AI per-item verification):
//   For each checklist item not already satisfied by structured data, fetch the text
//   content of all uploaded documents, then ask AI for each item individually:
//   "Does this document content contain [specific element]?" Answer must be confident Yes
//   to qualify. A pitch deck does not satisfy a financial statement item, etc.
export const runAutoDetection = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown): {
      dealRoomId: string; userId: string; supabaseUrl?: string; supabaseKey?: string;
    } => data as any,
  )
  .handler(async ({ data }) => {
    const sb = getAdminClient(data.supabaseUrl, data.supabaseKey);

    // Auth check
    const { data: member } = await sb
      .from("deal_room_members")
      .select("user_id")
      .eq("deal_room_id", data.dealRoomId)
      .eq("user_id", data.userId)
      .maybeSingle();
    if (!member) return { detected: [], error: "Unauthorized" };

    // Get deal room → startup_id
    const { data: room } = await sb
      .from("deal_rooms")
      .select("startup_id")
      .eq("id", data.dealRoomId)
      .maybeSingle();
    if (!room?.startup_id) return { detected: [], error: "Deal room not found" };
    const startupId = room.startup_id;

    // Get all checklist items for this room (skip manually_overridden)
    const { data: items } = await sb
      .from("dd_checklist_items")
      .select("id, category, label, manually_overridden")
      .eq("deal_room_id", data.dealRoomId);
    if (!items?.length) return { detected: [] };

    // ── Structured data sources (binary checks, no AI) ──────────────────────
    const [capTableRes, claimsRes, startupRes, verifRes, docsRes] = await Promise.all([
      sb.from("startup_cap_table").select("id").eq("startup_id", startupId).limit(1),
      sb.from("startup_claims").select("claim_type, proof_status").eq("startup_id", startupId)
        .eq("proof_status", "ai_confirmed")
        .in("claim_type", ["revenue", "growth_rate", "projection"]),
      sb.from("startups").select("founder_linkedin").eq("id", startupId).maybeSingle(),
      sb.from("founder_verifications").select("linkedin_valid, license_doc_path")
        .eq("startup_id", startupId).maybeSingle(),
      sb.from("documents").select("id, file_name, category, storage_path, ai_summary")
        .eq("deal_room_id", data.dealRoomId),
    ]);

    const hasCapTable = (capTableRes.data?.length ?? 0) > 0;
    const hasVerifiedRevenueClaim = (claimsRes.data?.length ?? 0) > 0;
    const linkedinUrl = startupRes.data?.founder_linkedin;
    const linkedinValid = verifRes.data?.linkedin_valid === true;
    const licenseDoc = verifRes.data?.license_doc_path;
    const docs = docsRes.data ?? [];

    // Map each item label to its structured detection (if any)
    type Detection = { source: string; label: string };
    const structuredByLabel: Record<string, Detection> = {};
    if (hasCapTable) {
      structuredByLabel["cap table"] = { source: "startup_cap_table", label: "Real shareholder data on file" };
    }
    if (hasVerifiedRevenueClaim) {
      structuredByLabel["revenue projections"] = { source: "startup_claims", label: "Claim verified with attached proof" };
    }
    if (linkedinUrl && linkedinValid) {
      structuredByLabel["founder cvs"] = { source: "founder_verifications", label: "LinkedIn verified" };
    }
    if (licenseDoc) {
      structuredByLabel["certificate of incorporation"] = { source: "founder_verifications", label: "Incorporation document on file" };
    }

    // ── Fetch document text content for AI verification ──────────────────────
    // Only fetch if there are documents to check and items that need AI verification
    const cfEnv = (globalThis as any).__cf_env || {};
    const openaiKey = cfEnv.OPENAI_API_KEY || cfEnv.OPEN_AI_API_KEY || cfEnv["OPEN AI API KEY"] || "";

    // Extract text from a document via signed URL (plain text / CSV only — PDFs need extraction)
    async function fetchDocText(doc: any): Promise<string> {
      if (!doc.storage_path) return doc.ai_summary || "";
      try {
        const { data: signed } = await sb.storage.from("documents").createSignedUrl(doc.storage_path, 60);
        if (!signed?.signedUrl) return doc.ai_summary || "";
        const res = await fetch(signed.signedUrl);
        if (!res.ok) return doc.ai_summary || "";
        const buf = await res.arrayBuffer();
        const fileName = (doc.file_name || "").toLowerCase();
        // CSV / plain text: decode directly
        if (fileName.endsWith(".csv") || fileName.endsWith(".txt")) {
          return new TextDecoder("utf-8", { fatal: false })
            .decode(new Uint8Array(buf))
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, " ")
            .slice(0, 4000)
            .trim();
        }
        // PDF: attempt naive text extraction (Worker not available server-side)
        // Fall back to ai_summary if available, since full PDF parse needs client
        if (fileName.endsWith(".pdf")) {
          // Try extracting visible text strings from the raw PDF bytes
          const raw = new TextDecoder("latin1", { fatal: false }).decode(new Uint8Array(buf));
          const textMatches = [...raw.matchAll(/\(([^\)]{3,200})\)/g)].map((m) => m[1]);
          const extracted = textMatches.join(" ").replace(/\\n/g, " ").replace(/\s+/g, " ").trim();
          if (extracted.length > 100) return extracted.slice(0, 4000);
          return doc.ai_summary || "";
        }
        return doc.ai_summary || "";
      } catch {
        return doc.ai_summary || "";
      }
    }

    // Ask AI if a document content confirms a specific DD item
    async function aiConfirmsItem(docText: string, docName: string, itemLabel: string): Promise<boolean> {
      if (!openaiKey || !docText || docText.length < 30) return false;
      try {
        const prompt = `You are a due diligence document verifier. Your only job is to answer whether a document genuinely contains a specific financial or legal element.

DOCUMENT NAME: ${docName}
DOCUMENT CONTENT (excerpt):
${docText.slice(0, 2500)}

QUESTION: Does this document genuinely contain a "${itemLabel}"?

Rules:
- Answer based ONLY on what is actually present in the document content above.
- A document named "financials" or "financial summary" is NOT sufficient evidence on its own — the actual content must contain the element.
- A pitch deck, executive summary, or company overview does NOT contain a P&L, balance sheet, cash flow statement, or cap table unless you can see actual financial rows/numbers in the content.
- A general revenue mention is NOT a "revenue projection (3yr)" — a projection must show forward-looking numbers for multiple years.
- A "cap table" must show actual shareholders, share classes, and percentages — not just a mention of the word "cap table".
- If the content is too short, unclear, or does not contain the element, answer false.

Respond with ONLY valid JSON: {"contains": true} or {"contains": false}`;

        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            max_tokens: 20,
            temperature: 0,
            messages: [{ role: "user", content: prompt }],
          }),
        });
        if (!res.ok) return false;
        const json = await res.json() as any;
        const raw = (json.choices?.[0]?.message?.content || "").trim();
        const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
        const parsed = JSON.parse(cleaned);
        return parsed.contains === true;
      } catch {
        return false;
      }
    }

    // ── Per-item matching ────────────────────────────────────────────────────
    const updates: Array<{
      id: string;
      auto_detected: boolean;
      auto_source: string | null;
      auto_source_label: string | null;
      checked: boolean;
    }> = [];
    const detected: Array<{ label: string; source: string; sourceLabel: string }> = [];

    // Fetch doc texts upfront (only if we have docs and an AI key)
    const docTexts: Map<string, string> = new Map();
    if (docs.length > 0 && openaiKey) {
      const texts = await Promise.all(docs.map((d) => fetchDocText(d)));
      docs.forEach((d, i) => docTexts.set(d.id, texts[i]));
    }

    for (const item of items) {
      if (item.manually_overridden) continue;

      const labelLower = item.label.toLowerCase();

      // 1. Check structured data sources first (no AI, no documents)
      let match: Detection | null = null;
      for (const [key, det] of Object.entries(structuredByLabel)) {
        if (labelLower.includes(key)) { match = det; break; }
      }

      // 2. Document AI verification — ONLY if no structured match found
      //    Each document is checked independently for THIS SPECIFIC ITEM
      if (!match && docs.length > 0 && openaiKey) {
        for (const doc of docs) {
          const text = docTexts.get(doc.id) || "";
          const confirmed = await aiConfirmsItem(text, doc.file_name || "document", item.label);
          if (confirmed) {
            match = { source: "documents", label: `Document verified: ${doc.file_name}` };
            break; // first confirming document wins
          }
        }
      }

      if (match) {
        updates.push({ id: item.id, auto_detected: true, auto_source: match.source, auto_source_label: match.label, checked: true });
        detected.push({ label: item.label, source: match.source, sourceLabel: match.label });
      } else {
        updates.push({ id: item.id, auto_detected: false, auto_source: null, auto_source_label: null, checked: false });
      }
    }

    // Batch update all items
    for (const u of updates) {
      const { error: updErr } = await sb.from("dd_checklist_items").update({
        auto_detected: u.auto_detected,
        auto_source: u.auto_source,
        auto_source_label: u.auto_source_label,
        checked: u.checked,
      }).eq("id", u.id);
      if (updErr) console.error("[dd-fn] item update failed:", updErr.message);
    }

    return { detected };
  });

// ─── getDDSummaryForInvestor ──────────────────────────────────────────────────
// Returns deal rooms + checklist progress for the summary page
export const getDDSummaryForInvestor = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown): {
      userId: string; supabaseUrl?: string; supabaseKey?: string;
    } => data as any,
  )
  .handler(async ({ data }) => {
    const sb = getAdminClient(data.supabaseUrl, data.supabaseKey);

    // Get all deal rooms this investor is a member of
    const { data: memberships } = await sb
      .from("deal_room_members")
      .select("deal_room_id")
      .eq("user_id", data.userId);
    const roomIds = (memberships ?? []).map((m: any) => m.deal_room_id);

    if (!roomIds.length) return { dealRooms: [] };

    // Get deal rooms with startup info
    const { data: rooms } = await sb
      .from("deal_rooms")
      .select("id, startup_id, startups(company_name, logo_url, website, sector, stage)")
      .in("id", roomIds);

    // Get checklist progress for each room
    const { data: allItems } = await sb
      .from("dd_checklist_items")
      .select("deal_room_id, checked")
      .in("deal_room_id", roomIds);

    const progressByRoom: Record<string, { total: number; checked: number }> = {};
    for (const item of allItems ?? []) {
      if (!progressByRoom[item.deal_room_id]) progressByRoom[item.deal_room_id] = { total: 0, checked: 0 };
      progressByRoom[item.deal_room_id].total++;
      if (item.checked) progressByRoom[item.deal_room_id].checked++;
    }

    const dealRooms = (rooms ?? []).map((r: any) => ({
      id: r.id,
      startupId: r.startup_id,
      companyName: r.startups?.company_name ?? "Unknown",
      logoUrl: r.startups?.logo_url ?? null,
      website: r.startups?.website ?? null,
      sector: r.startups?.sector ?? null,
      stage: r.startups?.stage ?? null,
      total: progressByRoom[r.id]?.total ?? 0,
      checked: progressByRoom[r.id]?.checked ?? 0,
    }));

    return { dealRooms };
  });


// ─── Confrontational DD analysis ─────────────────────────────────────────────
// Reads every document + verified claim + stated metric and asks GPT-4o for
// contradictions, gaps, red flags and unverifiable claims — an analysis,
// not a summary. Investor-triggered; caller must be a deal room member.

export interface DDFinding {
  finding_type: "contradiction" | "gap" | "red_flag" | "unverifiable";
  severity: "critical" | "significant" | "minor";
  title: string;
  evidence: string;
  question_to_ask: string;
  what_good_looks_like: string;
}

export interface DDAnalysisResult {
  ok: boolean;
  error?: string;
  findings?: DDFinding[];
  no_contradictions_reasoning?: string | null;
  documents_analysed?: number;
  claims_checked?: number;
  run_at?: string;
}

const CONFRONTATIONAL_PROMPT = `You are a senior investment analyst at a top-tier private equity firm conducting due diligence on a startup seeking investment. You have access to all their documents and stated claims.

Your job is NOT to summarize what they told you.
Your job is to find:
1. CONTRADICTIONS: Where what they say conflicts with what their documents show
2. GAPS: Important information that is completely absent from both their claims and documents
3. RED FLAGS: Patterns that experienced investors recognize as warning signs
4. UNVERIFIABLE CLAIMS: Statements they make that cannot be confirmed from any document provided

For each finding:
- finding_type: 'contradiction' | 'gap' | 'red_flag' | 'unverifiable'
- severity: 'critical' | 'significant' | 'minor'
- title: what the issue is (max 10 words)
- evidence: exactly what you found (quote the document or claim specifically)
- question_to_ask: the exact question an investor should ask the founder about this
- what_good_looks_like: what a satisfactory answer would include

RULES:
- Never say something is fine when you don't have evidence to confirm it
- Always cite the specific document or claim you found the issue in
- If you find no contradictions, say so explicitly with your reasoning in "no_contradictions_reasoning"
- Be conservative: flag things you cannot verify rather than assume they're correct
- Do not compliment the pitch deck design or presentation quality — only analyze content

Return JSON only:
{ "findings": [array of finding objects], "no_contradictions_reasoning": string | null }`;

export const runConfrontationalAnalysis = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as { userAccessToken: string; dealRoomId: string; startupId: string })
  .handler(async ({ data }): Promise<DDAnalysisResult> => {
    const sb = getAdminClient();
    const cfEnv = (globalThis as any).__cf_env || {};
    const openaiKey = cfEnv.OPENAI_API_KEY || cfEnv.OPEN_AI_API_KEY || cfEnv["OPEN AI API KEY"] || "";
    if (!openaiKey) return { ok: false, error: "ai_unavailable" };

    // Identity from the token — caller must be a member of this deal room
    const { data: userData } = await sb.auth.getUser(data.userAccessToken);
    const uid = userData?.user?.id;
    if (!uid) return { ok: false, error: "not_authenticated" };
    const { data: membership } = await sb
      .from("deal_room_members").select("id")
      .eq("deal_room_id", data.dealRoomId).eq("user_id", uid).maybeSingle();
    if (!membership) return { ok: false, error: "not_authorized" };

    // 1. All documents: founder library docs + deal-room uploads
    const [{ data: founderDocs }, { data: roomDocs }] = await Promise.all([
      sb.from("founder_documents")
        .select("title, template_slug, status, file_name, file_path, ai_feedback")
        .eq("startup_id", data.startupId),
      sb.from("documents")
        .select("file_name, category, storage_path, ai_summary")
        .eq("deal_room_id", data.dealRoomId),
    ]);

    async function fetchDocText(storagePath: string | null, fileName: string, fallback: string): Promise<string> {
      if (!storagePath) return fallback;
      try {
        const { data: signed } = await sb.storage.from("documents").createSignedUrl(storagePath, 60);
        if (!signed?.signedUrl) return fallback;
        const res = await fetch(signed.signedUrl);
        if (!res.ok) return fallback;
        const buf = await res.arrayBuffer();
        const lower = (fileName || "").toLowerCase();
        if (lower.endsWith(".csv") || lower.endsWith(".txt")) {
          return new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(buf))
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, " ").slice(0, 5000).trim();
        }
        if (lower.endsWith(".pdf")) {
          const raw = new TextDecoder("latin1", { fatal: false }).decode(new Uint8Array(buf));
          const textMatches = [...raw.matchAll(/\(([^\)]{3,200})\)/g)].map((m) => m[1]);
          const extracted = textMatches.join(" ").replace(/\\n/g, " ").replace(/\s+/g, " ").trim();
          if (extracted.length > 100) return extracted.slice(0, 5000);
          return fallback;
        }
        return fallback;
      } catch {
        return fallback;
      }
    }

    const docPayloads: Array<{ name: string; source: string; content: string }> = [];
    for (const d of roomDocs ?? []) {
      const text = await fetchDocText(d.storage_path, d.file_name ?? "", d.ai_summary ?? "");
      docPayloads.push({ name: d.file_name ?? "Untitled", source: "deal_room", content: text || "(no readable content)" });
    }
    for (const d of founderDocs ?? []) {
      const text = await fetchDocText(d.file_path, d.file_name ?? "", "");
      docPayloads.push({ name: d.title ?? d.file_name ?? "Untitled", source: "founder_library", content: text || `(status: ${d.status}; no readable content)` });
    }

    // 2. Claims with verdicts
    const { data: claims } = await sb
      .from("startup_claims")
      .select("claim_type, claim_label, claim_value, claim_category, ai_verdict, proof_status")
      .eq("startup_id", data.startupId);

    // 3. Stated metrics from the profile
    const { data: startup } = await sb
      .from("startups")
      .select("company_name, stage, sector, mrr_usd, revenue, growth_rate, runway_months, burn_rate, team_size, founded_year, funding_target, traction, one_liner, investor_narrative, legal_entity_name, incorporated_in")
      .eq("id", data.startupId)
      .maybeSingle();

    // 4. Existing DD goals + status
    const { data: goals } = await sb
      .from("deal_room_dd_goals")
      .select("category, goal_text, status, notes")
      .eq("deal_room_id", data.dealRoomId);

    const userMessage = [
      "STATED PROFILE AND METRICS:",
      JSON.stringify(startup ?? {}, null, 1),
      "\nCLAIMS (with our AI verification verdicts — 'verified' means a document supported it):",
      claims?.length ? JSON.stringify(claims, null, 1) : "No claims submitted.",
      "\nDD CHECKLIST STATE:",
      goals?.length ? JSON.stringify(goals) : "No DD goals set.",
      "\nDOCUMENTS (extracted content, may be partial):",
      ...docPayloads.map((d) => `--- ${d.name} [${d.source}] ---\n${d.content.slice(0, 4000)}`),
      docPayloads.length === 0 ? "No documents provided." : "",
    ].join("\n");

    try {
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: "gpt-4o",
          temperature: 0.2,
          max_tokens: 2400,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: CONFRONTATIONAL_PROMPT },
            { role: "user", content: userMessage.slice(0, 60000) },
          ],
        }),
      });
      const json: any = await resp.json();
      const raw = json.choices?.[0]?.message?.content ?? "";
      const parsed = JSON.parse(raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim());
      const findings: DDFinding[] = Array.isArray(parsed.findings) ? parsed.findings : [];
      const reasoning = typeof parsed.no_contradictions_reasoning === "string" ? parsed.no_contradictions_reasoning : null;

      const { data: inserted, error: insErr } = await sb.from("deal_room_dd_analysis").insert({
        deal_room_id: data.dealRoomId,
        run_by: uid,
        findings,
        no_contradictions_reasoning: reasoning,
        documents_analysed: docPayloads.length,
        claims_checked: claims?.length ?? 0,
        ai_model: "gpt-4o",
      }).select("run_at").single();
      if (insErr) console.error("[dd-analysis] insert failed:", insErr.message);

      return {
        ok: true,
        findings,
        no_contradictions_reasoning: reasoning,
        documents_analysed: docPayloads.length,
        claims_checked: claims?.length ?? 0,
        run_at: inserted?.run_at ?? new Date().toISOString(),
      };
    } catch (err: any) {
      console.error("[dd-analysis] failed:", err?.message ?? err);
      return { ok: false, error: err?.message ?? "analysis_failed" };
    }
  });
