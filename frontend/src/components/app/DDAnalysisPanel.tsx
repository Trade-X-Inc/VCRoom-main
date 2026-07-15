import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ChevronDown, ChevronUp, Microscope, Loader2, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { DDFinding } from "@/lib/dd-fn";

const TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  contradiction: { label: "Contradictions", color: "#EF4444", bg: "rgba(239,68,68,0.12)" },
  gap: { label: "Gaps", color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  red_flag: { label: "Red flags", color: "#EF4444", bg: "rgba(239,68,68,0.12)" },
  unverifiable: { label: "Unverifiable", color: "#A855F7", bg: "rgba(168,85,247,0.12)" },
};

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#EF4444",
  significant: "#F59E0B",
  minor: "#6B7280",
};

interface AnalysisRow {
  id: string;
  run_at: string;
  findings: DDFinding[] | null;
  no_contradictions_reasoning: string | null;
  documents_analysed: number;
  claims_checked: number;
}

export function DDAnalysisPanel({
  dealRoomId,
  startupId,
  isInvestor,
}: {
  dealRoomId: string;
  startupId: string;
  isInvestor: boolean;
}) {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: analysis } = useQuery<AnalysisRow | null>({
    queryKey: ["dd-analysis", dealRoomId],
    enabled: !!dealRoomId,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_room_dd_analysis")
        .select("id, run_at, findings, no_contradictions_reasoning, documents_analysed, claims_checked")
        .eq("deal_room_id", dealRoomId)
        .order("run_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data as AnalysisRow) ?? null;
    },
  });

  const run = async () => {
    if (running) return;
    setRunning(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Session expired — sign in again"); return; }
      const { runConfrontationalAnalysis } = await import("@/lib/dd-fn");
      const result = await runConfrontationalAnalysis({
        data: { userAccessToken: session.access_token, dealRoomId, startupId },
      });
      if (result.ok) {
        toast.success(`Analysis complete — ${result.findings?.length ?? 0} findings across ${result.documents_analysed} documents`);
        qc.invalidateQueries({ queryKey: ["dd-analysis", dealRoomId] });
      } else {
        toast.error("Analysis failed — try again in a moment.");
      }
    } catch (e) {
      console.error("[dd-analysis] run failed:", e);
      toast.error("Analysis failed — try again in a moment.");
    } finally {
      setRunning(false);
    }
  };

  const askInQa = (question: string) => {
    // Handoff to the Q&A stage input — read on mount by the Q&A panel
    sessionStorage.setItem("hs_qa_prefill", question);
    window.dispatchEvent(new CustomEvent("hs-qa-prefill", { detail: question }));
    toast.success("Question ready — open the Q&A stage to send it");
  };

  const findings = analysis?.findings ?? [];
  const grouped = ["contradiction", "gap", "red_flag", "unverifiable"]
    .map((type) => ({ type, items: findings.filter((f) => f.finding_type === type) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="mt-6 rounded-none border border-[rgba(0,0,0,0.08)] bg-white p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: "rgba(124,58,237,0.12)" }}>
            <Microscope className="h-4 w-4" style={{ color: "var(--brand)" }} />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900 ">
              AI Analysis{findings.length > 0 ? ` — ${findings.length} finding${findings.length !== 1 ? "s" : ""}` : ""}
            </div>
            <div className="text-xs text-gray-500 ">
              Contradictions, gaps and red flags across every document and claim — not a summary.
            </div>
          </div>
        </div>
        {isInvestor && (
          <button
            onClick={run}
            disabled={running}
            data-testid="run-deep-analysis"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-60"
            style={{ background: "var(--gradient-brand)" }}
          >
            {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Microscope className="h-3.5 w-3.5" />}
            {running ? "Analysing…" : analysis ? "Re-run deep analysis" : "Run deep analysis"}
          </button>
        )}
      </div>

      {!analysis && !running && (
        <p className="mt-3 text-xs text-gray-500 leading-relaxed">
          {isInvestor
            ? "The AI reads the actual document contents and cross-checks them against every stated claim and metric. Findings cite specific evidence and suggest the exact question to ask."
            : "The investor can run a deep AI cross-check of documents against stated claims. Findings appear here for both parties."}
        </p>
      )}

      {analysis && (
        <div className="mt-4 space-y-4">
          <div className="text-[11px] text-gray-500 ">
            {analysis.documents_analysed} document{analysis.documents_analysed !== 1 ? "s" : ""} analysed ·{" "}
            {analysis.claims_checked} claim{analysis.claims_checked !== 1 ? "s" : ""} checked ·{" "}
            {formatDistanceToNow(new Date(analysis.run_at), { addSuffix: true })}
          </div>

          {analysis.no_contradictions_reasoning && (
            <div className="rounded-lg px-3.5 py-3 text-xs leading-relaxed" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)", color: "#10B981" }}>
              <span className="font-semibold">No contradictions found.</span>{" "}
              <span className="text-gray-600 ">{analysis.no_contradictions_reasoning}</span>
            </div>
          )}

          {grouped.map(({ type, items }) => {
            const meta = TYPE_META[type];
            return (
              <div key={type}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: meta.bg, color: meta.color }}>
                    {meta.label} ({items.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {items.map((f, i) => {
                    const id = `${type}-${i}`;
                    const open = openId === id;
                    return (
                      <div key={id} className="rounded-lg border border-[rgba(0,0,0,0.08)] ">
                        <button
                          onClick={() => setOpenId(open ? null : id)}
                          className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: SEVERITY_COLOR[f.severity] ?? "#6B7280" }} title={f.severity} />
                            <span className="text-sm font-medium text-gray-900 truncate">{f.title}</span>
                          </div>
                          {open ? <ChevronUp className="h-4 w-4 text-[#71717A] shrink-0" /> : <ChevronDown className="h-4 w-4 text-[#71717A] shrink-0" />}
                        </button>
                        {open && (
                          <div className="px-3.5 pb-3.5 space-y-2.5 border-t border-[rgba(0,0,0,0.08)] pt-2.5">
                            <div>
                              <div className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">Evidence</div>
                              <div className="text-xs text-gray-700 mt-0.5 leading-relaxed">{f.evidence}</div>
                            </div>
                            <div>
                              <div className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">Question to ask</div>
                              <div className="text-xs text-gray-700 mt-0.5 leading-relaxed">{f.question_to_ask}</div>
                            </div>
                            <div>
                              <div className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">What a good answer includes</div>
                              <div className="text-xs text-gray-700 mt-0.5 leading-relaxed">{f.what_good_looks_like}</div>
                            </div>
                            {isInvestor && (
                              <button
                                onClick={() => askInQa(f.question_to_ask)}
                                className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-foreground hover:opacity-90"
                                style={{ background: "var(--gradient-brand)" }}
                              >
                                <MessageSquarePlus className="h-3 w-3" /> Ask this in Q&A →
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
