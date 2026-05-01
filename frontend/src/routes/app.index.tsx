import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, TrendingUp, Users, Briefcase, Mail, Sparkles, Calendar, FileText, CheckCircle2, Clock } from "lucide-react";

export const Route = createFileRoute("/app/")({
  component: Overview,
});

function Stat({ label, value, sub, trend, accent }: { label: string; value: string; sub: string; trend?: string; accent?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-xl border border-border/60 bg-card p-5 shadow-card ${accent ? "" : ""}`}>
      {accent && <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-brand opacity-20 blur-2xl" />}
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight">{value}</span>
        {trend && <span className="text-xs text-success inline-flex items-center gap-0.5"><TrendingUp className="h-3 w-3" /> {trend}</span>}
      </div>
      <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
    </div>
  );
}

function Overview() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs text-muted-foreground">Good morning, Jordan</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Atlas Robotics — Series A</h1>
        </div>
        <div className="flex gap-2">
          <Link to="/app/email" className="rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent inline-flex items-center gap-1.5"><Mail className="h-4 w-4" /> Compose</Link>
          <Link to="/app/leads" className="rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow inline-flex items-center gap-1.5">Add lead <ArrowUpRight className="h-3.5 w-3.5" /></Link>
        </div>
      </div>

      {/* Raise progress */}
      <div className="mt-6 rounded-2xl border border-border/60 bg-card p-6 shadow-card relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-mesh opacity-[0.05]" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs text-muted-foreground">Round progress</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-semibold tracking-tight">$3.2M</span>
              <span className="text-sm text-muted-foreground">of $8M target</span>
            </div>
          </div>
          <div className="flex gap-6 text-sm">
            <div><div className="text-xs text-muted-foreground">Soft circled</div><div className="font-medium">$1.4M</div></div>
            <div><div className="text-xs text-muted-foreground">Lead</div><div className="font-medium">In diligence</div></div>
            <div><div className="text-xs text-muted-foreground">Close</div><div className="font-medium">~6 weeks</div></div>
          </div>
        </div>
        <div className="relative mt-5 h-2.5 rounded-full bg-muted overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-[40%] bg-gradient-brand rounded-full" />
          <div className="absolute inset-y-0 left-[40%] w-[18%] bg-brand/30" />
        </div>
        <div className="relative mt-2 flex justify-between text-[11px] text-muted-foreground">
          <span>$0</span><span>$2M</span><span>$4M</span><span>$6M</span><span>$8M</span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Active VCs" value="47" sub="in pipeline" trend="+8 this week" accent />
        <Stat label="Reply rate" value="34%" sub="vs 22% benchmark" trend="+5%" />
        <Stat label="Meetings" value="18" sub="scheduled" />
        <Stat label="Deal rooms" value="4" sub="2 hot" />
      </div>

      <div className="mt-6 grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-border/60 bg-card shadow-card">
          <div className="flex items-center justify-between p-5 border-b border-border/60">
            <div>
              <div className="text-sm font-semibold">Pipeline at a glance</div>
              <div className="text-xs text-muted-foreground">Last 30 days</div>
            </div>
            <Link to="/app/leads" className="text-xs text-brand inline-flex items-center gap-1">Open pipeline <ArrowUpRight className="h-3 w-3" /></Link>
          </div>
          <div className="p-5 grid grid-cols-7 gap-2">
            {[
              ["New", 12, "bg-muted-foreground/40"],
              ["Contact", 18, "bg-foreground/40"],
              ["Replied", 9, "bg-brand"],
              ["Meeting", 5, "bg-violet"],
              ["Interest", 3, "bg-warning"],
              ["DR", 4, "bg-success"],
              ["Pass", 7, "bg-destructive/60"],
            ].map(([l, n, c]) => (
              <div key={l as string} className="rounded-lg border border-border/60 bg-background/40 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground truncate">{l as string}</span>
                  <span className={`h-1.5 w-1.5 rounded-full ${c as string}`} />
                </div>
                <div className="mt-1 text-lg font-semibold">{n as number}</div>
                <div className={`mt-2 h-1 rounded-full ${c as string} opacity-50`} style={{ width: `${Math.min(100, (n as number) * 8)}%` }} />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card shadow-card overflow-hidden">
          <div className="p-5 border-b border-border/60 flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-brand text-brand-foreground"><Sparkles className="h-3.5 w-3.5" /></div>
            <div>
              <div className="text-sm font-semibold">AI Advisor</div>
              <div className="text-xs text-muted-foreground">3 actions for you</div>
            </div>
          </div>
          <div className="p-3 space-y-2">
            {[
              { t: "Follow up with Marcus Vale (a16z)", d: "Replied 4 days ago, no follow-up sent" },
              { t: "Send weekly update", d: "8 investors expecting it" },
              { t: "Add cap table v2", d: "Sara Khan (NEA) requested it" },
            ].map((a) => (
              <div key={a.t} className="rounded-lg border border-border/60 bg-background/40 p-3 hover:bg-accent transition-colors cursor-pointer">
                <div className="text-sm font-medium">{a.t}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{a.d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/60 bg-card shadow-card">
          <div className="p-5 border-b border-border/60 flex items-center justify-between">
            <div className="text-sm font-semibold">Recent activity</div>
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
          <div className="divide-y divide-border/60">
            {[
              { i: CheckCircle2, c: "text-success", t: "Sara Khan (NEA) signed NDA", s: "2m ago" },
              { i: FileText, c: "text-brand", t: "Marcus Vale viewed pitch deck v3", s: "12m ago" },
              { i: Mail, c: "text-violet", t: "Reply from Hana Ito (Index)", s: "1h ago" },
              { i: Calendar, c: "text-warning", t: "Meeting scheduled with Greylock", s: "3h ago" },
              { i: Briefcase, c: "text-success", t: "Deal room opened for Lightspeed", s: "1d ago" },
            ].map((a) => (
              <div key={a.t} className="flex items-center gap-3 px-5 py-3">
                <a.i className={`h-4 w-4 ${a.c}`} />
                <div className="flex-1 text-sm">{a.t}</div>
                <div className="text-xs text-muted-foreground inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {a.s}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card shadow-card">
          <div className="p-5 border-b border-border/60 flex items-center justify-between">
            <div className="text-sm font-semibold">Hot deal rooms</div>
            <Link to={"/app/deal-rooms" as any} className="text-xs text-brand">View all</Link>
          </div>
          <div className="divide-y divide-border/60">
            {[
              { n: "NEA", s: "Diligence", p: 78, st: "success" },
              { n: "Kleiner Perkins", s: "Q&A", p: 52, st: "warning" },
              { n: "Lightspeed", s: "Onboarding", p: 18, st: "brand" },
              { n: "Bessemer", s: "Decision", p: 92, st: "success" },
            ].map((r) => (
              <Link to={"/app/deal-room/dr_001" as any} key={r.n} className="flex items-center gap-3 px-5 py-3 hover:bg-accent/40">
                <div className="grid h-9 w-9 place-items-center rounded-md bg-gradient-soft text-xs font-semibold border border-border/60">{r.n.split(" ").map(s => s[0]).join("").slice(0,2)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{r.n}</div>
                  <div className="text-xs text-muted-foreground">{r.s}</div>
                </div>
                <div className="w-20">
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full bg-${r.st === "success" ? "success" : r.st === "warning" ? "warning" : "brand"}`} style={{ width: `${r.p}%` }} />
                  </div>
                  <div className="text-[10px] text-muted-foreground text-right mt-0.5">{r.p}%</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
