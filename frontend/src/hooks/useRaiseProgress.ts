import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

/**
 * One source of truth for the founder's raise progress. Drives:
 * - the sidebar step badges and soft locks (AppShell)
 * - the /app home spine
 * - the /app/prepare progress header and section statuses
 *
 * Read-only aggregation over existing tables — no new writes, no new fns.
 */

export type SectionStatus = "complete" | "in-progress" | "not-started";

export interface RaiseProgress {
  startupId: string | null;
  companyName: string | null;
  profilePct: number;
  profilePublished: boolean;
  sections: {
    profile: SectionStatus;
    documents: SectionStatus;
    verification: SectionStatus;
    claims: SectionStatus;
    readiness: SectionStatus;
    badges: SectionStatus;
  };
  prepareDone: number;
  prepareTotal: number;
  /** Go Live soft-locks below this */
  prepareUnlocked: boolean;
  activeRooms: number;
  closingRooms: number;
  closedRooms: number;
  termSheetRooms: number;
  goLiveDone: boolean;
}

const ORDER: Array<keyof RaiseProgress["sections"]> = [
  "profile",
  "documents",
  "verification",
  "claims",
  "readiness",
  "badges",
];

export const SECTION_LABELS: Record<keyof RaiseProgress["sections"], string> = {
  profile: "Profile",
  documents: "Documents",
  verification: "Verification",
  claims: "Claims",
  readiness: "Readiness",
  badges: "Badges",
};

export function nextIncomplete(p: RaiseProgress | undefined) {
  if (!p) return null;
  for (const k of ORDER) {
    if (p.sections[k] !== "complete") return k;
  }
  return null;
}

export function useRaiseProgress() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["raise-progress", user?.id],
    enabled: !!user?.id && user?.role !== "investor",
    staleTime: 60_000,
    queryFn: async (): Promise<RaiseProgress> => {
      const { data: startup, error: sErr } = await supabase
        .from("startups")
        .select(
          "id, company_name, profile_published, tagline, sector, stage, country, funding_target, description, problem, solution, why_us, revenue_model, use_of_funds, founder_name",
        )
        .eq("founder_id", user!.id)
        .maybeSingle();
      if (sErr) console.error("[raise] startup fetch failed:", sErr);

      const empty: RaiseProgress = {
        startupId: null,
        companyName: null,
        profilePct: 0,
        profilePublished: false,
        sections: {
          profile: "not-started",
          documents: "not-started",
          verification: "not-started",
          claims: "not-started",
          readiness: "not-started",
          badges: "not-started",
        },
        prepareDone: 0,
        prepareTotal: ORDER.length,
        prepareUnlocked: false,
        activeRooms: 0,
        closingRooms: 0,
        closedRooms: 0,
        termSheetRooms: 0,
        goLiveDone: false,
      };
      if (!startup?.id) return empty;

      const fields = [
        startup.company_name,
        startup.tagline,
        startup.sector,
        startup.stage,
        startup.country,
        startup.funding_target,
        startup.description,
        startup.problem,
        startup.solution,
        startup.why_us,
        startup.revenue_model,
        startup.use_of_funds,
        startup.founder_name,
      ];
      const profilePct = Math.round(
        (fields.filter((f) => f != null && String(f).trim() !== "").length /
          fields.length) *
          100,
      );

      const [docs, verif, claims, badges, rooms] = await Promise.all([
        supabase
          .from("founder_documents")
          .select("id", { count: "exact", head: true })
          .eq("startup_id", startup.id),
        supabase
          .from("founder_verifications")
          .select("tier1_passed")
          .eq("startup_id", startup.id)
          .maybeSingle(),
        supabase
          .from("startup_claims")
          .select("id, ai_verdict")
          .eq("startup_id", startup.id),
        supabase
          .from("profile_badges")
          .select("id", { count: "exact", head: true })
          .eq("startup_id", startup.id),
        supabase
          .from("deal_rooms")
          .select("id, status, workflow_stage, term_sheet_status")
          .eq("startup_id", startup.id),
      ]);
      for (const r of [docs, verif, claims, badges, rooms]) {
        if (r.error) console.error("[raise] progress fetch failed:", r.error);
      }

      const docCount = docs.count ?? 0;
      const tier1 = verif.data?.tier1_passed === true;
      const claimRows = claims.data ?? [];
      const verifiedClaims = claimRows.filter(
        (c) => c.ai_verdict === "verified",
      ).length;
      const badgeCount = badges.count ?? 0;
      const roomRows = rooms.data ?? [];

      const status = (done: boolean, started: boolean): SectionStatus =>
        done ? "complete" : started ? "in-progress" : "not-started";

      const sections: RaiseProgress["sections"] = {
        profile: status(profilePct >= 80, profilePct > 0),
        documents: status(docCount >= 3, docCount > 0),
        verification: status(tier1, verif.data != null),
        claims: status(verifiedClaims >= 1, claimRows.length > 0),
        readiness: status(profilePct >= 80 && tier1, profilePct >= 50),
        badges: status(badgeCount >= 1, false),
      };
      const prepareDone = ORDER.filter(
        (k) => sections[k] === "complete",
      ).length;

      const activeRooms = roomRows.filter(
        (r) => r.status !== "closed" && r.status !== "archived",
      ).length;
      const closingRooms = roomRows.filter(
        (r) => r.workflow_stage === "closing",
      ).length;
      const closedRooms = roomRows.filter((r) => r.status === "closed").length;
      // "pending" is the column default — it means no term sheet yet.
      const termSheetRooms = roomRows.filter(
        (r) => r.term_sheet_status && !["none", "pending"].includes(r.term_sheet_status),
      ).length;

      return {
        startupId: startup.id,
        companyName: startup.company_name,
        profilePct,
        profilePublished: startup.profile_published === true,
        sections,
        prepareDone,
        prepareTotal: ORDER.length,
        prepareUnlocked: profilePct >= 70,
        activeRooms,
        closingRooms,
        closedRooms,
        termSheetRooms,
        goLiveDone: startup.profile_published === true,
      };
    },
  });
}
