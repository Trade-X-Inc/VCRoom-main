import { createServerFn } from "@tanstack/react-start";

// ── Types ──────────────────────────────────────────────────────────────────────

export type FounderDocInfo = {
  id: string;
  fileName: string | null;
  templateSlug: string;
  status: string;
  completenessScore: number;
  hasFeedback: boolean;
  uploadedAt: string;
};

export type PendingRequestInfo = {
  id: string;
  investorName: string | null;
  firmName: string | null;
  createdAt: string;
};

export type SimulationResultStored = {
  score: number;
  overall_verdict: string;
  first_question: string;
  strongest_point: string;
  red_flag: string;
  deal_killer: string | null;
};

export type InvestorFitInfo = {
  investorName: string | null;
  firmName: string | null;
  matchScore: number;
  founderFitScore: number;
  fitSummary: string | null;
};

export type FounderContext = {
  companyName: string | null;
  profileCompleteness: { percent: number; missingFields: string[] };
  documents: FounderDocInfo[];
  pendingRequests: PendingRequestInfo[];
  lastSimulation: SimulationResultStored | null;
  lastSimulationAt: string | null;
  founderThesisComplete: boolean;
  topFitInvestors: InvestorFitInfo[];
};

type ContextInput = {
  startupId: string;
  userId: string;
};

// ── Server function ────────────────────────────────────────────────────────────

export const getFounderContext = createServerFn({ method: "POST" })
  .inputValidator((d: unknown): ContextInput => d as ContextInput)
  .handler(async ({ data }): Promise<FounderContext> => {
    const supabaseUrl =
      (import.meta.env as any).VITE_SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      "";
    const supabaseKey =
      (import.meta.env as any).VITE_SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      "";

    const headers = {
      "Content-Type": "application/json",
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    };

    const base = supabaseUrl + "/rest/v1";

    // Run all queries in parallel
    const [startupResp, docsResp, requestsResp, simulationResp, thesisResp, fitAlertsResp] = await Promise.all([
      // startup profile completeness fields
      fetch(
        `${base}/startups?select=company_name,stage,sector&id=eq.${data.startupId}&limit=1`,
        { headers }
      ),
      // most recent 10 documents
      fetch(
        `${base}/founder_documents?select=id,file_name,template_slug,status,completeness_score,ai_feedback,created_at&startup_id=eq.${data.startupId}&order=created_at.desc&limit=10`,
        { headers }
      ),
      // pending investor access requests with investor profiles
      fetch(
        `${base}/discovery_requests?select=id,investor_id,created_at,investor_profiles(your_name,fund_name)&startup_id=eq.${data.startupId}&status=eq.pending&order=created_at.desc`,
        { headers }
      ),
      // most recent simulation result stored in advisor_messages
      fetch(
        `${base}/advisor_messages?select=simulation_result,created_at&user_id=eq.${data.userId}&simulation_result=not.is.null&order=created_at.desc&limit=1`,
        { headers }
      ),
      // founder thesis completion status
      fetch(
        `${base}/founder_thesis?select=status&startup_id=eq.${data.startupId}&limit=1`,
        { headers }
      ),
      // thesis alerts with real founder_fit_score (only where computed)
      fetch(
        `${base}/thesis_alerts?select=match_score,founder_fit_score,founder_fit_reasons,investor_profiles(your_name,fund_name)&startup_id=eq.${data.startupId}&founder_fit_score=not.is.null&order=founder_fit_score.desc&limit=3`,
        { headers }
      ),
    ]);

    const [startupRows, docRows, requestRows, simulationRows, thesisRows, fitAlertRows] = await Promise.all([
      startupResp.json() as Promise<any[]>,
      docsResp.json() as Promise<any[]>,
      requestsResp.json() as Promise<any[]>,
      simulationResp.json() as Promise<any[]>,
      thesisResp.json() as Promise<any[]>,
      fitAlertsResp.json() as Promise<any[]>,
    ]);

    const startup = Array.isArray(startupRows) ? startupRows[0] : null;
    const docs = Array.isArray(docRows) ? docRows : [];
    const requests = Array.isArray(requestRows) ? requestRows : [];
    const simRows = Array.isArray(simulationRows) ? simulationRows : [];

    // Profile completeness: reuse the INVESTOR_REQUIRED_FIELDS pattern for founders
    // Founder completeness is keyed off profile_builder_sessions.status = confirmed
    // We surface doc-based completeness here instead — % of key documents uploaded
    const KEY_DOCS = ["pitch-deck", "financial-model", "problem-solution", "team"];
    const uploadedSlugs = docs.map((d: any) => d.template_slug);
    const missingDocs = KEY_DOCS.filter((k) => !uploadedSlugs.includes(k));
    const docPercent = Math.round(((KEY_DOCS.length - missingDocs.length) / KEY_DOCS.length) * 100);

    const documents: FounderDocInfo[] = docs.map((d: any) => ({
      id: d.id,
      fileName: d.file_name ?? null,
      templateSlug: d.template_slug,
      status: d.status,
      completenessScore: d.completeness_score ?? 0,
      hasFeedback: !!(d.ai_feedback && typeof d.ai_feedback === "object" && Object.keys(d.ai_feedback).length > 0),
      uploadedAt: d.created_at,
    }));

    const pendingRequests: PendingRequestInfo[] = requests.map((r: any) => ({
      id: r.id,
      investorName: r.investor_profiles?.your_name ?? null,
      firmName: r.investor_profiles?.fund_name ?? null,
      createdAt: r.created_at,
    }));

    const lastSimRow = simRows[0] ?? null;
    const lastSimulation: SimulationResultStored | null = lastSimRow?.simulation_result ?? null;
    const lastSimulationAt: string | null = lastSimRow?.created_at ?? null;

    const founderThesisComplete = Array.isArray(thesisRows) && thesisRows[0]?.status === "complete";

    const topFitInvestors: InvestorFitInfo[] = Array.isArray(fitAlertRows)
      ? fitAlertRows
          .filter((r: any) => r.founder_fit_score != null)
          .map((r: any) => ({
            investorName: r.investor_profiles?.your_name ?? null,
            firmName: r.investor_profiles?.fund_name ?? null,
            matchScore: r.match_score,
            founderFitScore: r.founder_fit_score,
            fitSummary: r.founder_fit_reasons?.summary ?? null,
          }))
      : [];

    return {
      companyName: startup?.company_name ?? null,
      profileCompleteness: {
        percent: docPercent,
        missingFields: missingDocs,
      },
      documents,
      pendingRequests,
      lastSimulation,
      lastSimulationAt,
      founderThesisComplete,
      topFitInvestors,
    };
  });

// ── Build the context string injected into the AI system prompt ───────────────

export function buildContextBlock(ctx: FounderContext, companyName?: string | null): string {
  const name = companyName ?? ctx.companyName ?? "this founder";

  const docLines =
    ctx.documents.length === 0
      ? "  No documents uploaded yet."
      : ctx.documents
          .slice(0, 5)
          .map((d) => {
            const label = d.fileName ?? d.templateSlug;
            const age = timeSince(d.uploadedAt);
            // hasFeedback is true only when ai_feedback has actual keys (not {} empty object).
            // Do NOT use d.status here — status reflects upload/form completeness, not AI review state.
            const reviewLabel = d.hasFeedback ? "AI review done" : "not yet analyzed";
            return `  • ${label} (uploaded ${age}, ${reviewLabel})`;
          })
          .join("\n");

  const requestLines =
    ctx.pendingRequests.length === 0
      ? "  None pending."
      : ctx.pendingRequests
          .map((r) => {
            const who = [r.investorName, r.firmName].filter(Boolean).join(" @ ");
            return `  • ${who || "Unknown investor"} (${timeSince(r.createdAt)})`;
          })
          .join("\n");

  const simLine = ctx.lastSimulation
    ? `Score ${ctx.lastSimulation.score}/10 run ${timeSince(ctx.lastSimulationAt ?? "")} — top fix: "${ctx.lastSimulation.deal_killer ?? ctx.lastSimulation.red_flag}"`
    : "None run yet this session.";

  const missingDocLine =
    ctx.profileCompleteness.missingFields.length > 0
      ? `Missing key documents: ${ctx.profileCompleteness.missingFields.join(", ")}.`
      : "All key documents present.";

  const fitLines =
    ctx.topFitInvestors.length === 0
      ? null
      : ctx.topFitInvestors
          .map((f) => {
            const who = [f.investorName, f.firmName].filter(Boolean).join(" @ ") || "Unknown investor";
            return `  • ${who} — ${f.founderFitScore}% founder fit, ${f.matchScore}% thesis match${f.fitSummary ? `. ${f.fitSummary}` : ""}`;
          })
          .join("\n");

  const fitSection = fitLines
    ? `- Investor fit for your criteria (top matches):\n${fitLines}`
    : ctx.founderThesisComplete
    ? "- Investor fit: thesis complete, no scored matches yet."
    : "- Investor fit: investor criteria not yet set (optional — /app/investor-thesis).";

  return `LIVE FOUNDER STATE for ${name} (fetched right now — use this to answer, never guess):
- Document library (${ctx.documents.length} total):
${docLines}
- ${missingDocLine}
- Pending investor access requests: ${ctx.pendingRequests.length}
${requestLines}
- Last investor simulation: ${simLine}
${fitSection}

RULES FOR THIS CONTEXT:
1. If the founder asks about their documents, name the actual files above — do NOT say "upload to Document Vault."
2. If a document was uploaded in the last 10 minutes, proactively mention it and offer to run the investor simulation.
3. If pending requests > 0, mention them proactively even if not asked.
4. If the last simulation score exists, reference it when relevant — do not re-run unless the founder asks.
5. If topFitInvestors exist, mention both the investor's interest AND their founder-fit score when discussing specific investors.
6. NEVER describe a feature or workflow that is not listed above or in the platform context below.`;
}

function timeSince(isoString: string): string {
  if (!isoString) return "unknown time ago";
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
