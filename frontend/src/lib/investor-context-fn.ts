import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { getEnvVar } from "@/lib/env";

// ── Types ──────────────────────────────────────────────────────────────────────

export type WatchlistEntry = {
  id: string;
  companyName: string;
  status: string;
  score: number | null;
  daysOnWatchlist: number;
};

export type ThesisAlert = {
  id: string;
  startupName: string;
  matchScore: number;
  matchReasons: string[];
  alertedAt: string;
  profileSlug: string | null;
  startupId: string;
};

export type ActiveDealRoom = {
  id: string;
  companyName: string;
  status: string | null;
  startupId: string | null;
};

export type LastDealBrief = {
  startupId: string;
  companyName: string;
  headline: string | null;
  matchScore: number;
  verdictSignal: string | null;
  generatedAt: string;
};

export type InvestorContext = {
  fundName: string | null;
  investorName: string | null;
  watchlist: WatchlistEntry[];
  thesisAlerts: ThesisAlert[];
  activeDealRooms: ActiveDealRoom[];
  lastDealBrief: LastDealBrief | null;
};

type ContextInput = { investorId: string };

// ── Server function ────────────────────────────────────────────────────────────

export const getInvestorContext = createServerFn({ method: "POST" })
  .inputValidator((d: unknown): ContextInput => d as ContextInput)
  .handler(async ({ data }): Promise<InvestorContext> => {
    const supabaseUrl = getEnvVar("SUPABASE_URL") || getEnvVar("VITE_SUPABASE_URL");
    const supabaseKey = getEnvVar("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return {
        fundName: null, investorName: null,
        watchlist: [], thesisAlerts: [], activeDealRooms: [], lastDealBrief: null,
      };
    }

    const admin = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

    const [profileRes, watchlistRes, alertsRes, dealRoomRes, briefRes] = await Promise.all([
      admin.from("investor_profiles")
        .select("fund_name, your_name")
        .eq("user_id", data.investorId)
        .maybeSingle(),

      admin.from("investor_watchlist")
        .select("id, company_name, status, initial_score, created_at")
        .eq("investor_id", data.investorId)
        .order("created_at", { ascending: false })
        .limit(5),

      admin.from("thesis_alerts")
        .select("id, startup_id, match_score, match_reasons, alerted_at, startups!startup_id(company_name, profile_slug)")
        .eq("investor_id", data.investorId)
        .order("alerted_at", { ascending: false })
        .limit(10),

      admin.from("deal_room_members")
        .select("deal_room_id, deal_rooms!deal_room_id(id, status, startup_id, startups!startup_id(company_name))")
        .eq("user_id", data.investorId),

      admin.from("deal_briefs")
        .select("startup_id, match_score, headline, verdict_signal, generated_at, startups!startup_id(company_name)")
        .eq("investor_id", data.investorId)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const profile = profileRes.data;

    const watchlist: WatchlistEntry[] = (watchlistRes.data ?? []).map((w: any) => ({
      id: w.id,
      companyName: w.company_name,
      status: w.status ?? "Sourcing",
      score: w.initial_score ?? null,
      daysOnWatchlist: Math.floor(
        (Date.now() - new Date(w.created_at).getTime()) / 86_400_000
      ),
    }));

    const thesisAlerts: ThesisAlert[] = (alertsRes.data ?? []).map((a: any) => ({
      id: a.id,
      startupName: a.startups?.company_name ?? "Unknown startup",
      matchScore: a.match_score,
      matchReasons: Array.isArray(a.match_reasons) ? a.match_reasons : [],
      alertedAt: a.alerted_at,
      profileSlug: a.startups?.profile_slug ?? null,
      startupId: a.startup_id,
    }));

    const activeDealRooms: ActiveDealRoom[] = (dealRoomRes.data ?? [])
      .map((m: any) => {
        const dr = m.deal_rooms;
        if (!dr) return null;
        return {
          id: dr.id,
          companyName: dr.startups?.company_name ?? "Unknown",
          status: dr.status ?? null,
          startupId: dr.startup_id ?? null,
        };
      })
      .filter(Boolean) as ActiveDealRoom[];

    let lastDealBrief: LastDealBrief | null = null;
    if (briefRes.data) {
      const b = briefRes.data as any;
      if (b.headline || b.match_score) {
        lastDealBrief = {
          startupId: b.startup_id,
          companyName: b.startups?.company_name ?? "Unknown",
          headline: b.headline ?? null,
          matchScore: b.match_score,
          verdictSignal: b.verdict_signal ?? null,
          generatedAt: b.generated_at,
        };
      }
    }

    return {
      fundName: profile?.fund_name ?? null,
      investorName: profile?.your_name ?? null,
      watchlist,
      thesisAlerts,
      activeDealRooms,
      lastDealBrief,
    };
  });

// ── Build the context string injected into the AI system prompt ───────────────

export function buildInvestorContextBlock(ctx: InvestorContext): string {
  const identity = ctx.fundName
    ? `${ctx.fundName}${ctx.investorName ? ` (${ctx.investorName})` : ""}`
    : ctx.investorName ?? "this investor";

  // Watchlist lines
  const watchlistLines =
    ctx.watchlist.length === 0
      ? "  No companies on watchlist yet."
      : ctx.watchlist
          .map((w) => {
            const score = w.score != null ? `, score: ${w.score}/10` : "";
            return `  • ${w.companyName} — ${w.status}${score} (${w.daysOnWatchlist}d on watchlist)`;
          })
          .join("\n");

  // Thesis alert lines
  const alertLines =
    ctx.thesisAlerts.length === 0
      ? "  None."
      : ctx.thesisAlerts
          .map((a) => {
            const reasons = a.matchReasons.slice(0, 3).join("; ");
            return `  • ${a.startupName} — ${a.matchScore}% THESIS FIT (how well this startup matches your stated sectors/stage/check size/geography) (${reasons})`;
          })
          .join("\n");

  // Deal room lines
  const dealRoomLines =
    ctx.activeDealRooms.length === 0
      ? "  None."
      : ctx.activeDealRooms
          .map((d) => `  • ${d.companyName} (${d.status ?? "active"})`)
          .join("\n");

  // Last deal brief
  const briefLine = ctx.lastDealBrief
    ? `${ctx.lastDealBrief.companyName} — ${ctx.lastDealBrief.matchScore}/100 DEAL QUALITY SCORE (an AI-generated assessment of the startup's overall investment readiness, separate from thesis fit), signal: ${ctx.lastDealBrief.verdictSignal ?? "n/a"} (generated ${timeSince(ctx.lastDealBrief.generatedAt)})`
    : "None generated yet.";

  return `LIVE INVESTOR STATE for ${identity} (fetched right now — use this to answer, never guess):
- Watchlist (${ctx.watchlist.length} companies):
${watchlistLines}
- Thesis alerts (${ctx.thesisAlerts.length} match${ctx.thesisAlerts.length !== 1 ? "es" : ""}):
${alertLines}
- Active deal rooms: ${ctx.activeDealRooms.length}
${dealRoomLines}
- Last deal brief: ${briefLine}

RULES FOR THIS CONTEXT:
1. If the investor asks about their watchlist, pipeline, thesis alerts, or deal rooms, answer directly from the data above — NEVER say "go check the Startups page."
2. If thesis alerts exist with high THESIS FIT scores (80+), mention them proactively even if not directly asked — a real analyst would flag this.
3. If a deal brief exists, reference it when relevant rather than offering to generate a new one.
4. NEVER describe a feature, workflow, or tool that is not listed above or in the platform context below.
5. You can offer to generate a deal brief for any company the investor mentions — say "I can run a full deal analysis on [company] — just say the word."
6. CRITICAL — two different scores exist and must NEVER be confused: THESIS FIT (%) = how well a startup matches this investor's stated sectors, stage, check size, and geography — computed by the platform's matching algorithm. DEAL QUALITY SCORE (/100) = an AI-generated assessment of the startup's overall investment readiness, independent of any one investor's thesis. If both scores exist for the same startup, ALWAYS label which is which when mentioning either one. Never present them as the same number or imply one supersedes the other.`;
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
