import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import {
  BarChart3, Download, FileSpreadsheet, TrendingUp, Loader2,
  Users, Briefcase, Calendar, MessageSquare,
} from "lucide-react";

export const Route = createFileRoute("/app/reports")({
  component: Reports,
});

// ── CSV helper ─────────────────────────────────────────────────────

function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const csv = rows
    .map((r) =>
      r.map((c) => {
        const s = String(c ?? "");
        return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(",")
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Funnel config ──────────────────────────────────────────────────

const FUNNEL_STAGES = [
  { label: "Total leads", statuses: null },
  { label: "Contacted", statuses: ["Contacted", "Replied", "Follow Up", "Meeting Booked", "Interested", "Deal Room Created"] },
  { label: "Replied", statuses: ["Replied", "Follow Up", "Meeting Booked", "Interested", "Deal Room Created"] },
  { label: "Meeting", statuses: ["Meeting Booked", "Interested", "Deal Room Created"] },
  { label: "Interested", statuses: ["Interested", "Deal Room Created"] },
  { label: "Deal Room", statuses: ["Deal Room Created"] },
] as const;

// ── Component ──────────────────────────────────────────────────────

function Reports() {
  const { user } = useAuth();

  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ["reports-leads", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vc_leads")
        .select("*")
        .eq("founder_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { data: startup } = useQuery({
    queryKey: ["reports-startup", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("startups")
        .select("id, company_name")
        .eq("founder_id", user!.id)
        .limit(1)
        .maybeSingle();
      return data as { id: string; company_name: string } | null;
    },
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ["reports-deal-rooms", startup?.id],
    enabled: !!startup?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_rooms")
        .select("id, status, created_at, deal_room_members(count), deal_room_documents(count)")
        .eq("startup_id", startup!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["reports-activities", startup?.id],
    enabled: !!startup?.id,
    queryFn: async () => {
      if (!startup?.id) return [];
      const roomIds = rooms.map((r: any) => r.id);
      if (roomIds.length === 0) return [];
      const { data, error } = await supabase
        .from("activities")
        .select("id, action, created_at, actor_id, deal_room_id")
        .in("deal_room_id", roomIds)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { data: meetings = [] } = useQuery({
    queryKey: ["reports-meetings", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meetings")
        .select("id, title, meeting_date, meeting_type, status, vc_lead_id")
        .eq("founder_id", user!.id)
        .order("meeting_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const isLoading = leadsLoading;

  // ── Funnel calculations ──────────────────────────────────────────

  const funnelCounts = FUNNEL_STAGES.map(({ statuses }) =>
    statuses === null
      ? leads.length
      : leads.filter((l) => statuses.includes(l.status as any)).length
  );

  const maxCount = Math.max(...funnelCounts, 1);

  // ── Key metrics ──────────────────────────────────────────────────

  const total = leads.length;
  const contactedCount = leads.filter((l) =>
    ["Contacted", "Replied", "Follow Up", "Meeting Booked", "Interested", "Deal Room Created"].includes(l.status)
  ).length;
  const repliedCount = leads.filter((l) =>
    ["Replied", "Follow Up", "Meeting Booked", "Interested", "Deal Room Created"].includes(l.status)
  ).length;
  const meetingCount = leads.filter((l) =>
    ["Meeting Booked", "Interested", "Deal Room Created"].includes(l.status)
  ).length;
  const activeRooms = rooms.filter((r: any) => r.status !== "closed").length;

  const pct = (n: number) => total > 0 ? `${Math.round((n / total) * 100)}%` : "—";

  const metrics = [
    { label: "Total leads", value: String(total), sub: "in your pipeline", icon: Users, tint: "bg-brand/10 text-brand" },
    { label: "Reply rate", value: pct(repliedCount), sub: `${repliedCount} replied`, icon: MessageSquare, tint: "bg-violet/10 text-violet" },
    { label: "Meeting rate", value: pct(meetingCount), sub: `${meetingCount} booked`, icon: Calendar, tint: "bg-success/10 text-success" },
    { label: "Active deal rooms", value: String(activeRooms), sub: `${rooms.length} total`, icon: Briefcase, tint: "bg-warning/10 text-warning" },
  ];

  // ── Download handlers ────────────────────────────────────────────

  const downloadLeads = () => {
    const header = ["Name", "Firm", "Status", "Ticket Size", "Sector", "Stage", "Email", "Updated At"];
    const rows = leads.map((l) => [
      l.investor_name, l.firm_name, l.status, l.ticket_size,
      l.sector, l.investment_stage, l.email,
      l.updated_at ? new Date(l.updated_at).toLocaleDateString() : "",
    ]);
    downloadCsv("vc-lead-list.csv", [header, ...rows]);
  };

  const downloadDealRooms = () => {
    const header = ["Room ID", "Status", "Created At", "Documents", "Members"];
    const rows = rooms.map((r: any) => [
      r.id.slice(0, 8),
      r.status,
      r.created_at ? new Date(r.created_at).toLocaleDateString() : "",
      r.deal_room_documents?.[0]?.count ?? 0,
      r.deal_room_members?.[0]?.count ?? 0,
    ]);
    downloadCsv("deal-room-report.csv", [header, ...rows]);
  };

  const downloadActivities = () => {
    const header = ["Actor ID", "Action", "Deal Room ID", "Date"];
    const rows = activities.map((a: any) => [
      a.actor_id?.slice(0, 8) ?? "",
      a.action,
      a.deal_room_id?.slice(0, 8) ?? "",
      a.created_at ? new Date(a.created_at).toLocaleDateString() : "",
    ]);
    downloadCsv("activity-log.csv", [header, ...rows]);
  };

  const downloadMeetings = () => {
    const header = ["Title", "Date", "Type", "Status", "Lead ID"];
    const rows = meetings.map((m: any) => [
      m.title,
      m.meeting_date ? new Date(m.meeting_date).toLocaleDateString() : "",
      m.meeting_type,
      m.status,
      m.vc_lead_id?.slice(0, 8) ?? "",
    ]);
    downloadCsv("meeting-log.csv", [header, ...rows]);
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-brand" />
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Pipeline analytics and downloadable reports.</p>
      </div>

      {/* Section 1 — Pipeline funnel */}
      <div className="rounded-xl border border-border/60 bg-card p-6 shadow-card">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp className="h-4 w-4 text-brand" />
          <div className="font-semibold">Pipeline funnel</div>
        </div>
        {total === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No leads yet. Add VC leads to see your funnel.</div>
        ) : (
          <div className="space-y-3">
            {FUNNEL_STAGES.map(({ label }, i) => {
              const count = funnelCounts[i];
              const prev = i === 0 ? count : funnelCounts[i - 1];
              const barPct = Math.round((count / maxCount) * 100);
              const conv = prev > 0 && i > 0 ? `${Math.round((count / prev) * 100)}%` : null;
              return (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-28 text-xs text-muted-foreground shrink-0">{label}</div>
                  <div className="flex-1 h-7 rounded-md bg-muted/40 overflow-hidden relative">
                    <div
                      className="h-full rounded-md bg-gradient-brand transition-all duration-500"
                      style={{ width: `${barPct}%` }}
                    />
                    {count > 0 && (
                      <div className="absolute inset-y-0 left-2 flex items-center text-[10px] font-medium text-brand-foreground mix-blend-overlay">
                        {count} lead{count !== 1 ? "s" : ""}
                      </div>
                    )}
                  </div>
                  <div className="w-12 text-right shrink-0">
                    <div className="text-xs font-semibold tabular-nums">{count}</div>
                    {conv && <div className="text-[10px] text-muted-foreground">{conv}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2 — Download reports */}
      <div className="rounded-xl border border-border/60 bg-card p-6 shadow-card">
        <div className="flex items-center gap-2 mb-5">
          <Download className="h-4 w-4 text-brand" />
          <div className="font-semibold">Download reports</div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            {
              label: "VC Lead List",
              desc: `${leads.length} leads with status, firm, ticket size`,
              onClick: downloadLeads,
              disabled: leads.length === 0,
            },
            {
              label: "Deal Room Report",
              desc: `${rooms.length} rooms with docs and member counts`,
              onClick: downloadDealRooms,
              disabled: rooms.length === 0,
            },
            {
              label: "Activity Log",
              desc: `${activities.length} recent deal room activities`,
              onClick: downloadActivities,
              disabled: activities.length === 0,
            },
            {
              label: "Meeting Log",
              desc: `${meetings.length} meetings with dates and status`,
              onClick: downloadMeetings,
              disabled: meetings.length === 0,
            },
          ].map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              disabled={item.disabled}
              className="flex items-start gap-3 rounded-lg border border-border/60 p-4 text-left hover:bg-accent hover:border-brand/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-muted shrink-0 group-hover:bg-brand/10 transition-colors">
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground group-hover:text-brand" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{item.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
              </div>
              <Download className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </div>

      {/* Section 3 — Key metrics */}
      <div>
        <div className="font-semibold mb-4">Key metrics</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-xl border border-border/60 bg-card p-4 shadow-card">
              <div className={`grid h-8 w-8 place-items-center rounded-lg mb-3 ${m.tint}`}>
                <m.icon className="h-4 w-4" />
              </div>
              <div className="text-xl font-semibold tabular-nums">{m.value}</div>
              <div className="text-xs font-medium mt-0.5">{m.label}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{m.sub}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-border/60 bg-card p-4 shadow-card">
            <div className="text-xs text-muted-foreground mb-1">Contacted rate</div>
            <div className="text-xl font-semibold tabular-nums">{pct(contactedCount)}</div>
            <div className="text-[11px] text-muted-foreground">{contactedCount} of {total} reached out</div>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-4 shadow-card">
            <div className="text-xs text-muted-foreground mb-1">Total meetings</div>
            <div className="text-xl font-semibold tabular-nums">{meetings.length}</div>
            <div className="text-[11px] text-muted-foreground">across all investors</div>
          </div>
        </div>
      </div>
    </div>
  );
}
