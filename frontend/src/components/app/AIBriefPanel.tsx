import { Brain, X, ArrowRight, CheckCircle2, AlertTriangle, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AIBriefData {
  company: string;
  tagline?: string;
  thesisMatch: number; // 0-100
  strengths: string[];
  risks: string[];
  mitigants: string[];
  nextAction: string;
  dealRoomId?: string;
}

export function AIBriefPanel({ data, onClose, onOpenDealRoom }: { data: AIBriefData | null; onClose: () => void; onOpenDealRoom?: () => void }) {
  if (!data) return null;
  const score = data.thesisMatch;
  const scoreColor = score >= 80 ? "text-success" : score >= 60 ? "text-warning" : "text-destructive";
  const scoreBg = score >= 80 ? "bg-success/10" : score >= 60 ? "bg-warning/10" : "bg-destructive/10";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <aside className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[400px] bg-background border-l border-border/60 shadow-elev flex flex-col">
        <div className="p-5 border-b border-border/60 flex items-start gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-brand text-brand-foreground">
            <Brain className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold">AI Brief</h2>
            <div className="text-xs text-muted-foreground truncate">{data.company}{data.tagline ? ` · ${data.tagline}` : ""}</div>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className={cn("rounded-2xl p-4 flex items-center gap-4", scoreBg)}>
            <div className={cn("text-3xl font-semibold tabular-nums", scoreColor)}>{score}</div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Thesis match score</div>
              <div className="text-xs mt-0.5">{score >= 80 ? "Strong fit with your thesis." : score >= 60 ? "Partial fit — worth a closer look." : "Limited fit with your current thesis."}</div>
            </div>
          </div>

          <Section icon={CheckCircle2} title="Strengths" tone="text-success" items={data.strengths} />
          <Section icon={AlertTriangle} title="Risks" tone="text-destructive" items={data.risks} />
          <Section icon={Shield} title="Mitigants" tone="text-brand" items={data.mitigants} />

          <div className="rounded-2xl border border-border/60 bg-accent/30 p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Suggested next action</div>
            <div className="mt-1 text-sm">{data.nextAction}</div>
          </div>
        </div>

        <div className="border-t border-border/60 p-4">
          <button onClick={onOpenDealRoom} className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-brand text-brand-foreground px-4 py-2.5 text-sm shadow-glow">
            Open full deal room <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </aside>
    </>
  );
}

function Section({ icon: Icon, title, tone, items }: { icon: any; title: string; tone: string; items: string[] }) {
  return (
    <div>
      <div className={cn("flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold mb-2", tone)}>
        <Icon className="h-3.5 w-3.5" /> {title}
      </div>
      <ul className="space-y-1.5">
        {items.map((s, i) => (
          <li key={i} className="text-sm flex gap-2"><span className={cn("mt-2 h-1 w-1 rounded-full shrink-0", tone.replace("text-", "bg-"))} /><span>{s}</span></li>
        ))}
      </ul>
    </div>
  );
}
