import { Search, Bell, LayoutGrid, Users, FileText, MessageSquare, Sparkles, ChevronRight, TrendingUp, ArrowUpRight } from "lucide-react";

export function AppPreview() {
  return (
    <div className="relative rounded-2xl border border-border/80 bg-card shadow-elev overflow-hidden">
      {/* Window chrome */}
      <div className="flex items-center gap-2 border-b border-border/60 bg-gradient-soft px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-warning/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
        </div>
        <div className="ml-3 flex-1 max-w-md mx-auto">
          <div className="flex items-center gap-2 rounded-md bg-background/60 border border-border/60 px-2.5 py-1 text-xs text-muted-foreground">
            <span className="text-success">●</span> hockystick.app/app
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 min-h-[460px]">
        {/* Sidebar */}
        <aside className="col-span-3 border-r border-border/60 bg-sidebar p-3 hidden md:block">
          <div className="px-2 pb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Workspace</div>
          {[
            { icon: LayoutGrid, label: "Overview", active: true },
            { icon: Users, label: "VC Leads", badge: "128" },
            { icon: FileText, label: "Documents" },
            { icon: MessageSquare, label: "Deal Rooms", badge: "4" },
            { icon: Sparkles, label: "AI Advisor" },
          ].map((i) => (
            <div key={i.label} className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm ${i.active ? "bg-accent text-foreground" : "text-muted-foreground"}`}>
              <i.icon className="h-4 w-4" />
              <span className="flex-1">{i.label}</span>
              {i.badge && <span className="text-[10px] rounded bg-background px-1.5 py-0.5 border border-border/60">{i.badge}</span>}
            </div>
          ))}
        </aside>

        {/* Main */}
        <main className="col-span-12 md:col-span-9 p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">Founder workspace</div>
              <div className="text-lg font-semibold tracking-tight">Series A · Atlas Robotics</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 rounded-md border border-border/60 bg-background px-2.5 py-1 text-xs text-muted-foreground">
                <Search className="h-3.5 w-3.5" /> Search
              </div>
              <div className="grid h-8 w-8 place-items-center rounded-md border border-border/60"><Bell className="h-3.5 w-3.5" /></div>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              { l: "Raised", v: "$3.2M", d: "of $8M", trend: "+12%" },
              { l: "Active VCs", v: "47", d: "in pipeline", trend: "+8" },
              { l: "Deal rooms", v: "4", d: "open", trend: "2 hot" },
            ].map((s) => (
              <div key={s.l} className="rounded-lg border border-border/60 bg-card p-3">
                <div className="text-[11px] text-muted-foreground">{s.l}</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-xl font-semibold">{s.v}</span>
                  <span className="text-[11px] text-success inline-flex items-center"><TrendingUp className="h-3 w-3" />{s.trend}</span>
                </div>
                <div className="text-[11px] text-muted-foreground">{s.d}</div>
              </div>
            ))}
          </div>

          {/* Mini pipeline */}
          <div className="mt-4 rounded-lg border border-border/60 bg-card">
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
              <div className="text-sm font-medium">Pipeline</div>
              <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1">View all <ChevronRight className="h-3 w-3" /></div>
            </div>
            <div className="grid grid-cols-4 gap-2 p-3">
              {[
                { stage: "Contacted", count: 18, color: "bg-muted-foreground/40" },
                { stage: "Replied", count: 9, color: "bg-brand" },
                { stage: "Meeting", count: 5, color: "bg-violet" },
                { stage: "Deal Room", count: 4, color: "bg-success" },
              ].map((c) => (
                <div key={c.stage} className="rounded-md border border-border/60 bg-background/60 p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">{c.stage}</span>
                    <span className={`h-1.5 w-1.5 rounded-full ${c.color}`} />
                  </div>
                  <div className="mt-1 text-base font-semibold">{c.count}</div>
                  <div className="mt-2 space-y-1">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="h-5 rounded bg-muted/60" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI strip */}
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-border/60 bg-gradient-soft p-3">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-gradient-brand text-brand-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-medium">3 warm intros suggested by AI</div>
              <div className="text-[11px] text-muted-foreground">Based on your stage, sector, and recent investor activity</div>
            </div>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </main>
      </div>
    </div>
  );
}
