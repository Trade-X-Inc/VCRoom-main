import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Brain, FileText, Download } from "lucide-react";

export const Route = createFileRoute("/app/investor/analysis")({
  component: AnalysisPage,
});

function AnalysisPage() {
  const [company, setCompany] = useState("");
  const [memo, setMemo] = useState<null | { sections: { k: string; body: string }[] }>(null);
  const [generating, setGenerating] = useState(false);
  const companies: { id: string; name: string }[] = [];

  const generate = () => {
    setGenerating(true);
    setTimeout(() => {
      setMemo({
        sections: [
          { k: "Executive Summary", body: "Connect a deal room to populate this section automatically." },
          { k: "Team", body: "—" },
          { k: "Product", body: "—" },
          { k: "Market", body: "—" },
          { k: "Traction", body: "—" },
          { k: "Ask", body: "—" },
          { k: "Risks", body: "—" },
        ],
      });
      setGenerating(false);
    }, 900);
  };

  const downloadPdf = () => {
    if (!memo) return;
    const blob = new Blob([memo.sections.map((s) => `# ${s.k}\n\n${s.body}\n`).join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `investment-memo-${company || "company"}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI Analysis</h1>
        <div className="text-sm text-muted-foreground">Automated thesis fit, risks, and investment memo</div>
      </div>

      <div className="mt-5">
        <select value={company} onChange={(e) => setCompany(e.target.value)} className="rounded-[10px] border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50">
          <option value="">Select a company…</option>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {!company ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border/60 bg-card p-12 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <Brain className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Select a company to generate AI analysis</h3>
          <p className="mt-1 text-sm text-muted-foreground">Analysis is generated from data inside the deal room.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          <div className="rounded-2xl border border-border/60 bg-card p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-mesh opacity-[0.06]" />
            <div className="relative">
              <div className="text-xs uppercase tracking-wider text-brand font-medium">Investment thesis match</div>
              <div className="mt-3 flex items-baseline gap-3">
                <span className="text-5xl font-semibold tabular-nums">—</span>
                <span className="text-sm text-muted-foreground">/ 100 · awaiting deal room data</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden"><div className="h-full w-0 bg-gradient-brand" /></div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              { t: "Strengths", c: "text-success" },
              { t: "Risks", c: "text-destructive" },
              { t: "Mitigants", c: "text-brand" },
            ].map((b) => (
              <div key={b.t} className="rounded-2xl border border-border/60 bg-card p-5">
                <div className={`text-sm font-semibold ${b.c}`}>{b.t}</div>
                <div className="mt-3 text-sm text-muted-foreground">No data yet.</div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-5">
            <div className="text-sm font-semibold">Diligence gaps</div>
            <div className="mt-3 grid md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Missing from data room</div>
                <div className="text-sm text-muted-foreground">No gaps identified.</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Unanswered questions</div>
                <div className="text-sm text-muted-foreground">No open questions.</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold inline-flex items-center gap-2"><FileText className="h-4 w-4 text-brand" /> Investment memo</div>
              <div className="flex gap-2">
                <button onClick={generate} disabled={generating} className="rounded-[10px] bg-gradient-brand text-brand-foreground px-3 py-1.5 text-xs shadow-glow disabled:opacity-60">{generating ? "Generating…" : memo ? "Regenerate" : "Generate"}</button>
                {memo && <button onClick={downloadPdf} className="inline-flex items-center gap-1 rounded-[10px] border border-border/60 px-3 py-1.5 text-xs hover:bg-accent"><Download className="h-3.5 w-3.5" /> Download</button>}
              </div>
            </div>
            {memo ? (
              <div className="mt-4 space-y-3">
                {memo.sections.map((s) => (
                  <details key={s.k} className="rounded-[10px] border border-border/60 bg-background/40">
                    <summary className="cursor-pointer list-none px-4 py-2.5 text-sm font-medium">{s.k}</summary>
                    <div className="px-4 pb-3 text-sm text-muted-foreground">{s.body}</div>
                  </details>
                ))}
              </div>
            ) : (
              <div className="mt-4 text-sm text-muted-foreground">Click Generate to draft an investment memo from deal room data.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
