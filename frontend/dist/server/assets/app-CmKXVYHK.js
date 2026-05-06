import { r as reactExports, U as jsxRuntimeExports, _ as Outlet } from "./worker-entry-Cmmw-2kk.js";
import { u as useAuth, c as useQueryClient, s as supabase, L as Link, a as useNavigate, d as useI18n } from "./router-DUHyCcO4.js";
import { u as useRouterState } from "./useRouterState-HD9MJh1w.js";
import { L as Logo } from "./Logo-DAWquX1K.js";
import { u as useQuery } from "./useQuery-CqUX3-7B.js";
import { c as cn } from "./utils-Bz4m9VPB.js";
import { B as Bell } from "./bell-nx3hwQdI.js";
import { C as CheckCheck } from "./check-check-8biRxx43.js";
import { f as formatDistanceToNow } from "./formatDistanceToNow-DZsPIRrC.js";
import { B as Briefcase } from "./briefcase-Z_tlIkyK.js";
import { M as MessageSquare } from "./message-square-BXZGe1sQ.js";
import { U as UserPlus } from "./user-plus-SO3V9bS7.js";
import { S as Sparkles } from "./sparkles-D86DPdwE.js";
import { S as Settings } from "./settings-BnDFnI-4.js";
import { U as User } from "./user-BVMtp3jl.js";
import { U as Users } from "./users-DG4-LCT1.js";
import { S as ShieldCheck } from "./shield-check-BcrWSRyB.js";
import { L as LogOut } from "./log-out-FTe-LCSl.js";
import { L as LangSwitcher, T as ThemeToggle } from "./LangSwitcher-CtmoKmV5.js";
import { c as createLucideIcon } from "./createLucideIcon-ByQ9CEis.js";
import { B as Building2 } from "./building-2-e7mFjcBM.js";
import { C as ClipboardCheck, a as ChartColumn } from "./clipboard-check-CMUvDFUZ.js";
import { B as Brain } from "./brain-BNqMdY5D.js";
import { L as ListChecks } from "./list-checks-BhQJes8X.js";
import { L as LayoutGrid } from "./layout-grid-jsBmracF.js";
import { F as FileText } from "./file-text-D5pqWYYG.js";
import { C as Calendar } from "./calendar-BqAUqDh3.js";
import { S as Search } from "./search-BdeIBPuN.js";
import { P as Plus } from "./plus-B_EMNwAw.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./index-DYJmQpRE.js";
import "./globe-C2Bd-UgU.js";
const __iconNode$3 = [
  [
    "path",
    {
      d: "M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z",
      key: "pzmjnu"
    }
  ],
  ["path", { d: "M21.21 15.89A10 10 0 1 1 8 2.83", key: "k2fpak" }]
];
const ChartPie = createLucideIcon("chart-pie", __iconNode$3);
const __iconNode$2 = [
  ["path", { d: "m11 17-5-5 5-5", key: "13zhaf" }],
  ["path", { d: "m18 17-5-5 5-5", key: "h8a8et" }]
];
const ChevronsLeft = createLucideIcon("chevrons-left", __iconNode$2);
const __iconNode$1 = [
  ["path", { d: "M5 3v14", key: "9nsxs2" }],
  ["path", { d: "M12 3v8", key: "1h2ygw" }],
  ["path", { d: "M19 3v18", key: "1sk56x" }]
];
const Kanban = createLucideIcon("kanban", __iconNode$1);
const __iconNode = [
  ["path", { d: "M10 15H6a4 4 0 0 0-4 4v2", key: "1nfge6" }],
  ["path", { d: "m14.305 16.53.923-.382", key: "1itpsq" }],
  ["path", { d: "m15.228 13.852-.923-.383", key: "eplpkm" }],
  ["path", { d: "m16.852 12.228-.383-.923", key: "13v3q0" }],
  ["path", { d: "m16.852 17.772-.383.924", key: "1i8mnm" }],
  ["path", { d: "m19.148 12.228.383-.923", key: "1q8j1v" }],
  ["path", { d: "m19.53 18.696-.382-.924", key: "vk1qj3" }],
  ["path", { d: "m20.772 13.852.924-.383", key: "n880s0" }],
  ["path", { d: "m20.772 16.148.924.383", key: "1g6xey" }],
  ["circle", { cx: "18", cy: "15", r: "3", key: "gjjjvw" }],
  ["circle", { cx: "9", cy: "7", r: "4", key: "nufk8" }]
];
const UserCog = createLucideIcon("user-cog", __iconNode);
const iconFor = (type) => {
  if (type === "decision") return Briefcase;
  if (type === "message") return MessageSquare;
  if (type === "invite") return UserPlus;
  if (type === "ai") return Sparkles;
  return Settings;
};
const tintFor = (type) => {
  if (type === "decision") return "bg-success/10 text-success";
  if (type === "message") return "bg-brand/10 text-brand";
  if (type === "invite") return "bg-warning/10 text-warning";
  if (type === "ai") return "bg-violet/10 text-violet";
  return "bg-muted text-muted-foreground";
};
function NotificationBell() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = reactExports.useState(false);
  const { data: items = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("notifications").select("id, title, body, type, read, action_url, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
    refetchInterval: 3e4
  });
  const unread = items.filter((n) => !n.read).length;
  const markAll = async () => {
    if (!user?.id || unread === 0) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        onClick: () => setOpen((v) => !v),
        className: "grid h-9 w-9 place-items-center rounded-md border border-border/60 hover:bg-accent transition-colors text-muted-foreground hover:text-foreground relative",
        "aria-label": "Notifications",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Bell, { className: "h-4 w-4" }),
          unread > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute top-1 right-1 h-2 w-2 rounded-full bg-brand ring-2 ring-background" })
        ]
      }
    ),
    open && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-30", onClick: () => setOpen(false) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute right-0 mt-2 w-[380px] rounded-xl border border-border/60 bg-popover shadow-elev z-40 overflow-hidden", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-4 py-3 border-b border-border/60", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold", children: "Notifications" }),
            unread > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] rounded-full bg-brand/10 text-brand px-1.5 py-0.5 font-medium", children: [
              unread,
              " new"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: markAll, className: "text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCheck, { className: "h-3.5 w-3.5" }),
            " Mark all read"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-h-[420px] overflow-y-auto divide-y divide-border/60", children: [
          items.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "py-8 text-center text-xs text-muted-foreground", children: "No notifications yet." }),
          items.slice(0, 10).map((n) => {
            const Icon = iconFor(n.type);
            const content = /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `flex gap-3 p-3.5 hover:bg-accent/50 transition-colors cursor-pointer ${!n.read ? "bg-brand/[0.02]" : ""}`, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `grid h-8 w-8 place-items-center rounded-md shrink-0 ${tintFor(n.type)}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "h-4 w-4" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium leading-tight", children: n.title }),
                  !n.read && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-brand mt-1.5 shrink-0" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-0.5 text-xs text-muted-foreground line-clamp-2", children: n.body }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 text-[10px] text-muted-foreground/70", children: formatDistanceToNow(new Date(n.created_at), { addSuffix: true }) })
              ] })
            ] });
            return n.action_url ? /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: n.action_url, onClick: () => setOpen(false), children: content }, n.id) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: content }, n.id);
          })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Link,
          {
            to: "/app/notifications",
            onClick: () => setOpen(false),
            className: "block text-center text-xs font-medium py-2.5 border-t border-border/60 hover:bg-accent text-foreground",
            children: "View all notifications"
          }
        )
      ] })
    ] })
  ] });
}
function UserMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = reactExports.useState(false);
  const nav = useNavigate();
  if (!user) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: () => setOpen((v) => !v),
        className: "grid h-9 w-9 place-items-center rounded-full bg-gradient-brand text-brand-foreground text-xs font-semibold ring-2 ring-transparent hover:ring-brand/20 transition-all",
        "aria-label": "Account menu",
        children: user.initials
      }
    ),
    open && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-30", onClick: () => setOpen(false) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute right-0 mt-2 w-[260px] rounded-xl border border-border/60 bg-popover shadow-elev z-40 overflow-hidden", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-3.5 border-b border-border/60", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid h-10 w-10 place-items-center rounded-full bg-gradient-brand text-brand-foreground text-sm font-semibold", children: user.initials }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium truncate", children: user.name }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground truncate", children: user.email })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex items-center gap-1.5 text-[10px]", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full bg-accent px-1.5 py-0.5 text-muted-foreground font-medium", children: user.role }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full bg-accent px-1.5 py-0.5 text-muted-foreground", children: user.workspace })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-1", children: [
          { icon: User, label: "Account", to: "/app/profile" },
          { icon: Users, label: "Team & users", to: "/app/users" },
          { icon: ShieldCheck, label: "Audit log", to: "/app/audit" },
          { icon: Settings, label: "Settings", to: "/app/profile" }
        ].map((m) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Link,
          {
            to: m.to,
            onClick: () => setOpen(false),
            className: "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-foreground/80 hover:bg-accent hover:text-foreground",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(m.icon, { className: "h-4 w-4 text-muted-foreground" }),
              " ",
              m.label
            ]
          },
          m.label
        )) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-1 border-t border-border/60", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: () => {
              signOut();
              setOpen(false);
              nav({ to: "/sign-in", search: { redirect: "/app" } });
            },
            className: "w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-destructive hover:bg-destructive/10",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(LogOut, { className: "h-4 w-4" }),
              " Sign out"
            ]
          }
        ) })
      ] })
    ] })
  ] });
}
const founderNav = [
  { to: "/app", labelKey: "app.overview", icon: LayoutGrid },
  { to: "/app/leads", labelKey: "app.leads", icon: Users },
  { to: "/app/pipeline", labelKey: "app.pipeline", icon: Kanban },
  { to: "/app/profile", labelKey: "app.profile", icon: Building2 },
  { to: "/app/documents", labelKey: "app.documents", icon: FileText },
  { to: "/app/deal-rooms", labelKey: "app.dealRooms", icon: Briefcase, badge: "4" },
  { to: "/app/messages", labelKey: "app.messages", icon: MessageSquare },
  { to: "/app/meetings", labelKey: "app.meetings", icon: Calendar },
  { to: "/app/reports", labelKey: "reports.title", icon: ChartColumn },
  { to: "/app/advisor", labelKey: "app.advisor", icon: Sparkles }
];
const investorNav = [
  { to: "/app/investor", labelKey: "app.pipeline", icon: ChartPie },
  { to: "/app/investor/startups", labelKey: "app.startups", icon: Building2 },
  { to: "/app/investor/deal-rooms", labelKey: "app.dealRooms", icon: Briefcase, badge: "12" },
  { to: "/app/investor/diligence", labelKey: "app.diligence", icon: ClipboardCheck },
  { to: "/app/investor/analysis", labelKey: "app.analysis", icon: Brain },
  { to: "/app/investor/decisions", labelKey: "app.decisions", icon: ListChecks }
];
const workspaceNav = [
  { to: "/app/users", labelKey: "app.users", icon: UserCog },
  { to: "/app/audit", labelKey: "app.audit", icon: ShieldCheck },
  { to: "/app/settings/notifications", labelKey: "rules.title", icon: Settings }
];
function AppShell({ children }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isInvestor = path.startsWith("/app/investor");
  const nav = isInvestor ? investorNav : founderNav;
  const [collapsed, setCollapsed] = reactExports.useState(false);
  const { isAuthenticated, user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { data: leadCount } = useQuery({
    queryKey: ["lead-count", user?.id],
    enabled: !!user?.id && !isInvestor,
    queryFn: async () => {
      const { count } = await supabase.from("vc_leads").select("*", { count: "exact", head: true }).eq("founder_id", user.id);
      return count ?? 0;
    }
  });
  reactExports.useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: "/sign-in", search: { redirect: path } });
    }
  }, [isAuthenticated, navigate, path]);
  if (!isAuthenticated) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-screen bg-background grid place-items-center text-sm text-muted-foreground", children: "Redirecting…" });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-screen bg-background flex", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("aside", { className: cn("border-r border-border/60 bg-sidebar flex flex-col transition-all", collapsed ? "w-[68px]" : "w-[248px]"), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "h-16 flex items-center px-4 border-b border-border/60", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/", className: "flex-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Logo, { withWordmark: !collapsed }) }),
        !collapsed && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setCollapsed(true), className: "text-muted-foreground hover:text-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronsLeft, { className: "h-4 w-4" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-3 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("flex items-center gap-2 rounded-lg border border-border/60 bg-background/60 px-2.5 py-2", collapsed && "justify-center"), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid h-6 w-6 place-items-center rounded-md bg-gradient-brand text-[10px] font-semibold text-brand-foreground", children: user?.initials ?? "VR" }),
        !collapsed && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs font-medium truncate", children: user?.workspace ?? user?.name ?? "Workspace" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] text-muted-foreground capitalize", children: user?.appRole ?? "founder" })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("nav", { className: "flex-1 px-2 space-y-0.5 overflow-y-auto", children: [
        !collapsed && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-2 pt-3 pb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold", children: isInvestor ? "Investor" : t("app.workspace") }),
        nav.map((n) => {
          const active = path === n.to || n.to !== "/app" && n.to !== "/app/investor" && path.startsWith(n.to);
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Link,
            {
              to: n.to,
              className: cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors group",
                active ? "bg-accent text-foreground font-medium shadow-xs" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                collapsed && "justify-center px-0"
              ),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(n.icon, { className: cn("h-4 w-4", active && "text-brand") }),
                !collapsed && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1", children: t(n.labelKey) }),
                !collapsed && (() => {
                  const display = n.to === "/app/leads" ? leadCount && leadCount > 0 ? String(leadCount) : void 0 : n.badge;
                  return display ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] rounded-full bg-background border border-border/60 px-1.5 py-0.5 text-muted-foreground", children: display }) : null;
                })()
              ]
            },
            n.to
          );
        }),
        !collapsed && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-2 pt-4 pb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold", children: t("app.admin") }),
          workspaceNav.map((n) => {
            const active = path.startsWith(n.to);
            return /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Link,
              {
                to: n.to,
                className: cn("flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors", active ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(n.icon, { className: cn("h-4 w-4", active && "text-brand") }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t(n.labelKey) })
                ]
              },
              n.to
            );
          })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-3 border-t border-border/60", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/app/settings", className: cn("flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground hover:bg-accent/60 hover:text-foreground", collapsed && "justify-center"), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Settings, { className: "h-4 w-4" }),
          !collapsed && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Settings" })
        ] }),
        collapsed && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setCollapsed(false), className: "mt-1 w-full grid place-items-center py-2 text-muted-foreground hover:text-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronsLeft, { className: "h-4 w-4 rotate-180" }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 flex flex-col min-w-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "h-16 border-b border-border/60 bg-background/80 backdrop-blur-xl sticky top-0 z-20 flex items-center px-6 gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 max-w-md", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              placeholder: t("app.search"),
              className: "w-full rounded-md border border-border/60 bg-background/60 pl-9 pr-12 py-2 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("kbd", { className: "absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground border border-border/60 rounded px-1.5 py-0.5", children: "⌘K" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ml-auto flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "grid h-9 w-9 place-items-center rounded-md border border-border/60 hover:bg-accent transition-colors text-muted-foreground hover:text-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(LangSwitcher, {}),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ThemeToggle, {}),
          /* @__PURE__ */ jsxRuntimeExports.jsx(NotificationBell, {}),
          /* @__PURE__ */ jsxRuntimeExports.jsx(UserMenu, {})
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "flex-1 min-w-0", children: children ?? /* @__PURE__ */ jsxRuntimeExports.jsx(Outlet, {}) })
    ] })
  ] });
}
const SplitComponent = () => /* @__PURE__ */ jsxRuntimeExports.jsx(AppShell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Outlet, {}) });
export {
  SplitComponent as component
};
