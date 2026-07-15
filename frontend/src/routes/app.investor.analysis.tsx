import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Brain, Loader2, Download, CheckCircle2, AlertTriangle, Lightbulb,
  FileText, Copy, Check as CheckIcon, RefreshCw, Save, Globe, Tag,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { secureAICall } from "@/lib/ai-secure-fn";
import { PageGuide } from "@/components/app/PageGuide";
import { generateInvestorMemo } from "@/lib/investor-memo-fn";
import { useTimedAI, AITimeoutError, AI_TIMEOUT_MESSAGE } from "@/hooks/useTimedAI";
import { Markdown } from "@/components/shared/LazyMarkdown";
import { EmptyState } from "@/components/system";

export const Route = createFileRoute("/app/investor/analysis")({
  component: AnalysisPage,
});

export function AnalysisPage() {
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState("");
  const [analysis, setAnalysis] = useState<any | null>(null);
  const { isWorking: generating, stillWorking: analysisStillWorking, run: runAnalysis } = useTimedAI();
  const [analysisError, setAnalysisError] = useState("");
  const [memoText, setMemoText] = useState<string | null>(null);
  const { isWorking: generatingMemo, stillWorking: memoStillWorking, run: runMemo } = useTimedAI();
  const [memoError, setMemoError] = useState("");
  const [copied, setCopied] = useState(false);
  const [savingMemo, setSavingMemo] = useState(false);
  const [memoSaved, setMemoSaved] = useState(false);
  const [memoGeneratedAt, setMemoGeneratedAt] = useState<Date | null>(null);

  // Full watchlist items
  const { data: watchlist = [], isLoading: watchlistLoading } = useQuery({
    queryKey: ["investor-watchlist-analysis", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("investor_watchlist")
        .select("*")
        .eq("investor_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // Investor thesis for analysis context
  const { data: investorProfile } = useQuery({
    queryKey: ["investor-profile-analysis", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("investor_profiles")
        .select("thesis, preferred_stages, preferred_sectors, min_ticket, max_ticket")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  // Deal room membership — needed for memo generation only
  const { data: memberRooms = [] } = useQuery({
    queryKey: ["investor-rooms", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_room_members")
        .select("deal_room_id, deal_rooms(startup_id)")
        .eq("user_id", user!.id);
      return data ?? [];
    },
  });

  const getDealRoomId = (id: string) => {
    const match = (memberRooms as any[]).find((m: any) => (m.deal_rooms as any)?.startup_id === id);
    return match?.deal_room_id ?? null;
  };
  const activeDealRoomId = getDealRoomId(selectedId);

  const selectedCompany = (watchlist as any[]).find((w: any) => w.id === selectedId);
  const selectedName = selectedCompany?.company_name ?? "Company";

  const handleGenerateAnalysis = async () => {
    if (!selectedCompany || !user?.id) return;
    setAnalysisError("");
    setAnalysis(null);

    try {
      const thesis = (investorProfile as any)?.thesis ?? "Not specified";

      const systemPrompt =
        "You are an expert VC analyst. Respond ONLY with valid JSON. No markdown, no backticks, no explanation outside the JSON.";

      const userMessage = `Analyze this company for investment potential.

Company: ${selectedCompany.company_name}
Sector: ${selectedCompany.sector || "Not specified"}
Stage: ${selectedCompany.stage || "Not specified"}
Description: ${selectedCompany.description || "Not provided"}
Notes: ${selectedCompany.notes || "None"}

Investor thesis: ${thesis}

Provide:
1. Thesis Match Score (0-100)
2. Top 3 Strengths
3. Top 3 Risks
4. Risk Mitigants
5. Recommended Next Action

Be concise and specific.

Return this exact JSON shape:
{"matchScore":<integer>,"strengths":["...","...","..."],"risks":["...","...","..."],"mitigants":["...","..."],"nextAction":"..."}`;

      const result = await runAnalysis(() => secureAICall({
        data: { userId: user.id, systemPrompt, userMessage, maxTokens: 600 },
      }));

      if (result.error === "usage_limit") {
        setAnalysisError(result.reply);
        return;
      }

      const text = result.reply;
      let parsed: any;
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          parsed = {
            matchScore: 65,
            strengths: [text.slice(0, 200)],
            risks: ["See full analysis above"],
            mitigants: ["Review with your team"],
            nextAction: "Schedule a call with the founder",
          };
        }
      } catch {
        parsed = {
          matchScore: 65,
          strengths: [text],
          risks: [],
          mitigants: [],
          nextAction: "Review the analysis above",
        };
      }
      setAnalysis(parsed);
    } catch (err: any) {
      setAnalysisError(err instanceof AITimeoutError ? AI_TIMEOUT_MESSAGE : (err?.message ?? "Analysis failed. Please try again."));
    }
  };

  const handleGenerateMemo = async () => {
    if (!selectedId || !activeDealRoomId || !user?.id) return;
    setMemoError("");
    try {
      const session = await supabase.auth.getSession();
      const result = await runMemo(() => generateInvestorMemo({
        data: {
          dealRoomId: activeDealRoomId,
          userId: user.id,
          supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
          supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          userAccessToken: session.data.session?.access_token ?? "",
        },
      }));
      setMemoText(result.memo);
      setMemoGeneratedAt(new Date());
      setMemoSaved(false);
    } catch (err) {
      setMemoError(err instanceof AITimeoutError ? AI_TIMEOUT_MESSAGE : "Failed to generate memo. Please try again.");
    }
  };

  const handleCopy = async () => {
    if (!memoText) return;
    await navigator.clipboard.writeText(memoText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveMemo = async () => {
    if (!memoText || !activeDealRoomId) return;
    setSavingMemo(true);
    try {
      const { error } = await supabase
        .from("deal_rooms")
        .update({ investor_memo: memoText, memo_generated_at: new Date().toISOString() })
        .eq("id", activeDealRoomId);
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

  const downloadAnalysis = () => {
    if (!analysis) return;
    const text = [
      `Investment Analysis — ${selectedName}`,
      `Thesis Match: ${analysis.matchScore ?? "—"}/100`,
      "",
      "STRENGTHS",
      ...(analysis.strengths ?? []).map((s: string) => `• ${s}`),
      "",
      "RISKS",
      ...(analysis.risks ?? []).map((r: string) => `• ${r}`),
      "",
      "MITIGANTS",
      ...(analysis.mitigants ?? []).map((m: string) => `• ${m}`),
      "",
      "NEXT ACTION",
      analysis.nextAction ?? "—",
    ].join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analysis-${selectedName.toLowerCase().replace(/\s+/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI Analysis</h1>
          <div className="text-sm text-muted-foreground">
            Thesis fit, risks, and investment memo — generated from your watchlist
          </div>
        </div>
        <PageGuide pageId="investor-analysis" />
      </div>

      {/* Company selector */}
      <div className="mt-5">
        {watchlistLoading ? (
          <div className="h-9 w-48 rounded-[10px] bg-muted animate-pulse" />
        ) : (
          <select
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value);
              setMemoText(null);
              setMemoError("");
              setAnalysis(null);
              setAnalysisError("");
            }}
            className="rounded-[10px] border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
          >
            <option value="">Select a company to analyse…</option>
            {(watchlist as any[]).map((r: any) => (
              <option key={r.id} value={r.id}>{r.company_name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Empty state */}
      {!selectedId && (
        <div className="mt-8 space-y-4">
          <div className="rounded-2xl border border-dashed border-border/60 bg-card p-12 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
              <Brain className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">Select a company to generate AI analysis</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
              Analysis is generated from your watchlist data — no deal room required.
            </p>
          </div>
          <div className="rounded-2xl border border-brand/20 bg-accent p-6">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="h-4 w-4 text-brand shrink-0" />
              <span className="text-sm font-semibold">How it works</span>
            </div>
            <ol className="space-y-3">
              {[
                { n: "1", title: "Select a watchlist company", body: "Any company on your watchlist can be analysed — no deal room required." },
                { n: "2", title: "AI matches against your thesis", body: "The engine scores the company against your investment thesis, preferred stages, and sectors." },
                { n: "3", title: "Get strengths, risks & next steps", body: "You receive a 0–100 match score plus strengths, risks, mitigants, and a recommended next action." },
                { n: "4", title: "Generate full investment memo", body: "If the company has a deal room, you can also generate a full investment memo from deal room documents." },
              ].map(({ n, title, body }) => (
                <li key={n} className="flex gap-3">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent text-[10px] font-bold text-brand">{n}</span>
                  <div>
                    <div className="text-xs font-semibold">{title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{body}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {/* Company selected */}
      {selectedId && (
        <div className="mt-6 space-y-5">
          {/* Company details card + Generate button */}
          {selectedCompany && (
            <div className="rounded-2xl border border-border/60 bg-card p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-lg bg-gradient-brand text-brand-foreground text-lg font-bold shrink-0">
                    {(selectedCompany.company_name ?? "?")[0]}
                  </div>
                  <div>
                    <h2 className="text-base font-semibold">{selectedCompany.company_name}</h2>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                      {selectedCompany.stage && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Tag className="h-3 w-3" /> {selectedCompany.stage}
                        </span>
                      )}
                      {selectedCompany.sector && (
                        <span className="text-xs text-muted-foreground">· {selectedCompany.sector}</span>
                      )}
                      {selectedCompany.website && (
                        <a
                          href={selectedCompany.website.startsWith("http") ? selectedCompany.website : `https://${selectedCompany.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-xs text-brand hover:underline"
                        >
                          <Globe className="h-3 w-3" /> {selectedCompany.website}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleGenerateAnalysis}
                  disabled={generating}
                  className="inline-flex items-center gap-1.5 rounded-[10px] hs-gradient px-4 py-2.5 text-sm font-medium text-white shadow-glow disabled:opacity-50 shrink-0"
                >
                  {generating
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Analysing…</>
                    : <><Brain className="h-4 w-4" /> Generate Analysis</>
                  }
                </button>
              </div>
              {selectedCompany.description && (
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{selectedCompany.description}</p>
              )}
              {selectedCompany.notes && (
                <div className="mt-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Notes: </span>{selectedCompany.notes}
                </div>
              )}
            </div>
          )}

          {/* Generating */}
          {generating && (
            <EmptyState
              kind="loading"
              title="Analysing"
              description={analysisStillWorking ? "Still working" : undefined}
            />
          )}

          {/* Analysis error */}
          {analysisError && !generating && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
              {analysisError}
            </div>
          )}

          {/* Analysis results */}
          {analysis && !generating && (
            <>
              {/* Thesis match score */}
              <div className="rounded-2xl border border-border/60 bg-card p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-mesh opacity-[0.06]" />
                <div className="relative">
                  <div className="text-xs uppercase tracking-wider text-brand font-medium">Investment thesis match</div>
                  <div className="mt-3 flex items-baseline gap-3">
                    <span className="text-5xl font-semibold tabular-nums">{analysis.matchScore ?? "—"}</span>
                    <span className="text-sm text-muted-foreground">/ 100</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-gradient-brand transition-all"
                      style={{ width: `${Math.min(100, analysis.matchScore ?? 0)}%` }}
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
                  {(analysis.strengths ?? []).length === 0 ? (
                    <div className="text-sm text-muted-foreground">No data.</div>
                  ) : (
                    <ul className="space-y-2">
                      {(analysis.strengths as string[]).map((s, i) => (
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
                  {(analysis.risks ?? []).length === 0 ? (
                    <div className="text-sm text-muted-foreground">No data.</div>
                  ) : (
                    <ul className="space-y-2">
                      {(analysis.risks as string[]).map((r, i) => (
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
                  {(analysis.mitigants ?? []).length === 0 ? (
                    <div className="text-sm text-muted-foreground">No data.</div>
                  ) : (
                    <ul className="space-y-2">
                      {(analysis.mitigants as string[]).map((m, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex gap-2">
                          <span className="text-brand shrink-0">·</span>{m}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {analysis.nextAction && (
                <div className="rounded-2xl border border-border/60 bg-card p-5">
                  <div className="text-sm font-semibold mb-2">Recommended next action</div>
                  <p className="text-sm text-muted-foreground">{analysis.nextAction}</p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  onClick={handleGenerateAnalysis}
                  disabled={generating}
                  className="inline-flex items-center gap-1.5 rounded-[10px] border border-border/60 px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Re-analyse
                </button>
                <button
                  onClick={downloadAnalysis}
                  className="inline-flex items-center gap-1.5 rounded-[10px] border border-border/60 px-3 py-1.5 text-sm hover:bg-accent"
                >
                  <Download className="h-3.5 w-3.5" /> Download analysis
                </button>
              </div>
            </>
          )}

          {/* Full Investment Memo — only available if deal room exists */}
          {activeDealRoomId && (
            <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-brand" />
                  <span className="text-sm font-semibold">Full Investment Memo</span>
                  <span className="text-xs text-muted-foreground">(from deal room documents)</span>
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
                      {generatingMemo
                        ? <><Loader2 className="h-3 w-3 animate-spin" /> Generating…</>
                        : <><Brain className="h-3 w-3" /> Generate Full Memo</>
                      }
                    </button>
                  )}
                </div>
              </div>

              {memoError && (
                <div className="px-5 py-3 text-sm text-destructive">{memoError}</div>
              )}
              {generatingMemo && !memoText && (
                <EmptyState
                  kind="loading"
                  title="Writing memo"
                  description={memoStillWorking ? "Still working" : undefined}
                />
              )}
              {memoText && (
                <div>
                  <div className="p-6 prose prose-sm prose-neutral max-w-none text-sm leading-relaxed">
                    <Markdown>{memoText}</Markdown>
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
                  Click "Generate Full Memo" to produce a structured VC investment memo from deal room documents.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
