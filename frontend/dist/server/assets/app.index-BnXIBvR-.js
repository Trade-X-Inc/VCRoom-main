import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, HelpCircle, Building2, Users, Briefcase, Mail, ArrowUpRight, Sparkles, Clock, CheckCircle2, X, TrendingUp, FileText, Calendar } from "lucide-react";
import { u as useAuth, s as supabase } from "./router-C0llBC3B.js";
import { c as cn } from "./utils-H80jjgLf.js";
import "@supabase/supabase-js";
import "sonner";
import "clsx";
import "tailwind-merge";
function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 6e4);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
function activityIcon(action) {
  const a = action.toLowerCase();
  if (a.includes("sign") || a.includes("nda")) return {
    Icon: CheckCircle2,
    cls: "text-success"
  };
  if (a.includes("document") || a.includes("view") || a.includes("file")) return {
    Icon: FileText,
    cls: "text-brand"
  };
  if (a.includes("email") || a.includes("reply") || a.includes("message")) return {
    Icon: Mail,
    cls: "text-violet"
  };
  if (a.includes("meeting") || a.includes("calendar") || a.includes("schedule")) return {
    Icon: Calendar,
    cls: "text-warning"
  };
  if (a.includes("deal") || a.includes("room")) return {
    Icon: Briefcase,
    cls: "text-success"
  };
  return {
    Icon: Clock,
    cls: "text-muted-foreground"
  };
}
const DEAL_ROOM_PROGRESS = {
  decision: {
    p: 90,
    bar: "bg-success"
  },
  diligence: {
    p: 75,
    bar: "bg-success"
  },
  qa: {
    p: 52,
    bar: "bg-warning"
  },
  "q&a": {
    p: 52,
    bar: "bg-warning"
  },
  review: {
    p: 40,
    bar: "bg-brand"
  },
  onboard: {
    p: 20,
    bar: "bg-brand"
  }
};
function dealRoomProgress(status) {
  const s = (status ?? "").toLowerCase();
  for (const [key, val] of Object.entries(DEAL_ROOM_PROGRESS)) {
    if (s.includes(key)) return val;
  }
  return {
    p: 10,
    bar: "bg-brand"
  };
}
function HowItWorksModal({
  onClose
}) {
  const steps = [{
    n: "1",
    title: "Add VC leads",
    body: "Build your target list of investors manually or via CSV import."
  }, {
    n: "2",
    title: "Generate AI emails",
    body: "Use AI to write personalised cold outreach and follow-ups for each investor."
  }, {
    n: "3",
    title: "Create deal rooms",
    body: "When VCs show interest, open a secure deal room to share documents."
  }, {
    n: "4",
    title: "Close your round",
    body: "Manage diligence, Q&A, and investor decisions all in one place."
  }];
  return /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm grid place-items-center p-4", onClick: onClose, children: /* @__PURE__ */ jsxs("div", { onClick: (e) => e.stopPropagation(), className: "w-full max-w-lg rounded-2xl border border-border/60 bg-card shadow-elev p-8", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-6", children: [
      /* @__PURE__ */ jsx("h2", { className: "text-lg font-semibold", children: "How Venture Room works" }),
      /* @__PURE__ */ jsx("button", { onClick: onClose, className: "grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground", children: /* @__PURE__ */ jsx(X, { className: "h-4 w-4" }) })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "space-y-5", children: steps.map((s) => /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-4", children: [
      /* @__PURE__ */ jsx("div", { className: "grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-brand text-brand-foreground text-sm font-semibold", children: s.n }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("div", { className: "text-sm font-semibold", children: s.title }),
        /* @__PURE__ */ jsx("div", { className: "text-sm text-muted-foreground mt-0.5 leading-relaxed", children: s.body })
      ] })
    ] }, s.n)) })
  ] }) });
}
function OnboardingStep({
  icon: Icon,
  title,
  description,
  buttonLabel,
  to,
  done,
  disabled
}) {
  const navigate = useNavigate();
  return /* @__PURE__ */ jsxs("div", { className: cn("rounded-xl border border-border/60 bg-card p-6 shadow-card flex flex-col gap-3", disabled && "opacity-50"), children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between", children: [
      /* @__PURE__ */ jsx("div", { className: cn("grid h-10 w-10 place-items-center rounded-lg", disabled ? "bg-muted" : "bg-brand/10"), children: /* @__PURE__ */ jsx(Icon, { className: cn("h-5 w-5", disabled ? "text-muted-foreground" : "text-brand") }) }),
      done && /* @__PURE__ */ jsx(CheckCircle2, { className: "h-5 w-5 text-success shrink-0" })
    ] }),
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("div", { className: "text-sm font-semibold", children: title }),
      /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground mt-1 leading-relaxed", children: description })
    ] }),
    /* @__PURE__ */ jsxs("button", { disabled, onClick: () => !disabled && navigate({
      to
    }), className: cn("mt-auto rounded-md px-3 py-2 text-sm font-medium transition-colors text-center", done ? "border border-border/60 text-muted-foreground hover:bg-accent" : disabled ? "border border-border/60 text-muted-foreground cursor-not-allowed" : "bg-gradient-brand text-brand-foreground shadow-glow hover:opacity-90"), children: [
      done ? "✓ " : "",
      buttonLabel
    ] })
  ] });
}
function Stat({
  label,
  value,
  sub,
  trend,
  comingSoon
}) {
  return /* @__PURE__ */ jsxs("div", { className: "relative overflow-hidden rounded-xl border border-border/60 bg-card p-5 shadow-card", children: [
    /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: label }),
    /* @__PURE__ */ jsxs("div", { className: "mt-1.5 flex items-baseline gap-2", children: [
      /* @__PURE__ */ jsx("span", { className: cn("text-2xl font-semibold tracking-tight", comingSoon && "text-muted-foreground"), children: value }),
      trend && /* @__PURE__ */ jsxs("span", { className: "text-xs text-success inline-flex items-center gap-0.5", children: [
        /* @__PURE__ */ jsx(TrendingUp, { className: "h-3 w-3" }),
        " ",
        trend
      ] }),
      comingSoon && /* @__PURE__ */ jsx("span", { title: "Coming soon", className: "cursor-help inline-flex items-center", children: /* @__PURE__ */ jsx(HelpCircle, { className: "h-3.5 w-3.5 text-muted-foreground/60" }) })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground mt-0.5", children: sub })
  ] });
}
function Overview() {
  const {
    user
  } = useAuth();
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const {
    data: startup = null,
    isLoading: startupLoading
  } = useQuery({
    queryKey: ["my-startup", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const {
        data
      } = await supabase.from("startups").select("*").eq("founder_id", user.id).limit(1);
      return data?.[0] ?? null;
    }
  });
  const {
    data: leadCount = 0,
    isLoading: leadLoading
  } = useQuery({
    queryKey: ["lead-count", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const {
        count
      } = await supabase.from("vc_leads").select("*", {
        count: "exact",
        head: true
      }).eq("founder_id", user.id);
      return count ?? 0;
    }
  });
  const {
    data: dealRoomCount = 0
  } = useQuery({
    queryKey: ["deal-room-count", user?.id],
    enabled: !!startup?.id,
    queryFn: async () => {
      const {
        count
      } = await supabase.from("deal_rooms").select("*", {
        count: "exact",
        head: true
      }).eq("startup_id", startup.id);
      return count ?? 0;
    }
  });
  const {
    data: meetingCount = 0
  } = useQuery({
    queryKey: ["meeting-count", startup?.id],
    enabled: !!startup?.id,
    queryFn: async () => {
      const {
        data: rooms
      } = await supabase.from("deal_rooms").select("id").eq("startup_id", startup.id);
      const ids = (rooms ?? []).map((r) => r.id);
      if (ids.length === 0) return 0;
      const {
        count
      } = await supabase.from("meetings").select("*", {
        count: "exact",
        head: true
      }).in("deal_room_id", ids).gt("scheduled_at", (/* @__PURE__ */ new Date()).toISOString());
      return count ?? 0;
    }
  });
  const {
    data: activities = []
  } = useQuery({
    queryKey: ["recent-activity", startup?.id],
    enabled: !!startup?.id,
    queryFn: async () => {
      const {
        data: rooms
      } = await supabase.from("deal_rooms").select("id").eq("startup_id", startup.id);
      const ids = (rooms ?? []).map((r) => r.id);
      if (ids.length === 0) return [];
      const {
        data
      } = await supabase.from("activities").select("*").in("deal_room_id", ids).order("created_at", {
        ascending: false
      }).limit(5);
      return data ?? [];
    }
  });
  const {
    data: dealRooms = []
  } = useQuery({
    queryKey: ["hot-deal-rooms", startup?.id],
    enabled: !!startup?.id,
    queryFn: async () => {
      const {
        data
      } = await supabase.from("deal_rooms").select("*").eq("startup_id", startup.id).order("updated_at", {
        ascending: false
      }).limit(3);
      return data ?? [];
    }
  });
  const {
    data: pipelineLeads = []
  } = useQuery({
    queryKey: ["pipeline-status", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const {
        data
      } = await supabase.from("vc_leads").select("status").eq("founder_id", user.id);
      return data ?? [];
    }
  });
  const isQueriesLoading = !user?.id || startupLoading || leadLoading;
  const isNewUser = !isQueriesLoading && !startup && leadCount === 0;
  if (isQueriesLoading) {
    return /* @__PURE__ */ jsx("div", { className: "p-8 flex items-center justify-center min-h-64", children: /* @__PURE__ */ jsx(Loader2, { className: "h-6 w-6 animate-spin text-muted-foreground" }) });
  }
  if (isNewUser) {
    const completedSteps = (startup ? 1 : 0) + (leadCount > 0 ? 1 : 0) + (dealRoomCount > 0 ? 1 : 0);
    const progressPct = Math.round(completedSteps / 4 * 100);
    return /* @__PURE__ */ jsxs("div", { className: "p-6 lg:p-8 max-w-4xl mx-auto", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-end justify-between flex-wrap gap-4 mb-8", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "Welcome to Venture Room 👋" }),
          /* @__PURE__ */ jsx("p", { className: "mt-1.5 text-sm text-muted-foreground", children: "Let's get your fundraise set up. Complete these steps to get started." })
        ] }),
        /* @__PURE__ */ jsxs("button", { onClick: () => setHowItWorksOpen(true), className: "rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent inline-flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsx(HelpCircle, { className: "h-4 w-4" }),
          " How it works"
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mb-6", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-2", children: [
          /* @__PURE__ */ jsxs("span", { className: "text-sm font-medium", children: [
            completedSteps,
            " of 4 steps complete"
          ] }),
          /* @__PURE__ */ jsxs("span", { className: "text-xs text-muted-foreground", children: [
            progressPct,
            "%"
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "h-2 rounded-full bg-muted overflow-hidden", children: /* @__PURE__ */ jsx("div", { className: "h-full bg-gradient-brand rounded-full transition-all duration-500", style: {
          width: `${progressPct}%`
        } }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [
        /* @__PURE__ */ jsx(OnboardingStep, { icon: Building2, title: "Set up your company profile", description: "Add your startup details, team, and pitch so investors know who you are.", buttonLabel: "Set up profile", to: "/app/profile", done: !!startup }),
        /* @__PURE__ */ jsx(OnboardingStep, { icon: Users, title: "Build your investor list", description: "Add VCs manually or import a CSV of investor contacts to target.", buttonLabel: "Add leads", to: "/app/leads", done: leadCount > 0 }),
        /* @__PURE__ */ jsx(OnboardingStep, { icon: Briefcase, title: "Create your first deal room", description: "A secure space to share documents and collaborate with investors.", buttonLabel: "Create deal room", to: "/app/deal-rooms", done: dealRoomCount > 0 }),
        /* @__PURE__ */ jsx(OnboardingStep, { icon: Mail, title: "Invite your first investor", description: "Send a deal room invite with NDA to a VC you're in conversation with.", buttonLabel: "Go to deal rooms", to: "/app/deal-rooms", done: false, disabled: dealRoomCount === 0 })
      ] }),
      howItWorksOpen && /* @__PURE__ */ jsx(HowItWorksModal, { onClose: () => setHowItWorksOpen(false) })
    ] });
  }
  const statusMap = {};
  pipelineLeads.forEach(({
    status
  }) => {
    statusMap[status] = (statusMap[status] ?? 0) + 1;
  });
  const greeting = (() => {
    const h = (/* @__PURE__ */ new Date()).getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();
  const firstName = user?.name?.split(" ")[0] ?? "Founder";
  return /* @__PURE__ */ jsxs("div", { className: "p-6 lg:p-8 max-w-7xl mx-auto", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-end justify-between flex-wrap gap-4", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("div", { className: "text-xs text-muted-foreground", children: [
          greeting,
          ", ",
          firstName
        ] }),
        /* @__PURE__ */ jsxs("h1", { className: "mt-1 text-2xl font-semibold tracking-tight", children: [
          startup?.name ?? "Your Startup",
          startup?.stage ? ` — ${startup.stage}` : ""
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxs("button", { onClick: () => setHowItWorksOpen(true), className: "rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent inline-flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsx(HelpCircle, { className: "h-4 w-4" }),
          " How it works"
        ] }),
        /* @__PURE__ */ jsxs(Link, { to: "/app/email", className: "rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent inline-flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsx(Mail, { className: "h-4 w-4" }),
          " Compose"
        ] }),
        /* @__PURE__ */ jsxs(Link, { to: "/app/leads", className: "rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow inline-flex items-center gap-1.5", children: [
          "Add lead ",
          /* @__PURE__ */ jsx(ArrowUpRight, { className: "h-3.5 w-3.5" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mt-6 rounded-2xl border border-border/60 bg-card p-6 shadow-card relative overflow-hidden", children: [
      /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-gradient-mesh opacity-[0.05]" }),
      /* @__PURE__ */ jsxs("div", { className: "relative flex flex-wrap items-end justify-between gap-4", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: "Round progress" }),
          /* @__PURE__ */ jsxs("div", { className: "mt-1 flex items-baseline gap-2", children: [
            /* @__PURE__ */ jsx("span", { className: "text-3xl font-semibold tracking-tight text-muted-foreground", title: "Coming soon", children: "--" }),
            /* @__PURE__ */ jsx("span", { className: "text-sm text-muted-foreground", children: startup?.target_raise ? `of $${(startup.target_raise / 1e6).toFixed(0)}M target` : "target not set" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex gap-6 text-sm", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: "Soft circled" }),
            /* @__PURE__ */ jsx("div", { className: "font-medium text-muted-foreground", title: "Coming soon", children: "--" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: "Lead" }),
            /* @__PURE__ */ jsx("div", { className: "font-medium text-muted-foreground", title: "Coming soon", children: "--" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: "Close" }),
            /* @__PURE__ */ jsx("div", { className: "font-medium text-muted-foreground", title: "Coming soon", children: "--" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "relative mt-5 h-2.5 rounded-full bg-muted overflow-hidden", children: /* @__PURE__ */ jsx("div", { className: "absolute inset-y-0 left-0 w-0 bg-gradient-brand rounded-full" }) }),
      /* @__PURE__ */ jsx("div", { className: "relative mt-2 flex justify-between text-[11px] text-muted-foreground", children: startup?.target_raise ? /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx("span", { children: "$0" }),
        /* @__PURE__ */ jsxs("span", { children: [
          "$",
          (startup.target_raise / 1e6 * 0.25).toFixed(1),
          "M"
        ] }),
        /* @__PURE__ */ jsxs("span", { children: [
          "$",
          (startup.target_raise / 1e6 * 0.5).toFixed(1),
          "M"
        ] }),
        /* @__PURE__ */ jsxs("span", { children: [
          "$",
          (startup.target_raise / 1e6 * 0.75).toFixed(1),
          "M"
        ] }),
        /* @__PURE__ */ jsxs("span", { children: [
          "$",
          (startup.target_raise / 1e6).toFixed(0),
          "M"
        ] })
      ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx("span", { children: "$0" }),
        /* @__PURE__ */ jsx("span", { children: "$2M" }),
        /* @__PURE__ */ jsx("span", { children: "$4M" }),
        /* @__PURE__ */ jsx("span", { children: "$6M" }),
        /* @__PURE__ */ jsx("span", { children: "$8M" })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4", children: [
      /* @__PURE__ */ jsx(Stat, { label: "Active VCs", value: leadCount, sub: "in pipeline", trend: leadCount > 0 ? `+${leadCount} total` : void 0 }),
      /* @__PURE__ */ jsx(Stat, { label: "Reply rate", value: "--", sub: "vs benchmark", comingSoon: true }),
      /* @__PURE__ */ jsx(Stat, { label: "Meetings", value: meetingCount, sub: "upcoming" }),
      /* @__PURE__ */ jsx(Stat, { label: "Deal rooms", value: dealRoomCount, sub: dealRoomCount === 1 ? "1 active" : `${dealRoomCount} active` })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mt-6 grid lg:grid-cols-3 gap-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "lg:col-span-2 rounded-xl border border-border/60 bg-card shadow-card", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between p-5 border-b border-border/60", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("div", { className: "text-sm font-semibold", children: "Pipeline at a glance" }),
            /* @__PURE__ */ jsxs("div", { className: "text-xs text-muted-foreground", children: [
              leadCount,
              " leads total"
            ] })
          ] }),
          /* @__PURE__ */ jsxs(Link, { to: "/app/leads", className: "text-xs text-brand inline-flex items-center gap-1", children: [
            "Open pipeline ",
            /* @__PURE__ */ jsx(ArrowUpRight, { className: "h-3 w-3" })
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "p-5 grid grid-cols-7 gap-2", children: [["New", statusMap["New"] ?? 0, "bg-muted-foreground/40"], ["Contact", statusMap["Contacted"] ?? 0, "bg-foreground/40"], ["Replied", statusMap["Replied"] ?? 0, "bg-brand"], ["Meeting", statusMap["Meeting Booked"] ?? 0, "bg-violet"], ["Interest", statusMap["Interested"] ?? 0, "bg-warning"], ["DR", statusMap["Deal Room Created"] ?? 0, "bg-success"], ["Pass", statusMap["Rejected"] ?? 0, "bg-destructive/60"]].map(([l, n, c]) => /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-border/60 bg-background/40 p-3", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsx("span", { className: "text-[10px] text-muted-foreground truncate", children: l }),
            /* @__PURE__ */ jsx("span", { className: cn("h-1.5 w-1.5 rounded-full", c) })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "mt-1 text-lg font-semibold", children: n }),
          /* @__PURE__ */ jsx("div", { className: cn("mt-2 h-1 rounded-full opacity-50", c), style: {
            width: `${Math.min(100, n * 8)}%`
          } })
        ] }, l)) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-border/60 bg-card shadow-card overflow-hidden", children: [
        /* @__PURE__ */ jsxs("div", { className: "p-5 border-b border-border/60 flex items-center gap-2", children: [
          /* @__PURE__ */ jsx("div", { className: "grid h-7 w-7 place-items-center rounded-md bg-gradient-brand text-brand-foreground", children: /* @__PURE__ */ jsx(Sparkles, { className: "h-3.5 w-3.5" }) }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("div", { className: "text-sm font-semibold", children: "AI Advisor" }),
            /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: "Suggested actions" })
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "p-3 space-y-2", children: [{
          t: "Complete your startup profile",
          d: "Add pitch deck and team details to attract investors"
        }, {
          t: "Import your VC target list",
          d: "Upload a CSV or add leads manually"
        }, {
          t: "Create your first deal room",
          d: "Set up a secure space to share documents"
        }].map((a) => /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-border/60 bg-background/40 p-3 hover:bg-accent transition-colors cursor-pointer", children: [
          /* @__PURE__ */ jsx("div", { className: "text-sm font-medium", children: a.t }),
          /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground mt-0.5", children: a.d })
        ] }, a.t)) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mt-6 grid lg:grid-cols-2 gap-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-border/60 bg-card shadow-card", children: [
        /* @__PURE__ */ jsxs("div", { className: "p-5 border-b border-border/60 flex items-center justify-between", children: [
          /* @__PURE__ */ jsx("div", { className: "text-sm font-semibold", children: "Recent activity" }),
          /* @__PURE__ */ jsx("span", { className: "text-xs text-muted-foreground", children: "Live" })
        ] }),
        activities.length === 0 ? /* @__PURE__ */ jsx("div", { className: "px-5 py-8 text-center text-sm text-muted-foreground", children: "No activity yet — invite an investor to get started." }) : /* @__PURE__ */ jsx("div", { className: "divide-y divide-border/60", children: activities.map((a) => {
          const {
            Icon,
            cls
          } = activityIcon(a.action);
          return /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 px-5 py-3", children: [
            /* @__PURE__ */ jsx(Icon, { className: cn("h-4 w-4 shrink-0", cls) }),
            /* @__PURE__ */ jsx("div", { className: "flex-1 text-sm truncate capitalize", children: a.action.replace(/_/g, " ") }),
            /* @__PURE__ */ jsxs("div", { className: "text-xs text-muted-foreground inline-flex items-center gap-1 shrink-0", children: [
              /* @__PURE__ */ jsx(Clock, { className: "h-3 w-3" }),
              " ",
              timeAgo(a.created_at)
            ] })
          ] }, a.id);
        }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-border/60 bg-card shadow-card", children: [
        /* @__PURE__ */ jsxs("div", { className: "p-5 border-b border-border/60 flex items-center justify-between", children: [
          /* @__PURE__ */ jsx("div", { className: "text-sm font-semibold", children: "Hot deal rooms" }),
          /* @__PURE__ */ jsx(Link, { to: "/app/deal-rooms", className: "text-xs text-brand", children: "View all" })
        ] }),
        dealRooms.length === 0 ? /* @__PURE__ */ jsx("div", { className: "px-5 py-8 text-center text-sm text-muted-foreground", children: "No deal rooms yet." }) : /* @__PURE__ */ jsx("div", { className: "divide-y divide-border/60", children: dealRooms.map((r) => {
          const {
            p,
            bar
          } = dealRoomProgress(r.status);
          const initials = (r.name ?? "?").split(" ").map((s) => s[0] ?? "").join("").slice(0, 2).toUpperCase();
          return /* @__PURE__ */ jsxs(Link, { to: "/app/deal-rooms", className: "flex items-center gap-3 px-5 py-3 hover:bg-accent/40", children: [
            /* @__PURE__ */ jsx("div", { className: "grid h-9 w-9 place-items-center rounded-md bg-gradient-soft text-xs font-semibold border border-border/60", children: initials }),
            /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
              /* @__PURE__ */ jsx("div", { className: "text-sm font-medium truncate", children: r.name ?? "Deal Room" }),
              /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground capitalize", children: r.status ?? "Active" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "w-20", children: [
              /* @__PURE__ */ jsx("div", { className: "h-1.5 rounded-full bg-muted overflow-hidden", children: /* @__PURE__ */ jsx("div", { className: cn("h-full", bar), style: {
                width: `${p}%`
              } }) }),
              /* @__PURE__ */ jsxs("div", { className: "text-[10px] text-muted-foreground text-right mt-0.5", children: [
                p,
                "%"
              ] })
            ] })
          ] }, r.id);
        }) })
      ] })
    ] }),
    howItWorksOpen && /* @__PURE__ */ jsx(HowItWorksModal, { onClose: () => setHowItWorksOpen(false) })
  ] });
}
export {
  Overview as component
};
