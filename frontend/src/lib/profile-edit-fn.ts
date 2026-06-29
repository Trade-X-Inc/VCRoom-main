import { createServerFn } from "@tanstack/react-start";
import { EDITABLE_STARTUP_FIELDS, EDITABLE_THESIS_FIELDS } from "./profile-edit-constants";

// Re-export so callers that need both server fns + constants can import from one place
export { EDITABLE_STARTUP_FIELDS, EDITABLE_THESIS_FIELDS };

// ── HARD EXCLUSION (CLAUDE.md §3 + feature spec) ──────────────────────────────
// This file has NO path to deal_rooms, deal_room_members, deal_room_documents,
// or any deal-room-scoped table. The only tables ever written to are:
//   - startups (Company Profile fields, keyed by founder_id)
//   - founder_thesis (Investor Criteria fields, keyed by startup_id)
// Any attempt to add deal-room writes here is explicitly forbidden.
// ─────────────────────────────────────────────────────────────────────────────

export type FieldDiff = {
  field: string;
  label: string;
  table: "startups" | "founder_thesis";
  currentValue: string | null;
  proposedValue: string;
  multiline: boolean;
};

export type ProfileEditPayload = {
  diffs: FieldDiff[];
  aiReasoning: string;
  error?: string;
};

type ProposeInput = {
  message: string;
  startupId: string;
  currentStartup: Record<string, any>;
  currentThesis: Record<string, any> | null;
};

export const proposeProfileEdits = createServerFn({ method: "POST" })
  .inputValidator((d: unknown): ProposeInput => d as ProposeInput)
  .handler(async ({ data }): Promise<ProfileEditPayload> => {
    const cfEnv = (globalThis as any).__cf_env || {};
    const apiKey = cfEnv.OPENAI_API_KEY || cfEnv.OPEN_AI_API_KEY || cfEnv["OPEN AI API KEY"] || "";
    if (!apiKey) return { diffs: [], aiReasoning: "", error: "no_key" };

    const startupFieldList = Object.entries(EDITABLE_STARTUP_FIELDS)
      .map(([k, v]) => `  "${k}" — ${v.label}`)
      .join("\n");
    const thesisFieldList = Object.entries(EDITABLE_THESIS_FIELDS)
      .map(([k, v]) => `  "${k}" — ${v.label}`)
      .join("\n");

    const currentStartupStr = Object.entries(EDITABLE_STARTUP_FIELDS)
      .filter(([k]) => data.currentStartup[k] !== undefined)
      .map(([k, v]) => `${v.label} (${k}): ${data.currentStartup[k] ?? "(empty)"}`)
      .join("\n");

    const currentThesisStr = data.currentThesis
      ? Object.entries(EDITABLE_THESIS_FIELDS)
          .filter(([k]) => data.currentThesis![k] !== undefined)
          .map(([k, v]) => `${v.label} (${k}): ${data.currentThesis![k] ?? "(empty)"}`)
          .join("\n")
      : "(no thesis record yet)";

    const systemPrompt = `You are an AI assistant helping a startup founder update their Company Profile and Investor Criteria fields in a fundraising platform. The founder has expressed an intent to change one or more fields.

Your job:
1. Identify ONLY the specific field(s) the founder is asking to change — do not invent changes to unrelated fields.
2. For each changed field, propose a new value that directly addresses what the founder asked.
3. Propose improvements only — never propose clearing or emptying a field unless explicitly asked.
4. If you cannot identify a specific field to change from the request, return an empty changes array.

ALLOWED STARTUP TABLE FIELDS:
${startupFieldList}

ALLOWED THESIS TABLE FIELDS:
${thesisFieldList}

NEVER propose changes to: id, founder_id, deal_rooms, deal_room_members, or any field not listed above.

Return ONLY valid JSON, no markdown:
{
  "changes": [
    {
      "table": "startups" | "founder_thesis",
      "field": "<exact column name from the allowed lists>",
      "proposedValue": "<the new value as a string>",
      "reasoning": "<one sentence why this change addresses the request>"
    }
  ],
  "aiReasoning": "<1-2 sentences explaining the overall edit you're proposing>"
}`;

    const userMessage = `FOUNDER'S REQUEST: "${data.message}"

CURRENT COMPANY PROFILE (startups table):
${currentStartupStr}

CURRENT INVESTOR CRITERIA (founder_thesis table):
${currentThesisStr}`;

    try {
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 800,
          temperature: 0.2,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
        }),
      });

      if (!resp.ok) return { diffs: [], aiReasoning: "", error: "api_error" };

      const json = await resp.json() as any;
      const raw = json.choices?.[0]?.message?.content ?? "";
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

      let parsed: any;
      try { parsed = JSON.parse(cleaned); } catch { return { diffs: [], aiReasoning: "Could not parse AI response.", error: "parse_error" }; }

      const changes: any[] = parsed?.changes ?? [];
      const aiReasoning: string = parsed?.aiReasoning ?? "";

      // Build diffs with current values — validate field is in allowed list
      const diffs: FieldDiff[] = [];
      for (const c of changes) {
        if (c.table === "startups") {
          const meta = EDITABLE_STARTUP_FIELDS[c.field];
          if (!meta) continue; // field not in allowlist — silently skip
          diffs.push({
            field: c.field,
            label: meta.label,
            table: "startups",
            currentValue: String(data.currentStartup[c.field] ?? ""),
            proposedValue: String(c.proposedValue ?? ""),
            multiline: meta.multiline,
          });
        } else if (c.table === "founder_thesis") {
          const meta = EDITABLE_THESIS_FIELDS[c.field];
          if (!meta) continue;
          diffs.push({
            field: c.field,
            label: meta.label,
            table: "founder_thesis",
            currentValue: String(data.currentThesis?.[c.field] ?? ""),
            proposedValue: String(c.proposedValue ?? ""),
            multiline: meta.multiline,
          });
        }
        // Any other table is silently dropped — deal_rooms etc can never get here
      }

      return { diffs, aiReasoning };
    } catch {
      return { diffs: [], aiReasoning: "", error: "fetch_error" };
    }
  });

// ── Apply a single confirmed field edit to the real table ─────────────────────
// HARD EXCLUSION: only startups and founder_thesis are reachable here.
// This function has no branch that can write to deal_rooms or any other table.

type ApplyInput = {
  table: "startups" | "founder_thesis";
  field: string;
  value: string;
  startupId: string;
};

export const applyProfileFieldEdit = createServerFn({ method: "POST" })
  .inputValidator((d: unknown): ApplyInput => d as ApplyInput)
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const cfEnv = (globalThis as any).__cf_env || {};
    const supabaseUrl =
      cfEnv.SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      import.meta.env.VITE_SUPABASE_URL || "";
    const supabaseKey =
      cfEnv.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    // HARD EXCLUSION: validate table is one of the two allowed targets
    if (data.table !== "startups" && data.table !== "founder_thesis") {
      console.error("[profile-edit] Attempted write to disallowed table:", data.table);
      return { ok: false, error: "disallowed_table" };
    }

    // Validate field is in its respective allowlist
    const allowlist = data.table === "startups" ? EDITABLE_STARTUP_FIELDS : EDITABLE_THESIS_FIELDS;
    if (!allowlist[data.field]) {
      console.error("[profile-edit] Field not in allowlist:", data.field);
      return { ok: false, error: "disallowed_field" };
    }

    const url = data.table === "startups"
      ? `${supabaseUrl}/rest/v1/startups?id=eq.${data.startupId}`
      : `${supabaseUrl}/rest/v1/founder_thesis?startup_id=eq.${data.startupId}`;

    const resp = await fetch(url, {
      method: "PATCH",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ [data.field]: data.value, updated_at: new Date().toISOString() }),
    });

    if (!resp.ok) {
      const err = await resp.text().catch(() => "");
      return { ok: false, error: err };
    }
    return { ok: true };
  });
