import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ChevronDown, ChevronUp, Microscope, Loader2, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { LcsButton } from "@/components/lcs";
import type { DDFinding } from "@/lib/dd-fn";

// All 4 finding types are adverse (none is a "good" finding) — same
// reasoning already applied to this file's Strengths/Risks/Flags block
// (diligence.tsx): no forced positive tone, distinguished by label text
// only, no third negative tier in the closed vocabulary.
const TYPE_META: Record<string, { label: string }> = {
  contradiction: { label: "Contradictions" },
  gap: { label: "Gaps" },
  red_flag: { label: "Red flags" },
  unverifiable: { label: "Unverifiable" },
};

// Genuine 3-state severity signal, no forced adverse — critical/significant
// both attention (no red, amber covers errors too, no third negative tier),
// minor stays neutral muted text.
const SEVERITY_TONE: Record<string, string> = {
  critical: "var(--lcs-attention)",
  significant: "var(--lcs-attention)",
  minor: "var(--lcs-ink-muted)",
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
    <div className="mt-6 border p-5" style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-white)" }}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center" style={{ background: "var(--lcs-surface)", borderRadius: "var(--radius-lcs-control)" }}>
            <Microscope className="h-4 w-4" style={{ color: "var(--lcs-accent)" }} />
          </div>
          <div>
            <div className="text-sm font-semibold" style={{ color: "var(--lcs-ink)" }}>
              AI Analysis{findings.length > 0 ? ` — ${findings.length} finding${findings.length !== 1 ? "s" : ""}` : ""}
            </div>
            <div className="text-xs" style={{ color: "var(--lcs-ink-muted)" }}>
              Contradictions, gaps and red flags across every document and claim — not a summary.
            </div>
          </div>
        </div>
        {isInvestor && (
          <LcsButton variant="primary" onClick={run} disabled={running} data-testid="run-deep-analysis">
            {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Microscope className="h-3.5 w-3.5" />}
            {running ? "Analysing…" : analysis ? "Re-run deep analysis" : "Run deep analysis"}
          </LcsButton>
        )}
      </div>

      {!analysis && !running && (
        <p className="mt-3 text-xs leading-relaxed" style={{ color: "var(--lcs-ink-muted)" }}>
          {isInvestor
            ? "The AI reads the actual document contents and cross-checks them against every stated claim and metric. Findings cite specific evidence and suggest the exact question to ask."
            : "The investor can run a deep AI cross-check of documents against stated claims. Findings appear here for both parties."}
        </p>
      )}

      {analysis && (
        <div className="mt-4 space-y-4">
          <div className="text-[11px]" style={{ color: "var(--lcs-ink-muted)" }}>
            {analysis.documents_analysed} document{analysis.documents_analysed !== 1 ? "s" : ""} analysed ·{" "}
            {analysis.claims_checked} claim{analysis.claims_checked !== 1 ? "s" : ""} checked ·{" "}
            {formatDistanceToNow(new Date(analysis.run_at), { addSuffix: true })}
          </div>

          {analysis.no_contradictions_reasoning && (
            <div className="px-3.5 py-3 text-xs leading-relaxed" style={{ background: "var(--lcs-satisfied-wash)", border: "1px solid var(--lcs-satisfied)", color: "var(--lcs-satisfied)" }}>
              <span className="font-semibold">No contradictions found.</span>{" "}
              <span style={{ color: "var(--lcs-ink-muted)" }}>{analysis.no_contradictions_reasoning}</span>
            </div>
          )}

          {grouped.map(({ type, items }) => {
            const meta = TYPE_META[type];
            return (
              <div key={type}>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5"
                    style={{ background: "var(--lcs-attention-wash)", color: "var(--lcs-attention)", borderRadius: "var(--radius-lcs-control)" }}
                  >
                    {meta.label} ({items.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {items.map((f, i) => {
                    const id = `${type}-${i}`;
                    const open = openId === id;
                    return (
                      <div key={id} className="border" style={{ borderColor: "var(--lcs-line)" }}>
                        <button
                          onClick={() => setOpenId(open ? null : id)}
                          className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: SEVERITY_TONE[f.severity] ?? "var(--lcs-ink-muted)" }} title={f.severity} />
                            <span className="text-sm font-medium truncate" style={{ color: "var(--lcs-ink)" }}>{f.title}</span>
                          </div>
                          {open ? <ChevronUp className="h-4 w-4 shrink-0" style={{ color: "var(--lcs-ink-muted)" }} /> : <ChevronDown className="h-4 w-4 shrink-0" style={{ color: "var(--lcs-ink-muted)" }} />}
                        </button>
                        {open && (
                          <div className="px-3.5 pb-3.5 space-y-2.5 border-t pt-2.5" style={{ borderColor: "var(--lcs-line)" }}>
                            <div>
                              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--lcs-ink-muted)" }}>Evidence</div>
                              <div className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--lcs-ink)" }}>{f.evidence}</div>
                            </div>
                            <div>
                              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--lcs-ink-muted)" }}>Question to ask</div>
                              <div className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--lcs-ink)" }}>{f.question_to_ask}</div>
                            </div>
                            <div>
                              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--lcs-ink-muted)" }}>What a good answer includes</div>
                              <div className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--lcs-ink)" }}>{f.what_good_looks_like}</div>
                            </div>
                            {isInvestor && (
                              <LcsButton variant="secondary" onClick={() => askInQa(f.question_to_ask)}>
                                <MessageSquarePlus className="h-3 w-3" /> Ask this in Q&A →
                              </LcsButton>
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
