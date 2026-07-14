import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import {
  Plus, Upload, X, Search, ChevronRight, ExternalLink,
  Loader2, Users, Building2, Mail, Globe, MapPin, DollarSign,
  Circle, CheckCircle2, Clock, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import Papa from "papaparse";
import { EmptyState } from "@/components/system";

export const Route = createFileRoute("/app/connections")({
  component: ConnectionsPage,
});

// ── Types ─────────────────────────────────────────────────────────────────

type LeadStatus =
  | "New"
  | "Shortlisted"
  | "Contacted"
  | "Replied"
  | "Meeting Booked"
  | "Interested"
  | "Deal Room Created"
  | "Follow Up"
  | "Rejected";

interface VCLead {
  id: string;
  founder_id: string;
  investor_name: string;
  firm_name?: string | null;
  email?: string | null;
  linkedin_url?: string | null;
  website?: string | null;
  sector?: string | null;
  stage?: string | null;
  geography?: string | null;
  ticket_size?: string | null;
  status: LeadStatus;
  notes?: string | null;
  source?: string | null;
  follow_up_date?: string | null;
  last_contacted?: string | null;
  next_action?: string | null;
  created_at: string;
  updated_at: string;
}

const ALL_STATUSES: LeadStatus[] = [
  "New", "Shortlisted", "Contacted", "Replied",
  "Meeting Booked", "Interested", "Deal Room Created", "Follow Up", "Rejected",
];

const STATUS_CONFIG: Record<LeadStatus, { bg: string; text: string; step: number }> = {
  "New":               { bg: "var(--accent)", text: "var(--muted-foreground)", step: 0 },
  "Shortlisted":       { bg: "var(--accent)", text: "var(--muted-foreground)", step: 1 },
  "Contacted":         { bg: "rgba(124,58,237,0.15)",  text: "#A855F7",               step: 2 },
  "Replied":           { bg: "rgba(139,92,246,0.15)",  text: "#8B5CF6",               step: 3 },
  "Meeting Booked":    { bg: "rgba(245,158,11,0.15)",  text: "#F59E0B",               step: 4 },
  "Interested":        { bg: "rgba(245,158,11,0.18)",  text: "#FBBF24",               step: 5 },
  "Deal Room Created": { bg: "rgba(16,185,129,0.15)",  text: "#10B981",               step: 6 },
  "Follow Up":         { bg: "rgba(124,58,237,0.10)",  text: "#A855F7",               step: 2 },
  "Rejected":          { bg: "rgba(239,68,68,0.12)",   text: "#EF4444",               step: -1 },
};

const PIPELINE_STEPS: LeadStatus[] = [
  "New", "Shortlisted", "Contacted", "Replied", "Meeting Booked", "Interested", "Deal Room Created",
];

// ── Slide-over: Add Investor ──────────────────────────────────────────────

interface AddInvestorProps {
  founderId: string;
  onClose: () => void;
  onSaved: () => void;
}

function AddInvestorSlideOver({ founderId, onClose, onSaved }: AddInvestorProps) {
  const [form, setForm] = useState({
    investor_name: "", firm_name: "", email: "", linkedin_url: "",
    website: "", sector: "", stage: "", geography: "", ticket_size: "",
    status: "New" as LeadStatus, source: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.investor_name.trim()) { toast.error("Investor name is required"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("vc_leads").insert({
        founder_id: founderId,
        investor_name: form.investor_name.trim(),
        firm_name: form.firm_name || null,
        email: form.email || null,
        linkedin_url: form.linkedin_url || null,
        website: form.website || null,
        sector: form.sector || null,
        stage: form.stage || null,
        geography: form.geography || null,
        ticket_size: form.ticket_size || null,
        status: form.status,
        source: form.source || null,
        notes: form.notes || null,
      });
      if (error) throw error;
      toast.success("Investor added");
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to add investor");
    } finally {
      setSaving(false);
    }
  };

  const inp = "w-full rounded-lg px-3 py-2 text-sm outline-none";
  const inpStyle = { background: "var(--hs-bg-primary)", border: "1px solid var(--hs-border)", color: "var(--hs-text-primary)" };
  const label = "block text-xs font-medium mb-1";
  const labelStyle = { color: "var(--hs-text-secondary)" };

  return (
    <div className="fixed inset-0 z-50 flex" data-testid="add-investor-slideover">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative ml-auto h-full w-full max-w-[440px] flex flex-col overflow-hidden"
        style={{ background: "var(--hs-bg-secondary)", borderLeft: "1px solid var(--hs-border)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--hs-border)" }}>
          <div className="text-base font-semibold" style={{ fontFamily: "Syne, sans-serif", color: "var(--hs-text-primary)" }}>
            Add investor
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 transition-colors hover:bg-accent">
            <X className="h-4 w-4" style={{ color: "var(--hs-text-muted)" }} />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className={label} style={labelStyle}>Investor name *</label>
            <input className={inp} style={inpStyle} value={form.investor_name} onChange={(e) => set("investor_name", e.target.value)} placeholder="Jane Smith" />
          </div>
          <div>
            <label className={label} style={labelStyle}>Fund / firm</label>
            <input className={inp} style={inpStyle} value={form.firm_name} onChange={(e) => set("firm_name", e.target.value)} placeholder="Sequoia Capital" />
          </div>
          <div>
            <label className={label} style={labelStyle}>Email</label>
            <input className={inp} style={inpStyle} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="jane@fund.com" />
          </div>
          <div>
            <label className={label} style={labelStyle}>LinkedIn URL</label>
            <input className={inp} style={inpStyle} value={form.linkedin_url} onChange={(e) => set("linkedin_url", e.target.value)} placeholder="https://linkedin.com/in/..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label} style={labelStyle}>Stage focus</label>
              <input className={inp} style={inpStyle} value={form.stage} onChange={(e) => set("stage", e.target.value)} placeholder="Seed, Series A" />
            </div>
            <div>
              <label className={label} style={labelStyle}>Check size</label>
              <input className={inp} style={inpStyle} value={form.ticket_size} onChange={(e) => set("ticket_size", e.target.value)} placeholder="$250K–$1M" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label} style={labelStyle}>Sector</label>
              <input className={inp} style={inpStyle} value={form.sector} onChange={(e) => set("sector", e.target.value)} placeholder="Fintech, SaaS" />
            </div>
            <div>
              <label className={label} style={labelStyle}>Geography</label>
              <input className={inp} style={inpStyle} value={form.geography} onChange={(e) => set("geography", e.target.value)} placeholder="MENA, UAE" />
            </div>
          </div>
          <div>
            <label className={label} style={labelStyle}>Status</label>
            <select className={inp} style={{ ...inpStyle, cursor: "pointer" }} value={form.status} onChange={(e) => set("status", e.target.value as LeadStatus)}>
              {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={label} style={labelStyle}>Source</label>
            <input className={inp} style={inpStyle} value={form.source} onChange={(e) => set("source", e.target.value)} placeholder="LinkedIn, Referral, Event" />
          </div>
          <div>
            <label className={label} style={labelStyle}>Notes</label>
            <textarea className={inp} style={{ ...inpStyle, minHeight: 80, resize: "vertical" }} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Context, mutual connections, next steps…" />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex gap-3" style={{ borderTop: "1px solid var(--hs-border)" }}>
          <button onClick={onClose} className="flex-1 rounded-lg py-2 text-sm font-medium"
            style={{ background: "var(--hs-bg-primary)", border: "1px solid var(--hs-border)", color: "var(--hs-text-secondary)" }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 rounded-lg py-2 text-sm font-medium flex items-center justify-center gap-2"
            style={{ background: "var(--gradient-brand)", color: "#fff" }}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {saving ? "Saving…" : "Add investor"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── CSV Import Modal ──────────────────────────────────────────────────────

function CSVImportModal({ founderId, onClose, onImported }: { founderId: string; onClose: () => void; onImported: () => void }) {
  const [rows, setRows] = useState<Partial<VCLead>[]>([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const parsed = result.data.map((row) => ({
          investor_name: row["investor_name"] || row["name"] || row["Investor Name"] || "",
          firm_name: row["firm_name"] || row["firm"] || row["Fund"] || null,
          email: row["email"] || row["Email"] || null,
          linkedin_url: row["linkedin_url"] || row["linkedin"] || null,
          stage: row["stage"] || row["Stage Focus"] || null,
          sector: row["sector"] || row["Sector"] || null,
          geography: row["geography"] || row["Geography"] || null,
          ticket_size: row["ticket_size"] || row["Check Size"] || null,
          status: ("New") as LeadStatus,
          source: "CSV Import",
        })).filter((r) => r.investor_name.trim() !== "");
        setRows(parsed);
      },
    });
  };

  const handleImport = async () => {
    if (rows.length === 0) return;
    setImporting(true);
    try {
      const inserts = rows.map((r) => ({ ...r, founder_id: founderId }));
      const { error } = await supabase.from("vc_leads").insert(inserts);
      if (error) throw error;
      toast.success(`${rows.length} investors imported`);
      onImported();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" data-testid="csv-import-modal">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-[520px] rounded-2xl overflow-hidden"
        style={{ background: "var(--hs-bg-secondary)", border: "1px solid var(--hs-border)" }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--hs-border)" }}>
          <div className="text-base font-semibold" style={{ fontFamily: "Syne, sans-serif", color: "var(--hs-text-primary)" }}>
            Import from CSV
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-accent transition-colors">
            <X className="h-4 w-4" style={{ color: "var(--hs-text-muted)" }} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {rows.length === 0 ? (
            <>
              <div
                className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center py-10 cursor-pointer transition-colors hover:border-brand"
                style={{ borderColor: "rgba(124,58,237,0.3)", background: "rgba(124,58,237,0.04)" }}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              >
                <Upload className="h-8 w-8 mb-2" style={{ color: "#A855F7" }} />
                <div className="text-sm font-medium" style={{ color: "var(--hs-text-primary)" }}>Drop a CSV file here</div>
                <div className="text-xs mt-1" style={{ color: "var(--hs-text-muted)" }}>or click to browse</div>
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </div>
              <div className="text-xs rounded-lg px-3 py-2" style={{ background: "rgba(124,58,237,0.06)", color: "var(--hs-text-secondary)", border: "1px solid rgba(124,58,237,0.15)" }}>
                Expected columns: <span className="font-mono">investor_name, firm_name, email, stage, sector, geography, ticket_size, linkedin_url</span>
              </div>
            </>
          ) : (
            <>
              <div className="text-sm font-medium" style={{ color: "var(--hs-text-primary)" }}>
                {rows.length} investors found — preview:
              </div>
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--hs-border)", maxHeight: 240, overflowY: "auto" }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: "var(--hs-bg-primary)" }}>
                      <th className="px-3 py-2 text-left font-medium" style={{ color: "var(--hs-text-muted)" }}>Name</th>
                      <th className="px-3 py-2 text-left font-medium" style={{ color: "var(--hs-text-muted)" }}>Fund</th>
                      <th className="px-3 py-2 text-left font-medium" style={{ color: "var(--hs-text-muted)" }}>Stage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 20).map((r, i) => (
                      <tr key={i} style={{ borderTop: "1px solid var(--hs-border)" }}>
                        <td className="px-3 py-2" style={{ color: "var(--hs-text-primary)" }}>{r.investor_name}</td>
                        <td className="px-3 py-2" style={{ color: "var(--hs-text-secondary)" }}>{r.firm_name ?? "—"}</td>
                        <td className="px-3 py-2" style={{ color: "var(--hs-text-secondary)" }}>{r.stage ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 20 && (
                <div className="text-xs" style={{ color: "var(--hs-text-muted)" }}>+{rows.length - 20} more not shown</div>
              )}
            </>
          )}
        </div>

        <div className="px-6 py-4 flex gap-3" style={{ borderTop: "1px solid var(--hs-border)" }}>
          <button onClick={onClose} className="flex-1 rounded-lg py-2 text-sm font-medium"
            style={{ background: "var(--hs-bg-primary)", border: "1px solid var(--hs-border)", color: "var(--hs-text-secondary)" }}>
            Cancel
          </button>
          {rows.length > 0 && (
            <button onClick={handleImport} disabled={importing} className="flex-1 rounded-lg py-2 text-sm font-medium flex items-center justify-center gap-2"
              style={{ background: "var(--gradient-brand)", color: "#fff" }}>
              {importing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {importing ? "Importing…" : `Import ${rows.length} investors`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Detail Panel ──────────────────────────────────────────────────────────

function DetailPanel({ lead, onClose, onStatusChange }: { lead: VCLead; onClose: () => void; onStatusChange: (id: string, status: LeadStatus) => Promise<void> }) {
  const cfg = STATUS_CONFIG[lead.status] ?? STATUS_CONFIG["New"];
  const stepIndex = PIPELINE_STEPS.indexOf(lead.status);

  return (
    <div className="flex flex-col h-full" data-testid="detail-panel">
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--hs-border)" }}>
        <div className="flex items-center gap-3 min-w-0">
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(124,58,237,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span className="text-base font-bold" style={{ color: "#A855F7" }}>{lead.investor_name[0]?.toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate" style={{ color: "var(--hs-text-primary)" }}>{lead.investor_name}</div>
            {lead.firm_name && <div className="text-xs truncate" style={{ color: "var(--hs-text-muted)" }}>{lead.firm_name}</div>}
          </div>
        </div>
        <button onClick={onClose} className="rounded-lg p-1 hover:bg-accent transition-colors ml-2 flex-shrink-0">
          <X className="h-4 w-4" style={{ color: "var(--hs-text-muted)" }} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Status badge + change */}
        <div className="flex items-center gap-2 flex-wrap">
          <span style={{ background: cfg.bg, color: cfg.text, borderRadius: 99, padding: "4px 12px", fontSize: 12, fontWeight: 600 }}>
            {lead.status}
          </span>
          <select
            value={lead.status}
            onChange={(e) => onStatusChange(lead.id, e.target.value as LeadStatus)}
            className="text-xs rounded-lg px-2 py-1 outline-none cursor-pointer"
            style={{ background: "var(--hs-bg-primary)", border: "1px solid var(--hs-border)", color: "var(--hs-text-secondary)" }}
          >
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Pipeline progress */}
        {lead.status !== "Rejected" && (
          <div>
            <div className="text-xs font-medium mb-2" style={{ color: "var(--hs-text-muted)" }}>Pipeline progress</div>
            <div className="flex items-center gap-1">
              {PIPELINE_STEPS.map((step, i) => {
                const done = stepIndex >= i;
                const isCurrent = stepIndex === i;
                return (
                  <div key={step} className="flex items-center gap-1 flex-1">
                    <div className="flex flex-col items-center">
                      <div style={{
                        width: 20, height: 20, borderRadius: "50%",
                        background: done ? "var(--gradient-brand)" : "var(--accent)",
                        border: isCurrent ? "2px solid #A855F7" : "2px solid transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {done && <CheckCircle2 className="h-3 w-3" style={{ color: "var(--foreground)" }} />}
                      </div>
                      <div className="text-[9px] mt-1 text-center" style={{ color: done ? "var(--hs-text-secondary)" : "var(--hs-text-muted)", whiteSpace: "nowrap" }}>
                        {step === "Deal Room Created" ? "Deal Room" : step}
                      </div>
                    </div>
                    {i < PIPELINE_STEPS.length - 1 && (
                      <div className="flex-1 h-0.5 mb-4" style={{ background: stepIndex > i ? "var(--gradient-brand)" : "var(--accent)" }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Contact info */}
        <div className="space-y-2">
          {lead.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--hs-text-muted)" }} />
              <a href={`mailto:${lead.email}`} className="text-xs hover:underline truncate" style={{ color: "var(--hs-purple)" }}>{lead.email}</a>
            </div>
          )}
          {lead.linkedin_url && (
            <div className="flex items-center gap-2">
              <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--hs-text-muted)" }} />
              <a href={lead.linkedin_url} target="_blank" rel="noreferrer" className="text-xs hover:underline truncate" style={{ color: "var(--hs-purple)" }}>LinkedIn</a>
            </div>
          )}
          {lead.website && (
            <div className="flex items-center gap-2">
              <Globe className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--hs-text-muted)" }} />
              <a href={lead.website} target="_blank" rel="noreferrer" className="text-xs hover:underline truncate" style={{ color: "var(--hs-purple)" }}>{lead.website}</a>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Stage focus", value: lead.stage, icon: ArrowRight },
            { label: "Check size", value: lead.ticket_size, icon: DollarSign },
            { label: "Sector", value: lead.sector, icon: Building2 },
            { label: "Geography", value: lead.geography, icon: MapPin },
          ].filter((f) => f.value).map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-lg px-3 py-2.5" style={{ background: "var(--hs-bg-primary)", border: "1px solid var(--hs-border)" }}>
              <div className="text-[10px] uppercase tracking-wider font-medium mb-1" style={{ color: "var(--hs-text-muted)" }}>{label}</div>
              <div className="text-xs font-medium" style={{ color: "var(--hs-text-primary)" }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Source */}
        {lead.source && (
          <div className="text-xs" style={{ color: "var(--hs-text-muted)" }}>
            Source: <span style={{ color: "var(--hs-text-secondary)" }}>{lead.source}</span>
          </div>
        )}

        {/* Notes */}
        {lead.notes && (
          <div className="rounded-xl p-4" style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.15)" }}>
            <div className="text-[10px] uppercase tracking-wider font-medium mb-2" style={{ color: "#A855F7" }}>Notes</div>
            <div className="text-xs whitespace-pre-wrap" style={{ color: "var(--hs-text-secondary)" }}>{lead.notes}</div>
          </div>
        )}

        {/* Next action */}
        {lead.next_action && (
          <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <Clock className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "#F59E0B" }} />
            <div>
              <div className="text-[10px] uppercase tracking-wider font-medium mb-1" style={{ color: "#F59E0B" }}>Next action</div>
              <div className="text-xs" style={{ color: "var(--hs-text-secondary)" }}>{lead.next_action}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

// ── Incoming connection requests (investor → founder) ─────────────────────
// Approve is CONFIRM-FIRST: it creates a deal room visible to the investor,
// so the confirmation card below must be acknowledged before the call.

function IncomingRequests() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const { data: requests = [] } = useQuery({
    queryKey: ["incoming-connection-requests", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: myStartups } = await supabase
        .from("startups").select("id, company_name").eq("founder_id", user!.id);
      const startupIds = (myStartups ?? []).map((s: any) => s.id);
      if (!startupIds.length) return [];

      const { data: reqs } = await supabase
        .from("discovery_requests")
        .select("id, investor_id, startup_id, status, message, created_at")
        .in("startup_id", startupIds)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (!reqs?.length) return [];

      const { data: profiles } = await supabase
        .from("investor_profiles")
        .select("user_id, your_name, fund_name, sectors, stages, check_size_min, check_size_max")
        .in("user_id", reqs.map((r: any) => r.investor_id));
      const pmap = Object.fromEntries((profiles ?? []).map((p: any) => [p.user_id, p]));
      return reqs.map((r: any) => ({ ...r, profile: pmap[r.investor_id] ?? null }));
    },
  });

  const navigate = useNavigate();

  const approve = async (requestId: string) => {
    setActingId(requestId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Session expired — sign in again"); return; }
      const { approveConnectionRequest } = await import("@/lib/connection-request-fn");
      const result = await approveConnectionRequest({
        data: { userAccessToken: session.access_token, requestId },
      });
      if (result.ok && result.dealRoomId) {
        toast.success("Deal room created — investor notified");
        qc.invalidateQueries({ queryKey: ["incoming-connection-requests", user?.id] });
        qc.invalidateQueries({ queryKey: ["vc-leads", user?.id] });
        navigate({ to: "/app/deal-room/$id", params: { id: result.dealRoomId } });
      } else {
        toast.error("Could not create deal room. Please try again.");
      }
    } catch (e) {
      console.error("approveConnectionRequest failed:", e);
      toast.error("Could not create deal room. Please try again.");
    } finally {
      setActingId(null);
      setConfirmId(null);
    }
  };

  const decline = async (requestId: string) => {
    setActingId(requestId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Session expired — sign in again"); return; }
      const { declineConnectionRequest } = await import("@/lib/connection-request-fn");
      const result = await declineConnectionRequest({
        data: { userAccessToken: session.access_token, requestId },
      });
      if (result.ok) {
        toast.success("Request declined");
        qc.invalidateQueries({ queryKey: ["incoming-connection-requests", user?.id] });
      } else {
        toast.error("Could not decline request.");
      }
    } catch (e) {
      console.error("declineConnectionRequest failed:", e);
      toast.error("Could not decline request.");
    } finally {
      setActingId(null);
    }
  };

  const daysAgo = (iso: string) => {
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    if (d === 0) return "today";
    if (d === 1) return "1 day ago";
    return `${d} days ago`;
  };

  if (!requests.length) return null;

  return (
    <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--hs-border)", background: "rgba(124,58,237,0.04)" }}>
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-4 w-4 text-brand" />
        <span className="text-sm font-semibold" style={{ color: "var(--hs-text-primary)" }}>
          Connection requests
        </span>
        <span className="inline-flex items-center justify-center h-5 min-w-[20px] rounded-full hs-gradient text-brand-foreground text-[10px] font-semibold px-1.5">
          {requests.length}
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {requests.map((r: any) => {
          const name = r.profile?.your_name ?? "Investor";
          const fund = r.profile?.fund_name;
          const thesis = [r.profile?.sectors, r.profile?.stages,
            r.profile?.check_size_min ? `$${r.profile.check_size_min}${r.profile?.check_size_max ? `–$${r.profile.check_size_max}` : "+"}` : null,
          ].filter(Boolean).join(" · ");
          return (
            <div key={r.id} className="rounded-xl border border-border/60 bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate" style={{ color: "var(--hs-text-primary)" }}>
                    {name}{fund ? <span className="font-normal text-muted-foreground"> · {fund}</span> : null}
                  </div>
                  {thesis && <div className="text-xs text-muted-foreground mt-0.5 truncate">{thesis}</div>}
                  {r.message && (
                    <div className="text-xs mt-2 rounded-lg px-3 py-2" style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)", color: "var(--hs-text-secondary)" }}>
                      “{r.message}”
                    </div>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {daysAgo(r.created_at)}
                </span>
              </div>

              {confirmId === r.id ? (
                <div className="mt-3 rounded-lg px-3 py-3" style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)" }}>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--hs-text-secondary)" }}>
                    This will create a deal room with <span className="font-semibold text-foreground">{name}</span>.
                    They'll be notified immediately and can view your Information Vault after signing the NDA. Proceed?
                  </p>
                  <div className="mt-2.5 flex gap-2">
                    <button
                      onClick={() => approve(r.id)}
                      disabled={actingId === r.id}
                      className="flex items-center gap-1.5 rounded-lg hs-gradient text-brand-foreground px-3 py-1.5 text-xs font-semibold hover:bg-accent disabled:opacity-60"
                    >
                      {actingId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                      Confirm
                    </button>
                    <button
                      onClick={() => setConfirmId(null)}
                      disabled={actingId === r.id}
                      className="rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setConfirmId(r.id)}
                    disabled={!!actingId}
                    className="flex items-center gap-1.5 rounded-lg hs-gradient text-brand-foreground px-3 py-1.5 text-xs font-semibold hover:bg-accent disabled:opacity-60"
                  >
                    Open deal room <ArrowRight className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => decline(r.id)}
                    disabled={!!actingId}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-60"
                  >
                    {actingId === r.id ? "…" : "Decline"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ConnectionsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [showCSV, setShowCSV] = useState(false);
  const [selected, setSelected] = useState<VCLead | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");

  // ── Load leads
  const { data: leads = [], isLoading } = useQuery<VCLead[]>({
    queryKey: ["vc-leads", user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("vc_leads")
        .select("*")
        .eq("founder_id", user!.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as VCLead[];
    },
  });

  const handleStatusChange = async (id: string, status: LeadStatus) => {
    const { error } = await supabase.from("vc_leads").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) { console.error("[connections] status change failed:", error); toast.error("Could not update status."); return; }
    qc.setQueryData<VCLead[]>(["vc-leads", user?.id], (prev) =>
      prev?.map((l) => l.id === id ? { ...l, status } : l) ?? []
    );
    if (selected?.id === id) setSelected((prev) => prev ? { ...prev, status } : prev);
  };

  // ── Filter
  const filtered = leads.filter((l) => {
    const matchSearch = !search ||
      l.investor_name.toLowerCase().includes(search.toLowerCase()) ||
      (l.firm_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (l.sector ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // ── Pipeline summary counts
  const statusCounts = ALL_STATUSES.map((s) => ({ status: s, count: leads.filter((l) => l.status === s).length }));
  const activeCount = leads.filter((l) => l.status !== "Rejected").length;

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--hs-bg-primary)" }}>
      {/* ── Header bar */}
      <div className="flex items-center justify-between px-6 py-5 flex-wrap gap-4" style={{ borderBottom: "1px solid var(--hs-border)" }}>
        <div>
          <h1 className="text-lg font-bold tracking-tight" style={{ fontFamily: "Syne, sans-serif", color: "var(--hs-text-primary)" }}>
            Connections
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--hs-text-muted)" }}>
            {leads.length === 0 ? "Track every investor relationship in one place" : `${activeCount} active ${activeCount === 1 ? "investor" : "investors"} in your pipeline`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCSV(true)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            style={{ background: "var(--hs-bg-secondary)", border: "1px solid var(--hs-border)", color: "var(--hs-text-secondary)" }}
            data-testid="import-csv-btn"
          >
            <Upload className="h-3.5 w-3.5" />
            Import CSV
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            style={{ background: "var(--gradient-brand)", color: "#fff" }}
            data-testid="add-investor-btn"
          >
            <Plus className="h-3.5 w-3.5" />
            Add investor
          </button>
        </div>
      </div>

      {/* ── Incoming connection requests */}
      <IncomingRequests />

      {/* ── Summary strip */}
      {leads.length > 0 && (
        <div className="flex items-center gap-4 px-6 py-3 overflow-x-auto" style={{ borderBottom: "1px solid var(--hs-border)", background: "var(--hs-bg-secondary)" }}>
          <button
            onClick={() => setStatusFilter("all")}
            className={cn("text-xs font-medium whitespace-nowrap rounded-full px-3 py-1 transition-colors", statusFilter === "all" ? "text-brand" : "text-muted-foreground hover:text-foreground")}
            style={{ background: statusFilter === "all" ? "rgba(124,58,237,0.12)" : "transparent" }}
          >
            All ({leads.length})
          </button>
          {statusCounts.filter((s) => s.count > 0).map(({ status, count }) => {
            const cfg = STATUS_CONFIG[status];
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(statusFilter === status ? "all" : status)}
                className="flex items-center gap-1.5 text-xs font-medium whitespace-nowrap rounded-full px-3 py-1 transition-colors"
                style={{
                  background: statusFilter === status ? cfg.bg : "transparent",
                  color: statusFilter === status ? cfg.text : "var(--muted-foreground)",
                  border: statusFilter === status ? `1px solid ${cfg.text}30` : "1px solid transparent",
                }}
              >
                <Circle className="h-1.5 w-1.5" style={{ fill: cfg.text, color: cfg.text }} />
                {status} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* ── Two-panel layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* LEFT: table */}
        <div className={cn("flex flex-col min-w-0 flex-1 overflow-hidden", selected ? "hidden lg:flex" : "flex")}>
          {/* Search bar */}
          <div className="px-6 py-3" style={{ borderBottom: "1px solid var(--hs-border)" }}>
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "var(--hs-text-muted)" }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search investors or firms…"
                className="w-full rounded-lg pl-9 pr-3 py-2 text-sm outline-none"
                style={{ background: "var(--hs-bg-secondary)", border: "1px solid var(--hs-border)", color: "var(--hs-text-primary)" }}
                data-testid="search-input"
              />
            </div>
          </div>

          {/* Table header */}
          <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_1fr_80px_32px] gap-4 px-6 py-2" style={{ borderBottom: "1px solid var(--hs-border)", background: "var(--hs-bg-secondary)" }}>
            {["Investor / Fund", "Stage · Sector", "Geography", "Status", "Source", ""].map((h) => (
              <div key={h} className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "var(--hs-text-muted)" }}>{h}</div>
            ))}
          </div>

          {/* Rows */}
          <div className="flex-1 overflow-y-auto" data-testid="connections-table">
            {isLoading ? (
              <EmptyState kind="loading" title="Loading" />
            ) : filtered.length === 0 ? (
              <EmptyState
                kind={search || statusFilter !== "all" ? "no-results" : "empty"}
                title={search || statusFilter !== "all" ? "No matches" : "No investors"}
                action={
                  !search && statusFilter === "all"
                    ? { label: "Add investor", onClick: () => setShowAdd(true) }
                    : undefined
                }
              />
            ) : (
              filtered.map((lead) => {
                const cfg = STATUS_CONFIG[lead.status] ?? STATUS_CONFIG["New"];
                const isActive = selected?.id === lead.id;
                return (
                  <button
                    key={lead.id}
                    onClick={() => setSelected(isActive ? null : lead)}
                    className="w-full text-left transition-colors"
                    style={{
                      borderBottom: "1px solid var(--hs-border)",
                      background: isActive ? "rgba(124,58,237,0.06)" : "transparent",
                    }}
                    data-testid="lead-row"
                  >
                    <div className="grid md:grid-cols-[2fr_1.5fr_1fr_1fr_80px_32px] gap-4 items-center px-6 py-3">
                      {/* Investor / Fund */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(124,58,237,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span className="text-xs font-bold" style={{ color: "#A855F7" }}>{lead.investor_name[0]?.toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate" style={{ color: "var(--hs-text-primary)" }}>{lead.investor_name}</div>
                          {lead.firm_name && <div className="text-xs truncate" style={{ color: "var(--hs-text-muted)" }}>{lead.firm_name}</div>}
                        </div>
                      </div>
                      {/* Stage · Sector */}
                      <div className="hidden md:block min-w-0">
                        <div className="text-xs truncate" style={{ color: "var(--hs-text-secondary)" }}>
                          {[lead.stage, lead.sector].filter(Boolean).join(" · ") || "—"}
                        </div>
                      </div>
                      {/* Geography */}
                      <div className="hidden md:block">
                        <div className="text-xs" style={{ color: "var(--hs-text-secondary)" }}>{lead.geography ?? "—"}</div>
                      </div>
                      {/* Status */}
                      <div className="hidden md:block">
                        <span style={{ background: cfg.bg, color: cfg.text, borderRadius: 99, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>
                          {lead.status}
                        </span>
                      </div>
                      {/* Source */}
                      <div className="hidden md:block">
                        <div className="text-xs" style={{ color: "var(--hs-text-muted)" }}>{lead.source ?? "—"}</div>
                      </div>
                      {/* Arrow */}
                      <div className="flex justify-end">
                        <ChevronRight className="h-4 w-4" style={{ color: isActive ? "#A855F7" : "var(--hs-text-muted)" }} />
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT: detail panel */}
        {selected && (
          <div className="w-full lg:w-[380px] flex-shrink-0 flex flex-col overflow-hidden" style={{ borderLeft: "1px solid var(--hs-border)", background: "var(--hs-bg-secondary)" }}>
            <DetailPanel
              lead={selected}
              onClose={() => setSelected(null)}
              onStatusChange={handleStatusChange}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      {showAdd && user?.id && (
        <AddInvestorSlideOver
          founderId={user.id}
          onClose={() => setShowAdd(false)}
          onSaved={() => qc.invalidateQueries({ queryKey: ["vc-leads", user?.id] })}
        />
      )}
      {showCSV && user?.id && (
        <CSVImportModal
          founderId={user.id}
          onClose={() => setShowCSV(false)}
          onImported={() => qc.invalidateQueries({ queryKey: ["vc-leads", user?.id] })}
        />
      )}
    </div>
  );
}
