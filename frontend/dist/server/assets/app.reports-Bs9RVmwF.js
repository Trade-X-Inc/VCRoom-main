import { jsx, jsxs } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { u as useAuth, s as supabase } from "./router-C9QH749P.js";
import { Users, MessageSquare, Calendar, Briefcase, Loader2, BarChart3, TrendingUp, Download, FileSpreadsheet } from "lucide-react";
import "@tanstack/react-router";
import "react";
import "@supabase/supabase-js";
import "sonner";
import "clsx";
function downloadCsv(filename, rows) {
  const csv = rows.map((r) => r.map((c) => {
    const s = String(c ?? "");
    return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(",")).join("\n");
  const blob = new Blob([csv], {
    type: "text/csv"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
const FUNNEL_STAGES = [{
  label: "Total leads",
  statuses: null
}, {
  label: "Contacted",
  statuses: ["Contacted", "Replied", "Follow Up", "Meeting Booked", "Interested", "Deal Room Created"]
}, {
  label: "Replied",
  statuses: ["Replied", "Follow Up", "Meeting Booked", "Interested", "Deal Room Created"]
}, {
  label: "Meeting",
  statuses: ["Meeting Booked", "Interested", "Deal Room Created"]
}, {
  label: "Interested",
  statuses: ["Interested", "Deal Room Created"]
}, {
  label: "Deal Room",
  statuses: ["Deal Room Created"]
}];
function Reports() {
  const {
    user
  } = useAuth();
  const {
    data: leads = [],
    isLoading: leadsLoading
  } = useQuery({
    queryKey: ["reports-leads", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("vc_leads").select("*").eq("founder_id", user.id).order("updated_at", {
        ascending: false
      });
      if (error) throw error;
      return data ?? [];
    }
  });
  const {
    data: startup
  } = useQuery({
    queryKey: ["reports-startup", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const {
        data
      } = await supabase.from("startups").select("id, company_name").eq("founder_id", user.id).limit(1).maybeSingle();
      return data;
    }
  });
  const {
    data: rooms = []
  } = useQuery({
    queryKey: ["reports-deal-rooms", startup?.id],
    enabled: !!startup?.id,
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("deal_rooms").select("id, status, created_at, deal_room_members(count), deal_room_documents(count)").eq("startup_id", startup.id).order("created_at", {
        ascending: false
      });
      if (error) throw error;
      return data ?? [];
    }
  });
  const {
    data: activities = []
  } = useQuery({
    queryKey: ["reports-activities", startup?.id],
    enabled: !!startup?.id,
    queryFn: async () => {
      if (!startup?.id) return [];
      const roomIds = rooms.map((r) => r.id);
      if (roomIds.length === 0) return [];
      const {
        data,
        error
      } = await supabase.from("activities").select("id, action, created_at, actor_id, deal_room_id").in("deal_room_id", roomIds).order("created_at", {
        ascending: false
      }).limit(200);
      if (error) throw error;
      return data ?? [];
    }
  });
  const {
    data: meetings = []
  } = useQuery({
    queryKey: ["reports-meetings", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("meetings").select("id, title, meeting_date, meeting_type, status, vc_lead_id").eq("founder_id", user.id).order("meeting_date", {
        ascending: false
      });
      if (error) throw error;
      return data ?? [];
    }
  });
  const isLoading = leadsLoading;
  const funnelCounts = FUNNEL_STAGES.map(({
    statuses
  }) => statuses === null ? leads.length : leads.filter((l) => statuses.includes(l.status)).length);
  const maxCount = Math.max(...funnelCounts, 1);
  const total = leads.length;
  const contactedCount = leads.filter((l) => ["Contacted", "Replied", "Follow Up", "Meeting Booked", "Interested", "Deal Room Created"].includes(l.status)).length;
  const repliedCount = leads.filter((l) => ["Replied", "Follow Up", "Meeting Booked", "Interested", "Deal Room Created"].includes(l.status)).length;
  const meetingCount = leads.filter((l) => ["Meeting Booked", "Interested", "Deal Room Created"].includes(l.status)).length;
  const activeRooms = rooms.filter((r) => r.status !== "closed").length;
  const pct = (n) => total > 0 ? `${Math.round(n / total * 100)}%` : "—";
  const metrics = [{
    label: "Total leads",
    value: String(total),
    sub: "in your pipeline",
    icon: Users,
    tint: "bg-brand/10 text-brand"
  }, {
    label: "Reply rate",
    value: pct(repliedCount),
    sub: `${repliedCount} replied`,
    icon: MessageSquare,
    tint: "bg-violet/10 text-violet"
  }, {
    label: "Meeting rate",
    value: pct(meetingCount),
    sub: `${meetingCount} booked`,
    icon: Calendar,
    tint: "bg-success/10 text-success"
  }, {
    label: "Active deal rooms",
    value: String(activeRooms),
    sub: `${rooms.length} total`,
    icon: Briefcase,
    tint: "bg-warning/10 text-warning"
  }];
  const downloadLeads = () => {
    const header = ["Name", "Firm", "Status", "Ticket Size", "Sector", "Stage", "Email", "Updated At"];
    const rows = leads.map((l) => [l.investor_name, l.firm_name, l.status, l.ticket_size, l.sector, l.investment_stage, l.email, l.updated_at ? new Date(l.updated_at).toLocaleDateString() : ""]);
    downloadCsv("vc-lead-list.csv", [header, ...rows]);
  };
  const downloadDealRooms = () => {
    const header = ["Room ID", "Status", "Created At", "Documents", "Members"];
    const rows = rooms.map((r) => [r.id.slice(0, 8), r.status, r.created_at ? new Date(r.created_at).toLocaleDateString() : "", r.deal_room_documents?.[0]?.count ?? 0, r.deal_room_members?.[0]?.count ?? 0]);
    downloadCsv("deal-room-report.csv", [header, ...rows]);
  };
  const downloadActivities = () => {
    const header = ["Actor ID", "Action", "Deal Room ID", "Date"];
    const rows = activities.map((a) => [a.actor_id?.slice(0, 8) ?? "", a.action, a.deal_room_id?.slice(0, 8) ?? "", a.created_at ? new Date(a.created_at).toLocaleDateString() : ""]);
    downloadCsv("activity-log.csv", [header, ...rows]);
  };
  const downloadMeetings = () => {
    const header = ["Title", "Date", "Type", "Status", "Lead ID"];
    const rows = meetings.map((m) => [m.title, m.meeting_date ? new Date(m.meeting_date).toLocaleDateString() : "", m.meeting_type, m.status, m.vc_lead_id?.slice(0, 8) ?? ""]);
    downloadCsv("meeting-log.csv", [header, ...rows]);
  };
  if (isLoading) {
    return /* @__PURE__ */ jsx("div", { className: "p-8 flex items-center justify-center min-h-64", children: /* @__PURE__ */ jsx(Loader2, { className: "h-6 w-6 animate-spin text-muted-foreground" }) });
  }
  return /* @__PURE__ */ jsxs("div", { className: "p-6 lg:p-8 max-w-5xl mx-auto space-y-8", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(BarChart3, { className: "h-5 w-5 text-brand" }),
        /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "Reports" })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Pipeline analytics and downloadable reports." })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-border/60 bg-card p-6 shadow-card", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-5", children: [
        /* @__PURE__ */ jsx(TrendingUp, { className: "h-4 w-4 text-brand" }),
        /* @__PURE__ */ jsx("div", { className: "font-semibold", children: "Pipeline funnel" })
      ] }),
      total === 0 ? /* @__PURE__ */ jsx("div", { className: "py-8 text-center text-sm text-muted-foreground", children: "No leads yet. Add VC leads to see your funnel." }) : /* @__PURE__ */ jsx("div", { className: "space-y-3", children: FUNNEL_STAGES.map(({
        label
      }, i) => {
        const count = funnelCounts[i];
        const prev = i === 0 ? count : funnelCounts[i - 1];
        const barPct = Math.round(count / maxCount * 100);
        const conv = prev > 0 && i > 0 ? `${Math.round(count / prev * 100)}%` : null;
        return /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsx("div", { className: "w-28 text-xs text-muted-foreground shrink-0", children: label }),
          /* @__PURE__ */ jsxs("div", { className: "flex-1 h-7 rounded-md bg-muted/40 overflow-hidden relative", children: [
            /* @__PURE__ */ jsx("div", { className: "h-full rounded-md bg-gradient-brand transition-all duration-500", style: {
              width: `${barPct}%`
            } }),
            count > 0 && /* @__PURE__ */ jsxs("div", { className: "absolute inset-y-0 left-2 flex items-center text-[10px] font-medium text-brand-foreground mix-blend-overlay", children: [
              count,
              " lead",
              count !== 1 ? "s" : ""
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "w-12 text-right shrink-0", children: [
            /* @__PURE__ */ jsx("div", { className: "text-xs font-semibold tabular-nums", children: count }),
            conv && /* @__PURE__ */ jsx("div", { className: "text-[10px] text-muted-foreground", children: conv })
          ] })
        ] }, label);
      }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-border/60 bg-card p-6 shadow-card", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-5", children: [
        /* @__PURE__ */ jsx(Download, { className: "h-4 w-4 text-brand" }),
        /* @__PURE__ */ jsx("div", { className: "font-semibold", children: "Download reports" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "grid sm:grid-cols-2 gap-3", children: [{
        label: "VC Lead List",
        desc: `${leads.length} leads with status, firm, ticket size`,
        onClick: downloadLeads,
        disabled: leads.length === 0
      }, {
        label: "Deal Room Report",
        desc: `${rooms.length} rooms with docs and member counts`,
        onClick: downloadDealRooms,
        disabled: rooms.length === 0
      }, {
        label: "Activity Log",
        desc: `${activities.length} recent deal room activities`,
        onClick: downloadActivities,
        disabled: activities.length === 0
      }, {
        label: "Meeting Log",
        desc: `${meetings.length} meetings with dates and status`,
        onClick: downloadMeetings,
        disabled: meetings.length === 0
      }].map((item) => /* @__PURE__ */ jsxs("button", { onClick: item.onClick, disabled: item.disabled, className: "flex items-start gap-3 rounded-lg border border-border/60 p-4 text-left hover:bg-accent hover:border-brand/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group", children: [
        /* @__PURE__ */ jsx("div", { className: "grid h-9 w-9 place-items-center rounded-lg bg-muted shrink-0 group-hover:bg-brand/10 transition-colors", children: /* @__PURE__ */ jsx(FileSpreadsheet, { className: "h-4 w-4 text-muted-foreground group-hover:text-brand" }) }),
        /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ jsx("div", { className: "text-sm font-medium", children: item.label }),
          /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground mt-0.5", children: item.desc })
        ] }),
        /* @__PURE__ */ jsx(Download, { className: "h-4 w-4 text-muted-foreground shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" })
      ] }, item.label)) })
    ] }),
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("div", { className: "font-semibold mb-4", children: "Key metrics" }),
      /* @__PURE__ */ jsx("div", { className: "grid sm:grid-cols-2 lg:grid-cols-4 gap-3", children: metrics.map((m) => /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-border/60 bg-card p-4 shadow-card", children: [
        /* @__PURE__ */ jsx("div", { className: `grid h-8 w-8 place-items-center rounded-lg mb-3 ${m.tint}`, children: /* @__PURE__ */ jsx(m.icon, { className: "h-4 w-4" }) }),
        /* @__PURE__ */ jsx("div", { className: "text-xl font-semibold tabular-nums", children: m.value }),
        /* @__PURE__ */ jsx("div", { className: "text-xs font-medium mt-0.5", children: m.label }),
        /* @__PURE__ */ jsx("div", { className: "text-[11px] text-muted-foreground mt-0.5", children: m.sub })
      ] }, m.label)) }),
      /* @__PURE__ */ jsxs("div", { className: "mt-3 grid sm:grid-cols-2 gap-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-border/60 bg-card p-4 shadow-card", children: [
          /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground mb-1", children: "Contacted rate" }),
          /* @__PURE__ */ jsx("div", { className: "text-xl font-semibold tabular-nums", children: pct(contactedCount) }),
          /* @__PURE__ */ jsxs("div", { className: "text-[11px] text-muted-foreground", children: [
            contactedCount,
            " of ",
            total,
            " reached out"
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-border/60 bg-card p-4 shadow-card", children: [
          /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground mb-1", children: "Total meetings" }),
          /* @__PURE__ */ jsx("div", { className: "text-xl font-semibold tabular-nums", children: meetings.length }),
          /* @__PURE__ */ jsx("div", { className: "text-[11px] text-muted-foreground", children: "across all investors" })
        ] })
      ] })
    ] })
  ] });
}
export {
  Reports as component
};
