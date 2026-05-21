import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Brain, Loader2, Download, CheckCircle2, AlertTriangle, Lightbulb, FileText, Copy, Check as CheckIcon, RefreshCw, Save } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { generateDealBrief } from "@/lib/deal-brief-fn";
import { generateInvestorMemo } from "@/lib/investor-memo-fn";
import ReactMarkdown from "react-markdown";

export const Route = createFileRoute("/app/investor/analysis")({
  component: AnalysisPage,
});

function AnalysisPage() {
  const { user } = useAuth();
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [memoText, setMemoText] = useState<string | null>(null);
  const [generatingMemo, setGeneratingMemo] = useState(false);
  const [memoError, setMemoError] = useState("");
  const [copied, setCopied] = useState(false);
  const [savingMemo, setSavingMemo] = useState(false);
  const [memoSaved, setMemoSaved] = useState(false);
  const [memoGeneratedAt, setMemoGeneratedAt] = useState<Date | null>(null);

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

  const handleGenerateMemo = async () => {
    if (!selectedRoomId || !user?.id) return;
    setGeneratingMemo(true);
    setMemoError("");
    try {
      const session = await supabase.auth.getSession();
      const result = await generateInvestorMemo({
        data: {
          dealRoomId: selectedRoomId,
          userId: user.id,
          supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
          supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          userAccessToken: session.data.session?.access_token ?? "",
        },
      });
      setMemoText(result.memo);
      setMemoGeneratedAt(new Date());
      setMemoSaved(false);
    } catch {
      setMemoError("Failed to generate memo. Please try again.");
    } finally {
      setGeneratingMemo(false);
    }
  };

  const handleCopy = async () => {
    if (!memoText) return;
    await navigator.clipboard.writeText(memoText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveMemo = async () => {
    if (!memoText || !selectedRoomId) return;
    setSavingMemo(true);
    try {
      const { error } = await supabase
        .from("deal_rooms")
        .update({ investor_memo: memoText, memo_generated_at: new Date().toISOString() })
        .eq("id", selectedRoomId);
      if (error) throw error;
      setMemoSaved(true);
      setTimeout(() => setMemoSaved(false), 3000);
      toast.success("Memo saved to deal room");
    } catch {
      toast.error("Failed to save memo");
    } finally {
      setSavingMemo(false);
    }
  };

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
            onChange={(e) => { setSelectedRoomId(e.target.value); setMemoText(null); setMemoError(""); }}
            className="rounded-[10px] border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
          >
            <option value="">Select a company to analyse…</option>
            {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        )}
      </div>

      {!selectedRoomId ? (
        <div className="mt-8 space-y-4">
          <div className="rounded-2xl border border-dashed border-border/60 bg-card p-12 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
              <Brain className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">Select a company to generate AI analysis</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
              Analysis is generated from data inside the deal room — pitch deck, documents, and company profile.
            </p>
          </div>
          <div className="rounded-2xl border border-brand/20 bg-brand/5 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="h-4 w-4 text-brand shrink-0" />
              <span className="text-sm font-semibold">How it works</span>
            </div>
            <ol className="space-y-3">
              {[
                { n: "1", title: "Join a deal room", body: "You must be a member of a deal room for a company to appear in the dropdown above." },
                { n: "2", title: "AI reads the deal room", body: "The analysis engine scans the pitch deck, uploaded documents, company profile, and any summaries in the deal room." },
                { n: "3", title: "Thesis match score", body: "You receive a 0–100 match score against your investment thesis, plus a narrative breakdown of strengths, risks, and opportunities." },
                { n: "4", title: "Generate investor memo", body: "Once analysis is complete you can one-click generate a full investment memo — ready to share with your partners." },
              ].map(({ n, title, body }) => (
                <li key={n} className="flex gap-3">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand/15 text-[10px] font-bold text-brand">{n}</span>
                  <div>
                    <div className="text-xs font-semibold">{title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{body}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
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

          {/* Full AI Memo section */}
          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-brand" />
                <span className="text-sm font-semibold">Full Investment Memo</span>
              </div>
              <div className="flex items-center gap-2">
                {memoText && (
                  <>
                    <button
                      onClick={handleCopy}
                      className="inline-flex items-center gap-1.5 rounded-[10px] border border-border/60 px-2.5 py-1.5 text-xs hover:bg-accent"
                    >
                      {copied ? <CheckIcon className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                      {copied ? "Copied" : "Copy memo"}
                    </button>
                    <button
                      onClick={handleSaveMemo}
                      disabled={savingMemo || memoSaved}
                      className="inline-flex items-center gap-1.5 rounded-[10px] border border-border/60 px-2.5 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
                    >
                      {memoSaved ? <CheckIcon className="h-3 w-3 text-success" /> : <Save className="h-3 w-3" />}
                      {memoSaved ? "Saved" : savingMemo ? "Saving…" : "Save memo"}
                    </button>
                    <button
                      onClick={handleGenerateMemo}
                      disabled={generatingMemo}
                      className="inline-flex items-center gap-1.5 rounded-[10px] border border-border/60 px-2.5 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3 w-3 ${generatingMemo ? "animate-spin" : ""}`} />
                      Regenerate
                    </button>
                  </>
                )}
                {!memoText && (
                  <button
                    onClick={handleGenerateMemo}
                    disabled={generatingMemo}
                    className="inline-flex items-center gap-1.5 rounded-[10px] bg-gradient-brand text-brand-foreground px-3 py-1.5 text-xs font-medium shadow-glow disabled:opacity-50"
                  >
                    {generatingMemo ? (
                      <><Loader2 className="h-3 w-3 animate-spin" /> Generating…</>
                    ) : (
                      <><Brain className="h-3 w-3" /> Generate Full Memo</>
                    )}
                  </button>
                )}
              </div>
            </div>

            {memoError && (
              <div className="px-5 py-3 text-sm text-destructive">{memoError}</div>
            )}

            {generatingMemo && !memoText && (
              <div className="p-10 flex flex-col items-center gap-3">
                <Loader2 className="h-7 w-7 animate-spin text-brand" />
                <div className="text-sm text-muted-foreground">Writing investment memo for {selectedName}…</div>
              </div>
            )}

            {memoText && (
              <div>
                <div className="p-6 prose prose-sm prose-neutral dark:prose-invert max-w-none text-sm leading-relaxed">
                  <ReactMarkdown>{memoText}</ReactMarkdown>
                </div>
                {memoGeneratedAt && (
                  <div className="px-6 pb-4 text-[11px] text-muted-foreground border-t border-border/40 pt-3">
                    Generated {memoGeneratedAt.toLocaleString()}
                  </div>
                )}
              </div>
            )}

            {!memoText && !generatingMemo && !memoError && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Click "Generate Full Memo" to produce a structured VC investment memo from deal room data.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
