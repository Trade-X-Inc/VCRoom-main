import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Papa from "papaparse";
import { toast } from "sonner";
import {
  Plus, Upload, Download, Flame, X, AlertCircle, Loader2,
  TrendingUp, Users, Zap, Briefcase, LayoutGrid, List, Table2,
  ChevronUp, ChevronDown as ChevronDownIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { LeadDrawer, type VCLead, type LeadStatus, ALL_STATUSES } from "@/components/app/LeadDrawer";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/leads")({
  component: Leads,
});

// ── Status styles ─────────────────────────────────────────────────
const STATUS_COLOR: Record<LeadStatus, string> = {
  "New":               "bg-muted-foreground/20 text-muted-foreground",
  "Shortlisted":       "bg-foreground/10 text-foreground",
  "Contacted":         "bg-brand/15 text-brand",
  "Replied":           "bg-violet/15 text-violet",
  "Meeting Booked":    "bg-warning/15 text-warning",
  "Interested":        "bg-warning/20 text-warning",
  "Deal Room Created": "bg-success/15 text-success",
  "Follow Up":         "bg-brand/10 text-brand",
  "Rejected":          "bg-destructive/15 text-destructive",
};

const STATUS_DOT: Record<LeadStatus, string> = {
  "New": "bg-muted-foreground/50",
  "Shortlisted": "bg-foreground",
  "Contacted": "bg-brand",
  "Replied": "bg-violet",
  "Meeting Booked": "bg-warning",
  "Interested": "bg-warning",
  "Deal Room Created": "bg-success",
  "Follow Up": "bg-brand",
  "Rejected": "bg-destructive",
};

// ── CSV helpers ───────────────────────────────────────────────────
interface MappedRow {
  investor_name: string;
  firm_name?: string;
  email?: string;
  linkedin_url?: string;
  sector?: string;
  stage?: string;
  geography?: string;
  ticket_size?: string;
}

function normKey(k: string): string {
  return k.toLowerCase().replace(/[\s\-]+/g, "_");
}

function mapCsvRow(raw: Record<string, string>): MappedRow | null {
  const n: Record<string, string> = {};
  Object.keys(raw).forEach((k) => { n[normKey(k)] = raw[k] ?? ""; });
  const email = (n["email"] || n["email_address"] || "").trim();
  if (!email) return null; // Skip rows without email
  const raw_name = n["investor_name"] || n["investor"] || n["name"] || n["contact_name"] || "";
  const investor_name = raw_name.trim() || email.split("@")[0]; // Fallback to email prefix
  return {
    investor_name,
    firm_name: n["firm_name"] || n["firm"] || n["company"] || n["fund"] || undefined,
    email,
    linkedin_url: n["linkedin_url"] || n["linkedin"] || undefined,
    sector: n["sector"] || n["focus"] || undefined,
    stage: n["stage"] || n["investment_stage"] || undefined,
    geography: n["geography"] || n["region"] || n["location"] || undefined,
    ticket_size: n["ticket_size"] || n["check_size"] || n["check"] || n["ticket"] || undefined,
  };
}

// ── Main component ────────────────────────────────────────────────
function Leads() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editLead, setEditLead] = useState<VCLead | null>(null);
  const [csvOpen, setCsvOpen] = useState(false);
  const [view, setView] = useState<"list" | "table" | "kanban">("list");

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("vc_leads")
        .select("*")
        .eq("founder_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as VCLead[];
    },
  });

  const grouped = useMemo(() => {
    const map = {} as Record<LeadStatus, VCLead[]>;
    ALL_STATUSES.forEach((s) => { map[s] = []; });
    leads.forEach((l) => {
      (map[l.status] ?? map["New"]).push(l);
    });
    return map;
  }, [leads]);

  const handleDrop = async (leadId: string, newStatus: LeadStatus) => {
    if (!user?.id) return;
    await supabase
      .from("vc_leads")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", leadId)
      .eq("founder_id", user.id);
    queryClient.invalidateQueries({ queryKey: ["leads", user.id] });
  };

  const openAdd = () => { setEditLead(null); setDrawerOpen(true); };

  const downloadSampleCsv = () => {
    const csv = [
      "investor_name,firm_name,email,linkedin_url,sector,stage,geography,ticket_size",
      "Sarah Chen,Sequoia Capital,sarah@sequoia.com,https://linkedin.com/in/sarahchen,SaaS,Seed,US,$250K-$1M",
      "Marcus Rivera,Accel Partners,marcus@accel.com,https://linkedin.com/in/marcusrivera,Fintech,Series A,Europe,$1M-$5M",
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample_leads.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  const openEdit = (lead: VCLead) => { setEditLead(lead); setDrawerOpen(true); };

  // KPI
  const total = leads.length;
  const contacted = leads.filter((l) =>
    (["Contacted", "Replied", "Meeting Booked"] as LeadStatus[]).includes(l.status),
  ).length;
  const hot = leads.filter((l) =>
    (["Interested", "Meeting Booked"] as LeadStatus[]).includes(l.status),
  ).length;
  const dealRooms = leads.filter((l) => l.status === "Deal Room Created").length;

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 4rem)" }}>
      {/* ── Header ── */}
      <div className="px-8 py-5 border-b border-border/60 flex items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">VC Leads</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading ? "Loading…" : `${total} investors in pipeline`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-md border border-border/60 overflow-hidden">
            {([
              { v: "list" as const, Icon: List, title: "List" },
              { v: "table" as const, Icon: Table2, title: "Table" },
              { v: "kanban" as const, Icon: LayoutGrid, title: "Kanban" },
            ]).map(({ v, Icon, title }) => (
              <button
                key={v}
                title={title}
                onClick={() => setView(v)}
                className={cn(
                  "flex items-center justify-center h-9 w-9 transition-colors",
                  view === v ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:bg-accent"
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
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
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow"
          >
            <Plus className="h-4 w-4" /> Add Lead
          </button>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div className="px-8 py-4 grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
        {(
          [
            ["Total leads", total, TrendingUp, "brand"],
            ["Contacted", contacted, Users, "violet"],
            ["Hot leads", hot, Zap, "warning"],
            ["Deal rooms", dealRooms, Briefcase, "success"],
          ] as const
        ).map(([label, value, Icon, color]) => (
          <div key={label} className="rounded-xl border border-border/60 bg-card p-4 shadow-card">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{label}</span>
              <Icon className={`h-3.5 w-3.5 text-${color}`} />
            </div>
            <div className={`mt-2 text-2xl font-semibold text-${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── View content ── */}
      {view === "list" && (
        <div className="flex-1 overflow-y-auto px-8 pb-6 min-h-0">
          <ListView leads={leads} isLoading={isLoading} onLeadClick={openEdit} />
        </div>
      )}
      {view === "table" && (
        <div className="flex-1 overflow-auto px-8 pb-6 min-h-0">
          <TableView leads={leads} isLoading={isLoading} onLeadClick={openEdit} />
        </div>
      )}
      {view === "kanban" && (
        <div className="flex-1 overflow-x-auto px-8 pb-6 min-h-0">
          <div className="flex gap-3 h-full" style={{ minWidth: "max-content" }}>
            {ALL_STATUSES.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                leads={grouped[status] ?? []}
                isLoading={isLoading}
                onDrop={handleDrop}
                onCardClick={openEdit}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Lead drawer ── */}
      <LeadDrawer
        open={drawerOpen}
        lead={editLead}
        onClose={() => { setDrawerOpen(false); setEditLead(null); }}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["leads", user?.id] });
          setDrawerOpen(false);
          setEditLead(null);
        }}
      />

      {/* ── CSV import modal ── */}
      {csvOpen && (
        <CsvImportModal
          userId={user?.id ?? ""}
          onClose={() => setCsvOpen(false)}
          onImported={() => {
            queryClient.invalidateQueries({ queryKey: ["leads", user?.id] });
            setCsvOpen(false);
          }}
        />
      )}
    </div>
  );
}

// ── List view ─────────────────────────────────────────────────────
function ListView({
  leads, isLoading, onLeadClick,
}: { leads: VCLead[]; isLoading: boolean; onLeadClick: (l: VCLead) => void }) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  if (isLoading) {
    return (
      <div className="space-y-2 mt-2">
        {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-lg bg-muted/60 animate-pulse" />)}
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="mt-8 rounded-xl border border-border/60 bg-card p-10 flex flex-col items-center gap-3 text-center">
        <Users className="h-7 w-7 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No leads yet. Add one or import a CSV.</p>
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-xl border border-border/60 bg-card shadow-card divide-y divide-border/60 overflow-hidden">
      {leads.map((lead) => {
        const followUp = lead.follow_up_date ? new Date(lead.follow_up_date + "T12:00:00") : null;
        const isOverdue = followUp !== null && followUp <= today;
        const initials = lead.investor_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
        return (
          <div
            key={lead.id}
            onClick={() => onLeadClick(lead)}
            className="flex items-center gap-4 px-5 py-3.5 hover:bg-accent/40 cursor-pointer transition-colors"
          >
            <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-brand text-brand-foreground font-semibold text-sm shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold truncate">{lead.investor_name}</span>
                {lead.status === "Interested" && <Flame className="h-3.5 w-3.5 text-warning shrink-0" />}
              </div>
              {lead.firm_name && (
                <div className="text-xs text-muted-foreground truncate">{lead.firm_name}</div>
              )}
            </div>
            <span className={cn("text-[11px] px-2 py-0.5 rounded-full shrink-0 hidden sm:block", STATUS_COLOR[lead.status])}>
              {lead.status}
            </span>
            {lead.ticket_size && (
              <span className="text-xs text-muted-foreground shrink-0 hidden md:block tabular-nums">
                {lead.ticket_size}
              </span>
            )}
            {followUp && (
              <span className={cn("text-[11px] shrink-0 hidden lg:flex items-center gap-1", isOverdue ? "text-warning" : "text-muted-foreground")}>
                {isOverdue && <AlertCircle className="h-3 w-3" />}
                {followUp.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Table view ────────────────────────────────────────────────────
type SortKey = "investor_name" | "firm_name" | "status" | "sector" | "ticket_size" | "last_contacted" | "next_action";

function TableView({
  leads, isLoading, onLeadClick,
}: { leads: VCLead[]; isLoading: boolean; onLeadClick: (l: VCLead) => void }) {
  const [sortKey, setSortKey] = useState<SortKey>("investor_name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sorted = useMemo(() => {
    return [...leads].sort((a, b) => {
      const av = (a[sortKey] ?? "") as string;
      const bv = (b[sortKey] ?? "") as string;
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [leads, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const TH = ({ k, label }: { k: SortKey; label: string }) => (
    <th
      onClick={() => toggleSort(k)}
      className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-foreground select-none"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === k ? (
          sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />
        ) : null}
      </span>
    </th>
  );

  if (isLoading) {
    return <div className="mt-2 h-40 rounded-xl bg-muted/60 animate-pulse" />;
  }

  return (
    <div className="mt-2 rounded-xl border border-border/60 bg-card shadow-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/30 border-b border-border/60">
          <tr>
            <TH k="investor_name" label="Name" />
            <TH k="firm_name" label="Firm" />
            <TH k="status" label="Status" />
            <TH k="sector" label="Sector" />
            <TH k="ticket_size" label="Ticket" />
            <TH k="last_contacted" label="Last contact" />
            <TH k="next_action" label="Next action" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                No leads yet. Add one or import a CSV.
              </td>
            </tr>
          ) : sorted.map((lead) => (
            <tr
              key={lead.id}
              onClick={() => onLeadClick(lead)}
              className="hover:bg-accent/40 cursor-pointer transition-colors"
            >
              <td className="px-4 py-3 font-medium whitespace-nowrap">
                <div className="flex items-center gap-2">
                  {lead.investor_name}
                  {lead.status === "Interested" && <Flame className="h-3.5 w-3.5 text-warning" />}
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{lead.firm_name || "—"}</td>
              <td className="px-4 py-3">
                <span className={cn("text-[11px] px-2 py-0.5 rounded-full", STATUS_COLOR[lead.status])}>
                  {lead.status}
                </span>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{lead.sector || "—"}</td>
              <td className="px-4 py-3 text-muted-foreground tabular-nums">{lead.ticket_size || "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {lead.last_contacted
                  ? new Date(lead.last_contacted).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  : "—"}
              </td>
              <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{lead.next_action || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Kanban column ─────────────────────────────────────────────────
function KanbanColumn({
  status,
  leads,
  isLoading,
  onDrop,
  onCardClick,
}: {
  status: LeadStatus;
  leads: VCLead[];
  isLoading: boolean;
  onDrop: (id: string, s: LeadStatus) => Promise<void>;
  onCardClick: (l: VCLead) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const isFirst = status === ALL_STATUSES[0];

  return (
    <div className="w-[240px] flex-shrink-0 flex flex-col">
      {/* Column header */}
      <div className="flex items-center gap-2 px-1 mb-2.5 shrink-0">
        <span className={cn("h-2 w-2 rounded-full shrink-0", STATUS_DOT[status])} />
        <span className="text-sm font-medium">{status}</span>
        <span className="text-xs text-muted-foreground">{isLoading ? "…" : leads.length}</span>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const leadId = e.dataTransfer.getData("leadId");
          if (leadId) onDrop(leadId, status);
        }}
        className={cn(
          "flex-1 rounded-xl border border-border/60 p-2 space-y-2 transition-colors overflow-y-auto min-h-[400px]",
          "max-h-[calc(100vh-280px)]",
          dragOver ? "bg-brand/5 border-brand/40" : "bg-muted/30",
        )}
      >
        {isLoading ? (
          <>
            <div className="h-20 rounded-lg bg-muted/60 animate-pulse" />
            <div className="h-20 rounded-lg bg-muted/60 animate-pulse" />
          </>
        ) : leads.length === 0 && isFirst ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-center">
            <Users className="h-7 w-7 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground/60">No leads yet.<br />Add one or import a CSV.</p>
          </div>
        ) : (
          leads.map((l) => (
            <LeadCard key={l.id} lead={l} onClick={() => onCardClick(l)} />
          ))
        )}
      </div>
    </div>
  );
}

// ── Lead card ─────────────────────────────────────────────────────
function LeadCard({ lead, onClick }: { lead: VCLead; onClick: () => void }) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const followUp = lead.follow_up_date
    ? new Date(lead.follow_up_date + "T12:00:00")
    : null;
  const isOverdue = followUp !== null && followUp <= today;
  const isHot = lead.status === "Interested";

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("leadId", lead.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={onClick}
      className="rounded-lg border border-border/60 bg-card p-3 shadow-xs hover:shadow-card cursor-grab active:cursor-grabbing transition-all select-none"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold truncate leading-snug">
              {lead.investor_name}
            </span>
            {isHot && <Flame className="h-3 w-3 text-warning shrink-0" />}
          </div>
          {lead.firm_name && (
            <div className="text-xs text-muted-foreground truncate mt-0.5">
              {lead.firm_name}
            </div>
          )}
        </div>
        {lead.ticket_size && (
          <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
            {lead.ticket_size}
          </span>
        )}
      </div>
      {followUp && (
        <div
          className={cn(
            "mt-2 text-[11px] inline-flex items-center gap-1",
            isOverdue ? "text-warning" : "text-muted-foreground",
          )}
        >
          {isOverdue && <AlertCircle className="h-3 w-3" />}
          {followUp.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </div>
      )}
    </div>
  );
}

// ── CSV import modal ──────────────────────────────────────────────
const PREVIEW_COLS = [
  "investor_name",
  "firm_name",
  "email",
  "sector",
  "stage",
  "geography",
  "ticket_size",
] as const;

function CsvImportModal({
  userId,
  onClose,
  onImported,
}: {
  userId: string;
  onClose: () => void;
  onImported: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [mapped, setMapped] = useState<MappedRow[] | null>(null);
  const [skipped, setSkipped] = useState(0);
  const [importing, setImporting] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data;
        const valid: MappedRow[] = [];
        let skip = 0;
        rows.forEach((r) => {
          const m = mapCsvRow(r);
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
      const rows = mapped.map((r) => ({
        ...r,
        founder_id: userId,
        status: "New" as LeadStatus,
      }));
      const { error } = await supabase.from("vc_leads").insert(rows);
      if (error) throw error;
      toast.success(`${rows.length} leads imported`);
      onImported();
    } catch {
      toast.error("Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-2xl border border-border/60 bg-card shadow-elev overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between">
          <h3 className="text-base font-semibold">Import CSV</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* File picker */}
          {!mapped && (
            <div
              onClick={() => fileRef.current?.click()}
              className="rounded-xl border-2 border-dashed border-border/60 bg-muted/30 hover:bg-accent/40 hover:border-brand/50 p-8 text-center cursor-pointer transition-all"
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium">Click to select a CSV file</p>
              <p className="text-xs text-muted-foreground mt-1">
                Expected columns: investor_name, firm_name, email, sector, stage…
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFile}
              />
            </div>
          )}

          {/* Preview */}
          {mapped && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {mapped.length} leads found
                  {skipped > 0 && (
                    <span className="ml-2 text-xs text-warning">
                      ({skipped} skipped — no email)
                    </span>
                  )}
                </p>
                <button
                  onClick={() => { setMapped(null); setSkipped(0); }}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Choose different file
                </button>
              </div>

              <div className="rounded-xl border border-border/60 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/30 border-b border-border/60">
                        {PREVIEW_COLS.map((col) => (
                          <th
                            key={col}
                            className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                          >
                            {col.replace(/_/g, " ")}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {mapped.slice(0, 5).map((row, i) => (
                        <tr key={i} className="hover:bg-accent/30">
                          {PREVIEW_COLS.map((col) => (
                            <td
                              key={col}
                              className="px-3 py-2 truncate max-w-[160px]"
                            >
                              {row[col as keyof MappedRow] || (
                                <span className="text-muted-foreground/50">—</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {mapped.length > 5 && (
                  <div className="px-3 py-2 bg-muted/20 border-t border-border/60 text-xs text-muted-foreground">
                    + {mapped.length - 5} more rows
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/60 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-border/60 px-3 py-1.5 text-sm hover:bg-accent"
          >
            Cancel
          </button>
          <button
            onClick={doImport}
            disabled={!mapped || mapped.length === 0 || importing}
            className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-4 py-1.5 text-sm shadow-glow disabled:opacity-50"
          >
            {importing ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Importing…</>
            ) : (
              <>Import {mapped ? `${mapped.length} leads` : "all"}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
