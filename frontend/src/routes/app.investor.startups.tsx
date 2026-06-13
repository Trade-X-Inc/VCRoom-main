import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Building2, ExternalLink, Clock, Plus, X, Loader2, ChevronRight, Upload, Download, List, LayoutGrid, Grid3x3, Pencil, Trash2 } from "lucide-react";
import Papa from "papaparse";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/investor/startups")({
  component: StartupsPage,
});

const STATUSES = ["Sourcing", "Reviewing", "Diligence", "Passed", "Invested", "Watching"] as const;
type Status = (typeof STATUSES)[number];

const TAB_STATUSES = ["All", "Sourcing", "Reviewing", "Diligence", "Passed", "Invested"] as const;

const STATUS_STYLES: Record<string, string> = {
  Sourcing: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  Reviewing: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  Diligence: "bg-purple-500/10 text-purple-600 border-purple-500/30",
  Passed: "bg-muted text-muted-foreground border-border/60",
  Invested: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  Watching: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30",
};

const STAGES = ["Pre-seed", "Seed", "Series A", "Series B", "Growth"];

interface AddForm {
  company_name: string;
  website: string;
  sector: string;
  stage: string;
  description: string;
  source: string;
  initial_score: number;
  notes: string;
  status: Status;
}

const EMPTY_ADD: AddForm = {
  company_name: "",
  website: "",
  sector: "",
  stage: "Seed",
  description: "",
  source: "",
  initial_score: 5,
  notes: "",
  status: "Sourcing",
};

function StartupsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<(typeof TAB_STATUSES)[number]>("All");
  const [showAdd, setShowAdd] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid" | "icon">("grid");
  const [platformFilter, setPlatformFilter] = useState<"all" | "hockystick">("all");
  const [stageFilter, setStageFilter] = useState<string | null>(null);

  const downloadSampleCsv = () => {
    const csv = [
      "company_name,website,sector,stage,description,source,notes",
      "Atlas Robotics,https://atlasrobotics.com,Robotics,Seed,Build robots for defence,Conference,Met at TechCrunch",
      "HealthAI,https://healthai.io,HealthTech,Series A,AI diagnostics platform,LinkedIn,Strong team",
      "ClimateX,https://climatex.co,CleanTech,Pre-seed,Carbon capture tech,AngelList,Interesting space",
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hockystick_startup_sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  const [addForm, setAddForm] = useState<AddForm>(EMPTY_ADD);
  const [saving, setSaving] = useState(false);
  const [selectedWatchlist, setSelectedWatchlist] = useState<any | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<AddForm>(EMPTY_ADD);
  const [editSaving, setEditSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Watchlist (manually-added companies)
  const { data: watchlist = [], isLoading: watchlistLoading } = useQuery({
    queryKey: ["investor-watchlist", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investor_watchlist")
        .select("*")
        .eq("investor_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Deal-room startups (existing data)
  const { data: dealRoomStartups = [], isLoading: drLoading } = useQuery({
    queryKey: ["investor-startups", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_room_members")
        .select(`
          deal_room_id,
          deal_rooms(
            id, updated_at, status,
            startups(id, company_name, stage, sector, funding_target, revenue, team_size, tagline)
          )
        `)
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? [])
        .map((r: any) => ({
          dealRoomId: r.deal_room_id,
          dealStatus: r.deal_rooms?.status,
          updatedAt: r.deal_rooms?.updated_at,
          ...(r.deal_rooms?.startups ?? {}),
        }))
        .filter((s: any) => !!s.id);
    },
  });

  const set = <K extends keyof AddForm>(k: K, v: AddForm[K]) => setAddForm((f) => ({ ...f, [k]: v }));

  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    if (!addForm.company_name.trim()) {
      toast.error("Company name is required");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("investor_watchlist").insert({
        investor_id: user.id,
        company_name: addForm.company_name.trim(),
        website: addForm.website,
        sector: addForm.sector,
        stage: addForm.stage,
        description: addForm.description,
        source: addForm.source,
        initial_score: addForm.initial_score,
        notes: addForm.notes,
        status: addForm.status,
      });
      if (error) throw error;
      toast.success(`${addForm.company_name} added`);
      setAddForm(EMPTY_ADD);
      setShowAdd(false);
      qc.invalidateQueries({ queryKey: ["investor-watchlist", user.id] });
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Could not save company");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (company: any) => {
    setEditForm({
      company_name: company.company_name ?? "",
      website: company.website ?? "",
      sector: company.sector ?? "",
      stage: company.stage ?? "Seed",
      description: company.description ?? "",
      source: company.source ?? "",
      initial_score: company.initial_score ?? 5,
      notes: company.notes ?? "",
      status: company.status ?? "Sourcing",
    });
    setEditingCompany(company);
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !editingCompany) return;
    setEditSaving(true);
    try {
      const { error } = await supabase
        .from("investor_watchlist")
        .update({
          company_name: editForm.company_name.trim(),
          website: editForm.website,
          sector: editForm.sector,
          stage: editForm.stage,
          description: editForm.description,
          source: editForm.source,
          initial_score: editForm.initial_score,
          notes: editForm.notes,
          status: editForm.status,
        })
        .eq("id", editingCompany.id)
        .eq("investor_id", user.id);
      if (error) throw error;
      toast.success("Company updated");
      setEditingCompany(null);
      qc.invalidateQueries({ queryKey: ["investor-watchlist", user.id] });
    } catch (err: any) {
      toast.error(err?.message || "Could not update");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user?.id || !deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("investor_watchlist")
        .delete()
        .eq("id", deleteTarget.id)
        .eq("investor_id", user.id);
      if (error) throw error;
      toast.success(`${deleteTarget.company_name} deleted`);
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ["investor-watchlist", user.id] });
    } catch (err: any) {
      toast.error(err?.message || "Could not delete");
    } finally {
      setDeleting(false);
    }
  };

  const filteredWatchlist = useMemo(() => {
    if (activeTab === "All") return stageFilter ? watchlist.filter((w: any) => w.stage === stageFilter) : watchlist;
    return watchlist.filter((w: any) => w.status === activeTab && (!stageFilter || w.stage === stageFilter));
  }, [watchlist, activeTab, stageFilter]);

  // Platform-generated vc_leads (created via Connect)
  const { data: platformLeads = [], isLoading: platformLoading } = useQuery({
    queryKey: ["platform-vc-leads", user?.id],
    enabled: !!user?.id && platformFilter === "hockystick",
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vc_leads")
        .select(`
          id,
          investor_name,
          firm_name,
          sector,
          stage,
          status,
          source,
          discovery_request_id,
          discovery_requests!vc_leads_discovery_request_id_fkey (
            id,
            status,
            startup_id,
            startups (
              company_name,
              sector,
              stage,
              country,
              funding_target
            )
          )
        `)
        .eq("source", "Hockystick")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const countFor = (s: (typeof TAB_STATUSES)[number]) =>
    s === "All" ? watchlist.length : watchlist.filter((w: any) => w.status === s).length;

  const isLoading = watchlistLoading || drLoading;

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Startups</h1>
          <div className="text-sm text-muted-foreground">
            {watchlist.length} on watchlist · {dealRoomStartups.length} active deal room{dealRoomStartups.length !== 1 ? "s" : ""}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* View mode toggle */}
          <div className="flex items-center rounded-lg border border-border/60 bg-muted/40 p-0.5 gap-0.5">
            <button
              onClick={() => setViewMode("list")}
              title="List view"
              className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              title="Card view"
              className={`p-1.5 rounded-md transition-colors ${viewMode === "grid" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("icon")}
              title="Icon view"
              className={`p-1.5 rounded-md transition-colors ${viewMode === "icon" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Grid3x3 className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
          <button
            onClick={downloadSampleCsv}
            className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent"
          >
            <Download className="h-4 w-4" /> Sample CSV
          </button>
          <button
            onClick={() => setCsvOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent"
          >
            <Upload className="h-4 w-4" /> Import CSV
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-glow"
          >
            <Plus className="h-4 w-4" /> Add company
          </button>
          </div>
        </div>
      </div>

      {/* Stage filter row */}
      <div className="mt-3 px-8 pb-3 flex items-center gap-2">
        {[
          { key: null, label: "All stages" },
          { key: "Pre-seed", label: "Pre-seed" },
          { key: "Seed", label: "Seed" },
          { key: "Series A", label: "Series A" },
          { key: "Series B", label: "Series B" },
        ].map((b) => {
          const active = stageFilter === b.key;
          return (
            <button
              key={String(b.key)}
              onClick={() => setStageFilter(b.key)}
              className={`px-3 py-1 rounded-md text-sm ${active ? "bg-brand text-white" : "bg-white/5 text-white/60 hover:bg-white/10"}`}
            >
              {b.label}
            </button>
          );
        })}
      </div>

      {/* Status tabs */}
      <div className="mt-5 flex flex-wrap items-center gap-1 border-b border-border/60">
        {TAB_STATUSES.map((s) => {
          const active = activeTab === s;
          return (
            <button
              key={s}
              onClick={() => setActiveTab(s)}
              className={
                "px-3 py-2 text-sm -mb-px border-b-2 transition-colors " +
                (active
                  ? "border-brand text-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground")
              }
            >
              {s} <span className="ml-1 text-xs text-muted-foreground">({countFor(s)})</span>
            </button>
          );
        })}
      </div>

      {/* Deal-room startups section */}
      {dealRoomStartups.length > 0 && activeTab === "All" && (
        <div className="mt-6">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">
            Active deal rooms
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {dealRoomStartups.map((c: any) => (
              <Link
                key={c.id}
                to="/app/deal-room/$id"
                params={{ id: c.dealRoomId }}
                className="block rounded-2xl border border-border/60 bg-card p-5 hover:shadow-card transition-shadow group"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-brand text-brand-foreground font-semibold shrink-0">
                    {(c.company_name || "S")[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate group-hover:text-brand transition-colors">{c.company_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.sector || "General"} · {c.stage || "Stage unknown"}
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {c.tagline && <p className="mt-3 text-sm text-muted-foreground line-clamp-1">{c.tagline}</p>}
                <div className="mt-4 grid grid-cols-3 gap-2 pt-4 border-t border-border/60">
                  <div>
                    <div className="text-xs text-muted-foreground">Revenue</div>
                    <div className="text-sm font-medium">{c.revenue || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Ask</div>
                    <div className="text-sm font-medium">{c.funding_target || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Team</div>
                    <div className="text-sm font-medium">{c.team_size || "—"}</div>
                  </div>
                </div>
                {c.updatedAt && (
                  <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(c.updatedAt), { addSuffix: true })}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Watchlist section */}
      <div className="mt-6">
        {/* Platform filter toggle */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setPlatformFilter("all")}
            className={`px-3 py-1 rounded-md text-sm ${platformFilter === "all" ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:bg-accent"}`}
          >
            All leads
          </button>
          <button
            onClick={() => setPlatformFilter("hockystick")}
            className={`px-3 py-1 rounded-md text-sm ${platformFilter === "hockystick" ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:bg-accent"}`}
          >
            From Hockystick
          </button>
        </div>

        {/* Platform leads view */}
        {/* Hockystick platform leads */}
        {platformFilter === "hockystick" && (
          platformLoading ? (
            <div className="grid md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="rounded-2xl border border-border/60 bg-card h-40 animate-pulse" />
              ))}
            </div>
          ) : platformLeads.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-card p-12 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
                <Building2 className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No platform leads yet</h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">Connect with founders from the Directory to generate platform leads.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {platformLeads.map((l: any) => {
                const startup = l.discovery_requests?.startups;
                const company = startup?.company_name ?? l.investor_name;
                const badge = l.status === "New" ? "Pending founder response" : l.status === "Replied" ? "Connected" : l.status === "Rejected" ? "Declined" : l.status;
                const badgeCls = l.status === "New" ? "bg-amber-500/10 text-amber-600" : l.status === "Replied" ? "bg-success/10 text-success" : l.status === "Rejected" ? "bg-destructive/10 text-destructive" : "bg-muted/10 text-muted-foreground";
                return (
                  <div key={l.id} className="rounded-2xl border border-border/60 bg-card p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{company}</div>
                        <div className="text-xs text-muted-foreground">{startup?.sector ?? l.sector} · {startup?.stage ?? l.stage}</div>
                      </div>
                      <div className={`text-xs px-2 py-1 rounded ${badgeCls}`}>{badge}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* All leads / watchlist */}
        {platformFilter === "all" && (
        <>
        {activeTab === "All" && watchlist.length > 0 && (
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">
            Watchlist
          </div>
        )}

        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-2xl border border-border/60 bg-card h-40 animate-pulse" />
            ))}
          </div>
        ) : filteredWatchlist.length === 0 && (activeTab !== "All" || dealRoomStartups.length === 0) ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-card p-12 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
              <Building2 className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No companies in {activeTab.toLowerCase()}</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
              Add a company you're tracking and move it through your pipeline.
            </p>
            <button
              onClick={() => setShowAdd(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-[10px] bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-1.5 text-sm font-medium text-white"
            >
              <Plus className="h-4 w-4" /> Add company
            </button>
          </div>
        ) : viewMode === "list" ? (
          /* ── LIST VIEW ── */
          <div className="rounded-xl border border-border/60 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border/60">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Company</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Sector</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Stage</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Source</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Score</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredWatchlist.map((c: any) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedWatchlist(c)}
                    className="hover:bg-accent/40 cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-brand text-brand-foreground text-xs font-bold shrink-0">
                          {(c.company_name || "S")[0]}
                        </div>
                        <div>
                          <div className="font-semibold group-hover:text-brand transition-colors">{c.company_name}</div>
                          {c.description && <div className="text-xs text-muted-foreground truncate max-w-[200px]">{c.description}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{c.sector || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{c.stage || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{c.source || "—"}</td>
                    <td className="px-4 py-3 font-medium tabular-nums">{c.initial_score ?? "—"}/10</td>
                    <td className="px-4 py-3">
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium whitespace-nowrap", STATUS_STYLES[c.status] || STATUS_STYLES.Sourcing)}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 justify-end">
                        {c.website && <a href={c.website} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-brand hover:underline text-xs flex items-center gap-0.5 mr-1">Site <ExternalLink className="h-3 w-3" /></a>}
                        <button
                          onClick={(e) => { e.stopPropagation(); openEdit(c); }}
                          className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(c); }}
                          className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : viewMode === "icon" ? (
          /* ── ICON / COMPACT GRID VIEW ── */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {filteredWatchlist.map((c: any) => (
              <div
                key={c.id}
                className="rounded-xl border border-border/60 bg-card p-4 text-left hover:shadow-card hover:border-brand/30 transition-all group flex flex-col items-center text-center gap-2"
              >
                <button onClick={() => setSelectedWatchlist(c)} className="flex flex-col items-center gap-2 w-full">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-brand text-brand-foreground text-xl font-bold group-hover:scale-105 transition-transform">
                    {(c.company_name || "S")[0]}
                  </div>
                  <div className="w-full">
                    <div className="font-semibold text-xs truncate group-hover:text-brand transition-colors">{c.company_name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{c.sector || "General"}</div>
                  </div>
                  <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full border font-medium w-full text-center truncate", STATUS_STYLES[c.status] || STATUS_STYLES.Sourcing)}>
                    {c.status}
                  </span>
                </button>
                <div className="flex items-center gap-1 mt-1">
                  <button
                    onClick={() => openEdit(c)}
                    className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                    title="Edit"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(c)}
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ── CARD / GRID VIEW (default) ── */
          <div className="grid md:grid-cols-2 gap-4">
            {filteredWatchlist.map((c: any) => (
              <button
                key={c.id}
                onClick={() => setSelectedWatchlist(c)}
                className="rounded-2xl border border-border/60 bg-card p-5 text-left hover:shadow-card hover:border-brand/30 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-brand text-brand-foreground font-semibold shrink-0">
                    {(c.company_name || "S")[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate group-hover:text-brand transition-colors">{c.company_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.sector || "General"} · {c.stage || "Stage unknown"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", STATUS_STYLES[c.status] || STATUS_STYLES.Sourcing)}>
                      {c.status}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                {c.description && (
                  <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{c.description}</p>
                )}
                <div className="mt-4 grid grid-cols-3 gap-2 pt-4 border-t border-border/60 text-xs">
                  <div>
                    <div className="text-muted-foreground">Score</div>
                    <div className="font-medium tabular-nums">{c.initial_score ?? "—"}/10</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Source</div>
                    <div className="font-medium truncate">{c.source || "—"}</div>
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    {c.website && (
                      <a
                        href={c.website.startsWith("http") ? c.website : `https://${c.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-0.5 text-brand hover:underline mr-auto"
                      >
                        Site <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); openEdit(c); }}
                      className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(c); }}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
        </>
        )}
      </div>

      {/* Bulk CSV Import Modal */}
      {csvOpen && user?.id && (
        <StartupCsvImportModal
          userId={user.id}
          onClose={() => setCsvOpen(false)}
          onImported={() => {
            setCsvOpen(false);
            qc.invalidateQueries({ queryKey: ["investor-watchlist", user.id] });
          }}
        />
      )}

      {/* Add company modal */}
      {showAdd && (
        <div
          className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm grid place-items-center p-4"
          onClick={() => !saving && setShowAdd(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-card border border-border/60 shadow-elev max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 sticky top-0 bg-card">
              <div className="text-sm font-semibold">Add company</div>
              <button onClick={() => setShowAdd(false)} disabled={saving} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={submitAdd} className="p-5 space-y-4">
              <Field label="Company name *">
                <input
                  required
                  value={addForm.company_name}
                  onChange={(e) => set("company_name", e.target.value)}
                  className="modal-input"
                  placeholder="Acme Inc."
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Website">
                  <input value={addForm.website} onChange={(e) => set("website", e.target.value)} className="modal-input" placeholder="acme.com" />
                </Field>
                <Field label="Sector">
                  <input value={addForm.sector} onChange={(e) => set("sector", e.target.value)} className="modal-input" placeholder="AI / DevTools" />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Stage">
                  <select value={addForm.stage} onChange={(e) => set("stage", e.target.value)} className="modal-input">
                    {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Status">
                  <select value={addForm.status} onChange={(e) => set("status", e.target.value as Status)} className="modal-input">
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="Description">
                <textarea
                  value={addForm.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={2}
                  className="modal-input"
                  placeholder="What does the company do?"
                />
              </Field>

              <Field label="How you found them (source)">
                <input value={addForm.source} onChange={(e) => set("source", e.target.value)} className="modal-input" placeholder="LinkedIn intro, conference, etc." />
              </Field>

              <Field label={`Initial score — ${addForm.initial_score}/10`}>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={addForm.initial_score}
                  onChange={(e) => set("initial_score", Number(e.target.value))}
                  className="w-full accent-purple-600"
                />
              </Field>

              <Field label="Notes">
                <textarea
                  value={addForm.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  rows={2}
                  className="modal-input"
                  placeholder="Anything you want to remember."
                />
              </Field>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  disabled={saving}
                  className="rounded-[10px] border border-border/60 px-3 py-1.5 text-sm hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-[10px] bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-1.5 text-sm font-medium text-white shadow-glow disabled:opacity-60"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Watchlist detail drawer */}
      {selectedWatchlist && (
        <>
          <div
            className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm"
            onClick={() => setSelectedWatchlist(null)}
          />
          <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-border/60 bg-background shadow-elev flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-brand text-brand-foreground font-semibold shrink-0">
                  {(selectedWatchlist.company_name || "S")[0]}
                </div>
                <div>
                  <div className="font-semibold">{selectedWatchlist.company_name}</div>
                  <div className="text-xs text-muted-foreground">{selectedWatchlist.sector || "—"} · {selectedWatchlist.stage || "—"}</div>
                </div>
              </div>
              <button onClick={() => setSelectedWatchlist(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              {/* Status */}
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1.5">Status</div>
                <select
                  value={selectedWatchlist.status}
                  onChange={async (e) => {
                    if (!user?.id) return;
                    const newStatus = e.target.value;
                    setUpdatingStatus(true);
                    try {
                      const { error } = await supabase
                        .from("investor_watchlist")
                        .update({ status: newStatus })
                        .eq("id", selectedWatchlist.id);
                      if (error) throw error;
                      setSelectedWatchlist({ ...selectedWatchlist, status: newStatus });
                      qc.invalidateQueries({ queryKey: ["investor-watchlist", user.id] });
                      toast.success("Status updated");
                    } catch (err: any) {
                      toast.error(err?.message || "Could not update status");
                    } finally {
                      setUpdatingStatus(false);
                    }
                  }}
                  disabled={updatingStatus}
                  className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Score */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">Initial score</div>
                  <div className="text-2xl font-semibold tabular-nums">{selectedWatchlist.initial_score ?? "—"}<span className="text-sm font-normal text-muted-foreground">/10</span></div>
                </div>
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">Source</div>
                  <div className="text-sm font-medium">{selectedWatchlist.source || "—"}</div>
                </div>
              </div>

              {/* Description */}
              {selectedWatchlist.description && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1.5">Description</div>
                  <p className="text-sm leading-relaxed text-foreground">{selectedWatchlist.description}</p>
                </div>
              )}

              {/* Notes */}
              {selectedWatchlist.notes && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1.5">Notes</div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{selectedWatchlist.notes}</p>
                </div>
              )}

              {/* Website */}
              {selectedWatchlist.website && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1.5">Website</div>
                  <a
                    href={selectedWatchlist.website.startsWith("http") ? selectedWatchlist.website : `https://${selectedWatchlist.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-brand hover:underline"
                  >
                    {selectedWatchlist.website} <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}

              {/* Added date */}
              {selectedWatchlist.created_at && (
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Added {formatDistanceToNow(new Date(selectedWatchlist.created_at), { addSuffix: true })}
                </div>
              )}
            </div>
          </aside>
        </>
      )}

      {/* Edit company modal */}
      {editingCompany && (
        <div
          className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm grid place-items-center p-4"
          onClick={() => !editSaving && setEditingCompany(null)}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-card border border-border/60 shadow-elev max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 sticky top-0 bg-card">
              <div className="text-sm font-semibold">Edit — {editingCompany.company_name}</div>
              <button onClick={() => setEditingCompany(null)} disabled={editSaving} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={submitEdit} className="p-5 space-y-4">
              <Field label="Company name *">
                <input
                  required
                  value={editForm.company_name}
                  onChange={(e) => setEditForm((f) => ({ ...f, company_name: e.target.value }))}
                  className="modal-input"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Website">
                  <input value={editForm.website} onChange={(e) => setEditForm((f) => ({ ...f, website: e.target.value }))} className="modal-input" />
                </Field>
                <Field label="Sector">
                  <input value={editForm.sector} onChange={(e) => setEditForm((f) => ({ ...f, sector: e.target.value }))} className="modal-input" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Stage">
                  <select value={editForm.stage} onChange={(e) => setEditForm((f) => ({ ...f, stage: e.target.value }))} className="modal-input">
                    {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Status">
                  <select value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as Status }))} className="modal-input">
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Description">
                <textarea value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="modal-input" />
              </Field>
              <Field label="Notes">
                <textarea value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="modal-input" />
              </Field>
              <Field label={`Score — ${editForm.initial_score}/10`}>
                <input
                  type="range" min={1} max={10} step={1}
                  value={editForm.initial_score}
                  onChange={(e) => setEditForm((f) => ({ ...f, initial_score: Number(e.target.value) }))}
                  className="w-full accent-purple-600"
                />
              </Field>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditingCompany(null)} disabled={editSaving} className="rounded-[10px] border border-border/60 px-3 py-1.5 text-sm hover:bg-accent">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="inline-flex items-center gap-1.5 rounded-[10px] bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-1.5 text-sm font-medium text-white shadow-glow disabled:opacity-60"
                >
                  {editSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm grid place-items-center p-4"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-card border border-border/60 shadow-elev p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid h-10 w-10 place-items-center rounded-full bg-destructive/10 mb-4">
              <Trash2 className="h-5 w-5 text-destructive" />
            </div>
            <h3 className="text-base font-semibold">Delete {deleteTarget.company_name}?</h3>
            <p className="mt-1 text-sm text-muted-foreground">This will permanently remove the company from your watchlist. This cannot be undone.</p>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting} className="rounded-[10px] border border-border/60 px-3 py-1.5 text-sm hover:bg-accent">
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 rounded-[10px] bg-destructive text-destructive-foreground px-4 py-1.5 text-sm font-medium disabled:opacity-60"
              >
                {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .modal-input {
          width: 100%;
          border-radius: 10px;
          border: 1px solid hsl(var(--border) / 0.6);
          background: hsl(var(--background));
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
        }
        .modal-input:focus { border-color: hsl(var(--brand) / 0.5); }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-muted-foreground mb-1.5">{label}</div>
      {children}
    </label>
  );
}


// ── Startup CSV Import Modal ────────────────────────────────────────
const STARTUP_PREVIEW_COLS = ["company_name", "sector", "stage", "website", "source"] as const;

function mapStartupRow(raw: Record<string, string>) {
  const name = (raw["company_name"] || raw["name"] || raw["Company"] || raw["Company Name"] || "").trim();
  if (!name) return null;
  return {
    company_name: name,
    website: (raw["website"] || raw["Website"] || raw["url"] || "").trim() || null,
    sector: (raw["sector"] || raw["Sector"] || raw["industry"] || raw["Industry"] || "").trim() || null,
    stage: (raw["stage"] || raw["Stage"] || "").trim() || null,
    description: (raw["description"] || raw["Description"] || raw["tagline"] || "").trim() || null,
    source: (raw["source"] || raw["Source"] || "").trim() || null,
    notes: (raw["notes"] || raw["Notes"] || "").trim() || null,
    status: "Reviewing" as const,
    initial_score: null,
  };
}

function StartupCsvImportModal({
  userId, onClose, onImported,
}: { userId: string; onClose: () => void; onImported: () => void; }) {
  const fileRef = useRef<React.ElementRef<"input">>(null);
  const [mapped, setMapped] = useState<ReturnType<typeof mapStartupRow>[] | null>(null);
  const [skipped, setSkipped] = useState(0);
  const [importing, setImporting] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const valid: ReturnType<typeof mapStartupRow>[] = [];
        let skip = 0;
        results.data.forEach((r) => {
          const m = mapStartupRow(r);
          if (m) valid.push(m);
          else skip++;
        });
        setMapped(valid);
        setSkipped(skip);
      },
    });
  };

  const doImport = async () => {
    if (!mapped || mapped.length === 0 || !userId) return;
    setImporting(true);
    try {
      const rows = mapped.filter(Boolean).map((r) => ({ ...r, investor_id: userId }));
      const { error } = await supabase.from("investor_watchlist").insert(rows);
      if (error) throw error;
      toast.success(`${rows.length} companies imported`);
      onImported();
    } catch (err: any) {
      toast.error(err.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl rounded-2xl border border-border/60 bg-card shadow-elev overflow-hidden">
        <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">Import startups from CSV</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Required column: <code className="bg-muted px-1 rounded">company_name</code> · Optional: website, sector, stage, description, source, notes</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {!mapped && (
            <div
              onClick={() => fileRef.current?.click()}
              className="rounded-xl border-2 border-dashed border-border/60 bg-muted/30 hover:bg-accent/40 hover:border-brand/50 p-10 text-center cursor-pointer transition-all"
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium">Click to select a CSV file</p>
              <p className="text-xs text-muted-foreground mt-1">Download the sample CSV first to see the expected format</p>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
            </div>
          )}

          {mapped && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {mapped.length} companies ready to import
                  {skipped > 0 && <span className="ml-2 text-xs text-warning">({skipped} skipped — missing company name)</span>}
                </p>
                <button onClick={() => { setMapped(null); setSkipped(0); }} className="text-xs text-muted-foreground hover:text-foreground underline">
                  Choose different file
                </button>
              </div>
              <div className="rounded-xl border border-border/60 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/30 border-b border-border/60">
                        {STARTUP_PREVIEW_COLS.map((col) => (
                          <th key={col} className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                            {col.replace(/_/g, " ")}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {mapped.slice(0, 6).map((row, i) => (
                        <tr key={i} className="hover:bg-accent/30">
                          {STARTUP_PREVIEW_COLS.map((col) => (
                            <td key={col} className="px-3 py-2 truncate max-w-[160px]">
                              {(row as any)?.[col] || <span className="text-muted-foreground/50">—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {mapped.length > 6 && (
                  <div className="px-3 py-2 bg-muted/20 border-t border-border/60 text-xs text-muted-foreground">
                    + {mapped.length - 6} more companies
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border/60 flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-border/60 px-3 py-1.5 text-sm hover:bg-accent">Cancel</button>
          <button
            onClick={doImport}
            disabled={!mapped || mapped.length === 0 || importing}
            className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-4 py-1.5 text-sm shadow-glow disabled:opacity-50"
          >
            {importing
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Importing…</>
              : <>Import {mapped ? `${mapped.length} companies` : "all"}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}