import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { ClipboardCheck, ExternalLink, Loader2, Flag, Clock, Eye, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/app/investor/diligence")({
  component: DiligencePage,
});

const CATEGORIES = ["Financials", "Team", "Legal", "Market", "Product", "References"] as const;
type DDCategory = (typeof CATEGORIES)[number];
const STATUSES = ["Pending", "In Review", "Complete", "Red Flag"] as const;
type DDStatus = (typeof STATUSES)[number];

const STATUS_CONFIG: Record<DDStatus, { icon: any; cls: string; short: string }> = {
  "Pending":   { icon: Clock,        cls: "bg-muted text-muted-foreground",     short: "–" },
  "In Review": { icon: Eye,          cls: "bg-brand/10 text-brand",             short: "IR" },
  "Complete":  { icon: CheckCircle2, cls: "bg-success/10 text-success",         short: "✓" },
  "Red Flag":  { icon: Flag,         cls: "bg-destructive/10 text-destructive", short: "!" },
};

function DiligencePage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";

  // Fetch all deal rooms the investor is a member of
  const { data: rooms = [], isLoading: roomsLoading } = useQuery({
    queryKey: ["investor-dd-portfolio", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_room_members")
        .select("deal_room_id, deal_rooms(id, startups(company_name, stage, sector))")
        .eq("user_id", userId);
      return (data ?? []).map((r: any) => ({
        id: r.deal_room_id,
        name: r.deal_rooms?.startups?.company_name ?? "Unknown",
        stage: r.deal_rooms?.startups?.stage ?? "",
        sector: r.deal_rooms?.startups?.sector ?? "",
      }));
    },
  });

  const roomIds = rooms.map((r) => r.id);

  // Fetch all DD categories for all rooms at once
  const { data: allCategories = [], isLoading: catsLoading } = useQuery({
    queryKey: ["portfolio-dd-categories", roomIds],
    enabled: roomIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("dd_categories")
        .select("deal_room_id, category, status")
        .in("deal_room_id", roomIds);
      return data ?? [];
    },
  });

  // Fetch all checklist items for progress bars
  const { data: allItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["portfolio-dd-items", roomIds],
    enabled: roomIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("dd_checklist_items")
        .select("deal_room_id, checked")
        .in("deal_room_id", roomIds);
      return data ?? [];
    },
  });

  const isLoading = roomsLoading || catsLoading || itemsLoading;

  const getCatStatus = (roomId: string, cat: DDCategory): DDStatus => {
    const row = allCategories.find((c: any) => c.deal_room_id === roomId && c.category === cat);
    return (row?.status as DDStatus) ?? "Pending";
  };

  const getProgress = (roomId: string) => {
    const items = allItems.filter((i: any) => i.deal_room_id === roomId);
    if (!items.length) return { done: 0, total: 0, pct: 0 };
    const done = items.filter((i: any) => i.checked).length;
    return { done, total: items.length, pct: Math.round((done / items.length) * 100) };
  };

  const getOverallStatus = (roomId: string): DDStatus => {
    const cats = CATEGORIES.map((c) => getCatStatus(roomId, c));
    if (cats.some((s) => s === "Red Flag")) return "Red Flag";
    if (cats.every((s) => s === "Complete")) return "Complete";
    if (cats.some((s) => s === "In Review" || s === "Complete")) return "In Review";
    return "Pending";
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3 mb-1">
        <ClipboardCheck className="h-5 w-5 text-brand" />
        <h1 className="text-2xl font-semibold tracking-tight">Due Diligence</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Portfolio overview — DD status across all active deals
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading portfolio…
        </div>
      ) : rooms.length === 0 ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-dashed border-border/60 bg-card p-16 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground mb-4">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold">No active deals yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Join deal rooms to start tracking due diligence.
            </p>
          </div>
          <div className="rounded-2xl border border-brand/20 bg-brand/5 p-6">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardCheck className="h-4 w-4 text-brand shrink-0" />
              <span className="text-sm font-semibold">How it works</span>
            </div>
            <ol className="space-y-3">
              {[
                { n: "1", title: "Get invited to a deal room", body: "Founders share a deal room link with you. Once you accept, the company appears in this portfolio view." },
                { n: "2", title: "Review the DD checklist", body: "Inside each deal room, open the Checklist tab. You'll find 6 categories (Financials, Team, Legal, Market, Product, References) pre-loaded with standard items." },
                { n: "3", title: "Track progress & add notes", body: "Check off items as you review them, set category statuses (Pending → In Review → Complete), and add private investor notes per category." },
                { n: "4", title: "Monitor your portfolio here", body: "This page gives you a live snapshot of DD progress across all your active deals — color-coded by status so you can spot red flags at a glance." },
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
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <div className="text-2xl font-bold">{rooms.length}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Active deals</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <div className="text-2xl font-bold text-success">
                {rooms.filter((r) => getOverallStatus(r.id) === "Complete").length}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">DD complete</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <div className="text-2xl font-bold text-destructive">
                {rooms.filter((r) => getOverallStatus(r.id) === "Red Flag").length}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Red flags</div>
            </div>
          </div>

          {/* Portfolio table */}
          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
            {/* Table header */}
            <div className="grid items-center gap-2 px-5 py-3 bg-muted/30 border-b border-border/60 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
              style={{ gridTemplateColumns: "1fr 120px repeat(6, 72px) 80px" }}>
              <div>Company</div>
              <div>Progress</div>
              {CATEGORIES.map((c) => <div key={c}>{c}</div>)}
              <div>Action</div>
            </div>

            {/* Rows */}
            {rooms.map((room, idx) => {
              const { done, total, pct } = getProgress(room.id);
              const overall = getOverallStatus(room.id);
              const overallCfg = STATUS_CONFIG[overall];

              return (
                <div
                  key={room.id}
                  className={cn(
                    "grid items-center gap-2 px-5 py-4 border-b border-border/40 last:border-0 hover:bg-accent/30 transition-colors",
                    idx % 2 === 1 && "bg-muted/10",
                  )}
                  style={{ gridTemplateColumns: "1fr 120px repeat(6, 72px) 80px" }}
                >
                  {/* Company */}
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{room.name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", overallCfg.cls)}>
                        {overall}
                      </span>
                      {room.stage && <span className="text-[10px] text-muted-foreground">{room.stage}</span>}
                    </div>
                  </div>

                  {/* Progress */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs tabular-nums font-medium">{pct}%</span>
                      <span className="text-[10px] text-muted-foreground">{done}/{total}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-gradient-brand transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Category status pills */}
                  {CATEGORIES.map((cat) => {
                    const s = getCatStatus(room.id, cat);
                    const cfg = STATUS_CONFIG[s];
                    const Icon = cfg.icon;
                    return (
                      <div key={cat} className="flex justify-center">
                        <span className={cn("inline-flex items-center justify-center h-6 w-6 rounded-full", cfg.cls)} title={s}>
                          <Icon className="h-3 w-3" />
                        </span>
                      </div>
                    );
                  })}

                  {/* Action */}
                  <div>
                    <Link
                      to="/app/deal-room/$id"
                      params={{ id: room.id }}
                      search={{ tab: "checklist" } as any}
                      className="inline-flex items-center gap-1 text-xs text-brand hover:underline"
                    >
                      Open <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-3">
            {STATUSES.map((s) => {
              const cfg = STATUS_CONFIG[s];
              const Icon = cfg.icon;
              return (
                <div key={s} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className={cn("inline-flex items-center justify-center h-5 w-5 rounded-full", cfg.cls)}>
                    <Icon className="h-2.5 w-2.5" />
                  </span>
                  {s}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
