import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Brain, Loader2, Download, CheckCircle2, AlertTriangle, Lightbulb } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { generateDealBrief } from "@/lib/deal-brief-fn";

export const Route = createFileRoute("/app/investor/analysis")({
  component: AnalysisPage,
});

function AnalysisPage() {
  const { user } = useAuth();
  const [selectedRoomId, setSelectedRoomId] = useState("");

  // Fetch deal rooms user belongs to
  const { data: rooms = [], isLoading: roomsLoading } = useQuery({
    queryKey: ["investor-analysis-rooms", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_room_members")
        .select("deal_room_id, deal_rooms(id, startups(company_name))")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? [])
        .map((r: any) => ({
          id: r.deal_room_id,
          name: r.deal_rooms?.startups?.company_name ?? r.deal_room_id,
        }))
        .filter((r) => !!r.id);
    },
  });

  // Generate deal brief when a room is selected
  const { data: brief, isLoading: briefLoading, isError: briefError } = useQuery({
    queryKey: ["ai-brief-analysis", selectedRoomId, user?.id],
    enabled: !!selectedRoomId && !!user?.id,
    staleTime: 30 * 60 * 1000,
    queryFn: async () => generateDealBrief({ data: { dealRoomId: selectedRoomId, userId: user!.id } }),
  });

  const selectedName = rooms.find((r) => r.id === selectedRoomId)?.name ?? "Company";

  const downloadMemo = () => {
    if (!brief) return;
    const text = [
      `Investment Memo — ${selectedName}`,
      `Thesis Match: ${brief.matchScore ?? "—"}/100`,
      "",
      "STRENGTHS",
      ...(brief.strengths ?? []).map((s: string) => `• ${s}`),
      "",
      "RISKS",
      ...(brief.risks ?? []).map((r: string) => `• ${r}`),
      "",
      "MITIGANTS",
      ...(brief.mitigants ?? []).map((m: string) => `• ${m}`),
      "",
      "NEXT ACTION",
      brief.nextAction ?? "—",
    ].join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `investment-memo-${selectedName.toLowerCase().replace(/\s+/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI Analysis</h1>
        <div className="text-sm text-muted-foreground">Thesis fit, risks, and investment memo — generated from deal room data</div>
      </div>

      <div className="mt-5">
        {roomsLoading ? (
          <div className="h-9 w-48 rounded-[10px] bg-muted animate-pulse" />
        ) : (
          <select
            value={selectedRoomId}
            onChange={(e) => setSelectedRoomId(e.target.value)}
            className="rounded-[10px] border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
          >
            <option value="">Select a company to analyse…</option>
            {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        )}
      </div>

      {!selectedRoomId ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border/60 bg-card p-12 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <Brain className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Select a company to generate AI analysis</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
            Analysis is generated from data inside the deal room — pitch deck, documents, and company profile.
          </p>
        </div>
      ) : briefLoading ? (
        <div className="mt-8 rounded-2xl border border-border/60 bg-card p-12 flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
          <div className="text-sm text-muted-foreground">Generating AI analysis for {selectedName}…</div>
        </div>
      ) : briefError ? (
        <div className="mt-8 rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center text-sm text-muted-foreground">
          Could not generate analysis. Please try again.
        </div>
      ) : brief ? (
        <div className="mt-6 space-y-5">
          {/* Thesis match score */}
          <div className="rounded-2xl border border-border/60 bg-card p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-mesh opacity-[0.06]" />
            <div className="relative">
              <div className="text-xs uppercase tracking-wider text-brand font-medium">Investment thesis match</div>
              <div className="mt-3 flex items-baseline gap-3">
                <span className="text-5xl font-semibold tabular-nums">{brief.matchScore ?? "—"}</span>
                <span className="text-sm text-muted-foreground">/ 100</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-brand transition-all"
                  style={{ width: `${Math.min(100, brief.matchScore ?? 0)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Strengths / Risks / Mitigants */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-border/60 bg-card p-5">
              <div className="flex items-center gap-2 text-success text-sm font-semibold mb-3">
                <CheckCircle2 className="h-4 w-4" /> Strengths
              </div>
              {(brief.strengths ?? []).length === 0 ? (
                <div className="text-sm text-muted-foreground">No data.</div>
              ) : (
                <ul className="space-y-2">
                  {(brief.strengths as string[]).map((s, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                      <span className="text-success shrink-0">·</span>{s}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-2xl border border-border/60 bg-card p-5">
              <div className="flex items-center gap-2 text-destructive text-sm font-semibold mb-3">
                <AlertTriangle className="h-4 w-4" /> Risks
              </div>
              {(brief.risks ?? []).length === 0 ? (
                <div className="text-sm text-muted-foreground">No data.</div>
              ) : (
                <ul className="space-y-2">
                  {(brief.risks as string[]).map((r, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                      <span className="text-destructive shrink-0">·</span>{r}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-2xl border border-border/60 bg-card p-5">
              <div className="flex items-center gap-2 text-brand text-sm font-semibold mb-3">
                <Lightbulb className="h-4 w-4" /> Mitigants
              </div>
              {(brief.mitigants ?? []).length === 0 ? (
                <div className="text-sm text-muted-foreground">No data.</div>
              ) : (
                <ul className="space-y-2">
                  {(brief.mitigants as string[]).map((m, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                      <span className="text-brand shrink-0">·</span>{m}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Next action + download */}
          {brief.nextAction && (
            <div className="rounded-2xl border border-border/60 bg-card p-5">
              <div className="text-sm font-semibold mb-2">Recommended next action</div>
              <p className="text-sm text-muted-foreground">{brief.nextAction}</p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={downloadMemo}
              className="inline-flex items-center gap-1.5 rounded-[10px] border border-border/60 px-3 py-1.5 text-sm hover:bg-accent"
            >
              <Download className="h-3.5 w-3.5" /> Download memo
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
