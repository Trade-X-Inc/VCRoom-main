import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Inbox, Search, Filter, ArrowDownUp } from "lucide-react";
import { AIBriefPanel, type AIBriefData } from "@/components/app/AIBriefPanel";

export const Route = createFileRoute("/app/investor/deal-flow")({
  component: DealFlowPage,
});

type Tab = "all" | "new" | "hot" | "needs";

function DealFlowPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [brief, setBrief] = useState<AIBriefData | null>(null);
  const deals: any[] = []; // no mock data

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Deal Flow</h1>
          <div className="text-sm text-muted-foreground">{deals.length} new deals this week</div>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search deals…" className="w-full rounded-[10px] border border-border/60 bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10" />
        </div>
        <button className="inline-flex items-center gap-1.5 rounded-[10px] border border-border/60 px-3 py-2 text-sm hover:bg-accent"><Filter className="h-4 w-4" /> Filter</button>
        <button className="inline-flex items-center gap-1.5 rounded-[10px] border border-border/60 px-3 py-2 text-sm hover:bg-accent"><ArrowDownUp className="h-4 w-4" /> Sort</button>
      </div>

      <div className="mt-4 inline-flex rounded-[10px] border border-border/60 p-0.5 bg-card">
        {(["all", "new", "hot", "needs"] as Tab[]).map((k) => (
          <button key={k} onClick={() => setTab(k)} className={`px-3 py-1.5 text-xs rounded-md ${tab === k ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}>
            {k === "all" ? "All" : k === "new" ? "New" : k === "hot" ? "Hot" : "Needs action"}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {deals.length === 0 ? (
          <EmptyDealFlow />
        ) : null}
      </div>

      <AIBriefPanel data={brief} onClose={() => setBrief(null)} />
    </div>
  );
}

function EmptyDealFlow() {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 bg-card p-12 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <Inbox className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">No deals yet</h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">Deal rooms will appear here when founders invite you. New invitations show up automatically.</p>
    </div>
  );
}
