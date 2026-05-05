import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

type AuditSeverity = "info" | "warn" | "critical";
interface AuditEntry {
  id: string;
  actor: string;
  initials: string;
  action: string;
  target: string;
  category: "Auth" | "Document" | "Deal Room" | "Invite" | "Settings" | "AI";
  ip: string;
  time: string;
  severity: AuditSeverity;
}

const auditLog: AuditEntry[] = [];
import { ShieldCheck, Search, Download, AlertTriangle, Activity } from "lucide-react";

export const Route = createFileRoute("/app/audit")({
  component: AuditPage,
});

const cats = ["All", "Auth", "Document", "Deal Room", "Invite", "Settings", "AI"] as const;

const sevTint = (s: AuditEntry["severity"]) => s === "critical" ? "bg-destructive/10 text-destructive border-destructive/20" : s === "warn" ? "bg-warning/10 text-warning border-warning/20" : "bg-muted text-muted-foreground border-border/60";
const catDot = (c: AuditEntry["category"]) => ({ Auth: "bg-foreground/40", Document: "bg-brand", "Deal Room": "bg-success", Invite: "bg-warning", Settings: "bg-muted-foreground/50", AI: "bg-violet" }[c]);

function AuditPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<typeof cats[number]>("All");

  const list = useMemo(() => {
    let xs = auditLog;
    if (cat !== "All") xs = xs.filter((e) => e.category === cat);
    if (q) xs = xs.filter((e) => (e.actor + e.action + e.target + e.ip).toLowerCase().includes(q.toLowerCase()));
    return xs;
  }, [q, cat]);

  const critical = auditLog.filter((e) => e.severity === "critical").length;

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand" />
            <h1 className="text-2xl font-semibold tracking-tight">Activity audit log</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Immutable record of every action taken across your workspace and deal rooms.</p>
        </div>
        <button className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ["Total events", auditLog.length.toString(), Activity, "text-foreground"],
          ["Last 24h", "9", Activity, "text-foreground"],
          ["Sign-ins", auditLog.filter((e) => e.category === "Auth").length.toString(), ShieldCheck, "text-brand"],
          ["Critical", critical.toString(), AlertTriangle, critical ? "text-destructive" : "text-muted-foreground"],
        ].map(([l, v, I, c]: any) => (
          <div key={l} className="rounded-xl border border-border/60 bg-card p-4 shadow-card">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">{l}</div>
              <I className={`h-3.5 w-3.5 ${c}`} />
            </div>
            <div className={`mt-1 text-xl font-semibold tabular-nums ${c}`}>{v}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by user, action, IP…" className="w-full rounded-md border border-border/60 bg-background pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-brand/50" />
        </div>
        <div className="flex flex-wrap gap-1">
          {cats.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`rounded-full px-3 py-1.5 text-xs transition-colors ${cat === c ? "bg-foreground text-background" : "border border-border/60 hover:bg-accent"}`}>{c}</button>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-border/60 bg-card shadow-card overflow-hidden">
        <div className="grid grid-cols-[1fr_1.6fr_1fr_140px_120px] gap-4 px-5 py-2.5 border-b border-border/60 bg-accent/30 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          <div>Actor</div>
          <div>Action</div>
          <div>Category</div>
          <div>IP address</div>
          <div className="text-right">When</div>
        </div>
        <div className="divide-y divide-border/60">
          {list.map((e) => (
            <div key={e.id} className="grid grid-cols-[1fr_1.6fr_1fr_140px_120px] gap-4 px-5 py-3.5 items-center text-sm hover:bg-accent/40">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="grid h-7 w-7 place-items-center rounded-full bg-accent text-[10px] font-semibold shrink-0">{e.initials}</div>
                <div className="truncate font-medium">{e.actor}</div>
              </div>
              <div className="min-w-0">
                <div className="font-medium">{e.action}</div>
                <div className="text-xs text-muted-foreground truncate">{e.target}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${catDot(e.category)}`} />
                <span className="text-xs">{e.category}</span>
                {e.severity !== "info" && (
                  <span className={`text-[10px] rounded-full px-1.5 py-0.5 font-medium border ${sevTint(e.severity)}`}>{e.severity === "critical" ? "Critical" : "Warn"}</span>
                )}
              </div>
              <div className="text-xs text-muted-foreground tabular-nums truncate">{e.ip}</div>
              <div className="text-xs text-muted-foreground text-right tabular-nums">{e.time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
