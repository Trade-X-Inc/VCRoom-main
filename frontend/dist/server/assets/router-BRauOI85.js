import { jsx, jsxs } from "react/jsx-runtime";
import { createRootRoute, Link, Outlet, HeadContent, Scripts, createFileRoute, lazyRouteComponent, redirect, isRedirect, createRouter, useRouter } from "@tanstack/react-router";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { useState, useEffect, createContext, useContext, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import { Toaster as Toaster$1 } from "sonner";
import { T as TSS_SERVER_FUNCTION, g as getServerFnById, c as createServerFn } from "../server.js";
import "clsx";
const url = "https://ldimninnjlvxozubheib.supabase.co";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkaW1uaW5uamx2eG96dWJoZWliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczOTgzNjgsImV4cCI6MjA5Mjk3NDM2OH0.l57v3deTN8WraFeQM6HG_qMCYfo89R08wHa7L31T_wI";
const supabase = createClient(url, anonKey);
async function logActivity(dealRoomId, actorId, action, metadata) {
  await supabase.from("activities").insert({ deal_room_id: dealRoomId, actor_id: actorId, action, metadata: {} });
}
async function createNotification(userId, title, body, type, dealRoomId, actionUrl) {
  await supabase.from("notifications").insert({
    user_id: userId,
    title,
    body,
    type,
    deal_room_id: dealRoomId ?? null,
    action_url: actionUrl ?? null
  });
}
async function uploadDocument(file, dealRoomId, userId) {
  const path = `${dealRoomId}/${userId}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from("documents").upload(path, file, { upsert: false });
  if (error) {
    console.error(error);
    return null;
  }
  const { data } = await supabase.storage.from("documents").createSignedUrl(path, 60 * 60);
  return data ? { path, signedUrl: data.signedUrl } : null;
}
const AuthContext = createContext({
  user: null,
  loading: true,
  signOut: async () => {
  }
});
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const buildUser = async (supabaseUser) => {
    const { data } = await supabase.from("users").select("role, full_name").eq("id", supabaseUser.id).maybeSingle();
    const role = data?.role || supabaseUser.user_metadata?.role || "founder";
    return {
      id: supabaseUser.id,
      email: supabaseUser.email || "",
      fullName: data?.full_name || supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || supabaseUser.email?.split("@")[0] || "",
      role
    };
  };
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const appUser = await buildUser(session.user);
        setUser(appUser);
      }
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const appUser = await buildUser(session.user);
          setUser(appUser);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );
    return () => subscription.unsubscribe();
  }, []);
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = "/sign-in";
  };
  return /* @__PURE__ */ jsx(AuthContext.Provider, { value: { user, loading, signOut }, children });
}
function useAuth() {
  return useContext(AuthContext);
}
const ThemeContext = createContext(null);
const STORAGE_KEY$1 = "vr.theme";
function systemPref() {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
function apply(resolved) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}
function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState("system");
  const [resolved, setResolved] = useState("light");
  useEffect(() => {
    const stored = typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY$1) || "system";
    setThemeState(stored);
  }, []);
  useEffect(() => {
    const next = theme === "system" ? systemPref() : theme;
    setResolved(next);
    apply(next);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY$1, theme);
  }, [theme]);
  useEffect(() => {
    if (theme !== "system" || typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const n = systemPref();
      setResolved(n);
      apply(n);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);
  return /* @__PURE__ */ jsx(ThemeContext.Provider, { value: { theme, resolved, setTheme: setThemeState }, children });
}
function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
const LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧", dir: "ltr" },
  { code: "es", label: "Español", flag: "🇪🇸", dir: "ltr" },
  { code: "fr", label: "Français", flag: "🇫🇷", dir: "ltr" },
  { code: "de", label: "Deutsch", flag: "🇩🇪", dir: "ltr" }
];
const en = {
  "nav.product": "Product",
  "nav.founders": "Founders",
  "nav.investors": "Investors",
  "nav.pricing": "Pricing",
  "nav.solutions": "Solutions",
  "nav.signin": "Sign in",
  "nav.getStarted": "Get started",
  "app.search": "Search investors, documents, deals…",
  "app.overview": "Overview",
  "app.leads": "VC Leads",
  "app.email": "AI Email",
  "app.profile": "Company Profile",
  "app.documents": "Documents",
  "app.dealRooms": "Deal Rooms",
  "app.messages": "Team Messages",
  "app.meetings": "Meetings",
  "app.advisor": "AI Advisor",
  "app.pipeline": "Pipeline",
  "app.startups": "Startups",
  "app.diligence": "Due Diligence",
  "app.analysis": "AI Analysis",
  "app.decisions": "Decisions",
  "app.users": "Team & users",
  "app.audit": "Audit log",
  "app.notifications": "Notifications",
  "app.settings": "Settings",
  "app.workspace": "Workspace",
  "app.investorView": "Investor view",
  "app.founderView": "Founder view",
  "app.switchView": "Switch view",
  "app.admin": "Admin",
  "settings.theme": "Theme",
  "settings.language": "Language",
  "settings.notifications": "Notification rules",
  "settings.light": "Light",
  "settings.dark": "Dark",
  "settings.system": "System",
  "pipeline.title": "Deal Pipeline",
  "pipeline.subtitle": "Drag deals between stages. AI surfaces stale and hot deals.",
  "pipeline.newDeal": "New deal",
  "pipeline.deals": "deals",
  "chat.placeholder": "Message the deal room…",
  "chat.send": "Send",
  "chat.online": "online",
  "checklist.title": "Due Diligence Checklist",
  "checklist.complete": "complete",
  "checklist.add": "Add item",
  "checklist.owner": "Owner",
  "checklist.due": "Due",
  "docs.upload": "Upload",
  "docs.dropHere": "Drop files here",
  "docs.dragOr": "Drag & drop or click to upload",
  "docs.maxSize": "Up to 50 MB · PDF, DOCX, XLSX, PNG",
  "reports.download": "Download report",
  "reports.csv": "CSV",
  "reports.pdf": "PDF",
  "reports.title": "Reports",
  "reports.subtitle": "Export pipeline, diligence, and activity for your partners.",
  "rules.title": "Notification rules",
  "rules.subtitle": "Pick what you get notified about and where.",
  "rules.channels": "Channels",
  "rules.events": "Events",
  "rules.email": "Email",
  "rules.inApp": "In-app",
  "rules.push": "Push",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.add": "Add",
  "common.delete": "Delete"
};
const es = {
  "nav.product": "Producto",
  "nav.founders": "Fundadores",
  "nav.investors": "Inversores",
  "nav.pricing": "Precios",
  "nav.solutions": "Soluciones",
  "nav.signin": "Iniciar sesión",
  "nav.getStarted": "Comenzar",
  "app.search": "Buscar inversores, documentos, operaciones…",
  "app.overview": "Resumen",
  "app.leads": "Leads VC",
  "app.email": "Email IA",
  "app.profile": "Perfil",
  "app.documents": "Documentos",
  "app.dealRooms": "Salas de Trato",
  "app.messages": "Mensajes",
  "app.meetings": "Reuniones",
  "app.advisor": "Asesor IA",
  "app.pipeline": "Pipeline",
  "app.startups": "Startups",
  "app.diligence": "Due Diligence",
  "app.analysis": "Análisis IA",
  "app.decisions": "Decisiones",
  "app.users": "Equipo",
  "app.audit": "Auditoría",
  "app.notifications": "Notificaciones",
  "app.settings": "Ajustes",
  "app.workspace": "Espacio",
  "app.investorView": "Vista inversor",
  "app.founderView": "Vista fundador",
  "app.switchView": "Cambiar vista",
  "app.admin": "Admin",
  "settings.theme": "Tema",
  "settings.language": "Idioma",
  "settings.notifications": "Reglas de notificaciones",
  "settings.light": "Claro",
  "settings.dark": "Oscuro",
  "settings.system": "Sistema",
  "pipeline.title": "Pipeline de Tratos",
  "pipeline.subtitle": "Arrastra tratos entre etapas. La IA destaca los calientes.",
  "pipeline.newDeal": "Nuevo trato",
  "pipeline.deals": "tratos",
  "chat.placeholder": "Mensaje al deal room…",
  "chat.send": "Enviar",
  "chat.online": "en línea",
  "checklist.title": "Lista de Due Diligence",
  "checklist.complete": "completo",
  "checklist.add": "Agregar",
  "checklist.owner": "Responsable",
  "checklist.due": "Fecha",
  "docs.upload": "Subir",
  "docs.dropHere": "Suelta archivos",
  "docs.dragOr": "Arrastra o haz clic para subir",
  "docs.maxSize": "Hasta 50 MB · PDF, DOCX, XLSX, PNG",
  "reports.download": "Descargar reporte",
  "reports.csv": "CSV",
  "reports.pdf": "PDF",
  "reports.title": "Reportes",
  "reports.subtitle": "Exporta pipeline, diligencia y actividad.",
  "rules.title": "Reglas de notificación",
  "rules.subtitle": "Elige qué notificaciones recibir y dónde.",
  "rules.channels": "Canales",
  "rules.events": "Eventos",
  "rules.email": "Email",
  "rules.inApp": "En app",
  "rules.push": "Push",
  "common.save": "Guardar",
  "common.cancel": "Cancelar",
  "common.add": "Agregar",
  "common.delete": "Eliminar"
};
const fr = {
  "nav.product": "Produit",
  "nav.founders": "Fondateurs",
  "nav.investors": "Investisseurs",
  "nav.pricing": "Tarifs",
  "nav.solutions": "Solutions",
  "nav.signin": "Connexion",
  "nav.getStarted": "Commencer",
  "app.search": "Rechercher investisseurs, documents…",
  "app.overview": "Vue d'ensemble",
  "app.leads": "Leads VC",
  "app.email": "Email IA",
  "app.profile": "Profil",
  "app.documents": "Documents",
  "app.dealRooms": "Deal Rooms",
  "app.messages": "Messages",
  "app.meetings": "Réunions",
  "app.advisor": "Conseiller IA",
  "app.pipeline": "Pipeline",
  "app.startups": "Startups",
  "app.diligence": "Due Diligence",
  "app.analysis": "Analyse IA",
  "app.decisions": "Décisions",
  "app.users": "Équipe",
  "app.audit": "Journal",
  "app.notifications": "Notifications",
  "app.settings": "Paramètres",
  "app.workspace": "Espace",
  "app.investorView": "Vue investisseur",
  "app.founderView": "Vue fondateur",
  "app.switchView": "Changer",
  "app.admin": "Admin",
  "settings.theme": "Thème",
  "settings.language": "Langue",
  "settings.notifications": "Règles de notification",
  "settings.light": "Clair",
  "settings.dark": "Sombre",
  "settings.system": "Système",
  "pipeline.title": "Pipeline de Deals",
  "pipeline.subtitle": "Glissez les deals entre les étapes.",
  "pipeline.newDeal": "Nouveau deal",
  "pipeline.deals": "deals",
  "chat.placeholder": "Message au deal room…",
  "chat.send": "Envoyer",
  "chat.online": "en ligne",
  "checklist.title": "Liste Due Diligence",
  "checklist.complete": "complet",
  "checklist.add": "Ajouter",
  "checklist.owner": "Responsable",
  "checklist.due": "Échéance",
  "docs.upload": "Téléverser",
  "docs.dropHere": "Déposez ici",
  "docs.dragOr": "Glissez-déposez ou cliquez",
  "docs.maxSize": "Jusqu'à 50 Mo · PDF, DOCX, XLSX, PNG",
  "reports.download": "Télécharger",
  "reports.csv": "CSV",
  "reports.pdf": "PDF",
  "reports.title": "Rapports",
  "reports.subtitle": "Exportez pipeline, diligence et activité.",
  "rules.title": "Règles de notification",
  "rules.subtitle": "Choisissez ce que vous recevez.",
  "rules.channels": "Canaux",
  "rules.events": "Événements",
  "rules.email": "Email",
  "rules.inApp": "App",
  "rules.push": "Push",
  "common.save": "Enregistrer",
  "common.cancel": "Annuler",
  "common.add": "Ajouter",
  "common.delete": "Supprimer"
};
const de = {
  "nav.product": "Produkt",
  "nav.founders": "Gründer",
  "nav.investors": "Investoren",
  "nav.pricing": "Preise",
  "nav.solutions": "Lösungen",
  "nav.signin": "Anmelden",
  "nav.getStarted": "Loslegen",
  "app.search": "Investoren, Dokumente, Deals suchen…",
  "app.overview": "Übersicht",
  "app.leads": "VC Leads",
  "app.email": "KI Email",
  "app.profile": "Profil",
  "app.documents": "Dokumente",
  "app.dealRooms": "Deal Rooms",
  "app.messages": "Nachrichten",
  "app.meetings": "Meetings",
  "app.advisor": "KI Berater",
  "app.pipeline": "Pipeline",
  "app.startups": "Startups",
  "app.diligence": "Due Diligence",
  "app.analysis": "KI Analyse",
  "app.decisions": "Entscheidungen",
  "app.users": "Team",
  "app.audit": "Protokoll",
  "app.notifications": "Benachrichtigungen",
  "app.settings": "Einstellungen",
  "app.workspace": "Workspace",
  "app.investorView": "Investor-Ansicht",
  "app.founderView": "Gründer-Ansicht",
  "app.switchView": "Wechseln",
  "app.admin": "Admin",
  "settings.theme": "Design",
  "settings.language": "Sprache",
  "settings.notifications": "Benachrichtigungsregeln",
  "settings.light": "Hell",
  "settings.dark": "Dunkel",
  "settings.system": "System",
  "pipeline.title": "Deal-Pipeline",
  "pipeline.subtitle": "Deals zwischen Phasen ziehen.",
  "pipeline.newDeal": "Neuer Deal",
  "pipeline.deals": "Deals",
  "chat.placeholder": "Nachricht an Deal Room…",
  "chat.send": "Senden",
  "chat.online": "online",
  "checklist.title": "Due-Diligence-Checkliste",
  "checklist.complete": "fertig",
  "checklist.add": "Hinzufügen",
  "checklist.owner": "Verantwortlich",
  "checklist.due": "Fällig",
  "docs.upload": "Hochladen",
  "docs.dropHere": "Dateien ablegen",
  "docs.dragOr": "Drag & Drop oder klicken",
  "docs.maxSize": "Bis 50 MB · PDF, DOCX, XLSX, PNG",
  "reports.download": "Bericht laden",
  "reports.csv": "CSV",
  "reports.pdf": "PDF",
  "reports.title": "Berichte",
  "reports.subtitle": "Pipeline, Diligence und Aktivität exportieren.",
  "rules.title": "Benachrichtigungsregeln",
  "rules.subtitle": "Wählen Sie, was Sie erhalten.",
  "rules.channels": "Kanäle",
  "rules.events": "Ereignisse",
  "rules.email": "Email",
  "rules.inApp": "In-App",
  "rules.push": "Push",
  "common.save": "Speichern",
  "common.cancel": "Abbrechen",
  "common.add": "Hinzufügen",
  "common.delete": "Löschen"
};
const dicts = { en, es, fr, de };
const STORAGE_KEY = "vr.lang";
const I18nContext = createContext(null);
function I18nProvider({ children }) {
  const [lang, setLangState] = useState("en");
  useEffect(() => {
    const stored = typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) || "en";
    setLangState(stored);
  }, []);
  const dir = LANGUAGES.find((l) => l.code === lang)?.dir ?? "ltr";
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, lang);
  }, [lang, dir]);
  const t = useMemo(() => (key) => dicts[lang][key] ?? dicts.en[key] ?? key, [lang]);
  const ctx = useMemo(() => ({ lang, dir, setLang: setLangState, t }), [lang, dir, t]);
  return /* @__PURE__ */ jsx(I18nContext.Provider, { value: ctx, children });
}
function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
const Toaster = ({ ...props }) => {
  return /* @__PURE__ */ jsx(
    Toaster$1,
    {
      className: "toaster group",
      toastOptions: {
        classNames: {
          toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground"
        }
      },
      ...props
    }
  );
};
const appCss = "/assets/styles-SiEUTrmS.css";
const queryClient = new QueryClient();
function NotFoundComponent() {
  return /* @__PURE__ */ jsx("div", { className: "flex min-h-screen items-center justify-center bg-background px-4", children: /* @__PURE__ */ jsxs("div", { className: "max-w-md text-center", children: [
    /* @__PURE__ */ jsx("h1", { className: "text-7xl font-bold text-foreground", children: "404" }),
    /* @__PURE__ */ jsx("h2", { className: "mt-4 text-xl font-semibold text-foreground", children: "Page not found" }),
    /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "The page you're looking for doesn't exist or has been moved." }),
    /* @__PURE__ */ jsx("div", { className: "mt-6", children: /* @__PURE__ */ jsx(
      Link,
      {
        to: "/",
        className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
        children: "Go home"
      }
    ) })
  ] }) });
}
const Route$Q = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      { title: "VentureRoom — Where deals get decided" },
      { name: "description", content: "AI-powered fundraising platform for founders and investors. Manage VC outreach, create secure deal rooms, and close your round faster." },
      { name: "author", content: "VentureRoom" },
      { name: "theme-color", content: "#6C5CE7" },
      { property: "og:title", content: "VentureRoom — Where deals get decided" },
      { property: "og:description", content: "AI-powered fundraising platform for founders and investors. Manage VC outreach, create secure deal rooms, and close your round faster." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@VentureRoom" }
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" }
    ]
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent
});
function RootShell({ children }) {
  return /* @__PURE__ */ jsxs("html", { lang: "en", children: [
    /* @__PURE__ */ jsx("head", { children: /* @__PURE__ */ jsx(HeadContent, {}) }),
    /* @__PURE__ */ jsxs("body", { children: [
      children,
      /* @__PURE__ */ jsx(Scripts, {})
    ] })
  ] });
}
function RootComponent() {
  if (typeof window !== "undefined") {
    console.log("[env-check] VITE_SUPABASE_URL:", "https://ldimninnjlvxozubheib.supabase.co"?.slice(0, 20) ?? "MISSING");
    console.log("[env-check] VITE_SUPABASE_ANON_KEY:", "present");
    console.log("[env-check] VITE_GOOGLE_CLIENT_ID:", "present");
  }
  return /* @__PURE__ */ jsx(QueryClientProvider, { client: queryClient, children: /* @__PURE__ */ jsx(ThemeProvider, { children: /* @__PURE__ */ jsx(I18nProvider, { children: /* @__PURE__ */ jsxs(AuthProvider, { children: [
    /* @__PURE__ */ jsx(Outlet, {}),
    /* @__PURE__ */ jsx(Toaster, {})
  ] }) }) }) });
}
const $$splitComponentImporter$P = () => import("./terms-Cbz3Tj9R.js");
const Route$P = createFileRoute("/terms")({
  head: () => ({
    meta: [{
      title: "Terms of Service — Venture Room"
    }, {
      name: "description",
      content: "Terms of Service for Venture Room."
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$P, "component")
});
const $$splitComponentImporter$O = () => import("./sign-up-DZLhpchY.js");
const Route$O = createFileRoute("/sign-up")({
  component: lazyRouteComponent($$splitComponentImporter$O, "component")
});
const $$splitComponentImporter$N = () => import("./sign-in-Ctjfar7F.js");
const Route$N = createFileRoute("/sign-in")({
  component: lazyRouteComponent($$splitComponentImporter$N, "component")
});
const $$splitComponentImporter$M = () => import("./privacy-RfxBcgHR.js");
const Route$M = createFileRoute("/privacy")({
  head: () => ({
    meta: [{
      title: "Privacy Policy — Venture Room"
    }, {
      name: "description",
      content: "Privacy Policy for Venture Room."
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$M, "component")
});
const $$splitComponentImporter$L = () => import("./pricing-Dvg8v-6T.js");
const Route$L = createFileRoute("/pricing")({
  head: () => ({
    meta: [{
      title: "Pricing — Venture Room"
    }, {
      name: "description",
      content: "Simple pricing for founders, investors, and funds raising or evaluating deals."
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$L, "component")
});
const $$splitComponentImporter$K = () => import("./investors-CSh5h1s2.js");
const Route$K = createFileRoute("/investors")({
  head: () => ({
    meta: [{
      title: "For Investors — Venture Room"
    }, {
      name: "description",
      content: "Evaluate, diligence, and decide. The structured deal room investors actually use."
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$K, "component")
});
const $$splitComponentImporter$J = () => import("./founders-IJ2YAJez.js");
const Route$J = createFileRoute("/founders")({
  head: () => ({
    meta: [{
      title: "For Founders — Venture Room"
    }, {
      name: "description",
      content: "Run your fundraise like a pro. CRM, AI email, deal rooms — built for founders."
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$J, "component")
});
const $$splitComponentImporter$I = () => import("./forgot-password-EoMP8m7p.js");
const Route$I = createFileRoute("/forgot-password")({
  component: lazyRouteComponent($$splitComponentImporter$I, "component")
});
const $$splitComponentImporter$H = () => import("./debug-CczGkfZq.js");
const Route$H = createFileRoute("/debug")({
  component: lazyRouteComponent($$splitComponentImporter$H, "component")
});
const $$splitComponentImporter$G = () => import("./app-Cq3KkfMu.js");
const Route$G = createFileRoute("/app")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    try {
      let session = null;
      let attempts = 0;
      while (!session && attempts < 3) {
        const {
          data
        } = await supabase.auth.getSession();
        session = data.session;
        if (!session && attempts < 2) await new Promise((r) => setTimeout(r, 300));
        attempts++;
      }
      if (!session) throw redirect({
        to: "/sign-in",
        search: {}
      });
    } catch (err) {
      if (isRedirect(err)) throw err;
    }
  },
  component: lazyRouteComponent($$splitComponentImporter$G, "component")
});
const $$splitComponentImporter$F = () => import("./about-DjYzlz5P.js");
const Route$F = createFileRoute("/about")({
  head: () => ({
    meta: [{
      title: "About Us — Venture Room"
    }, {
      name: "description",
      content: "Learn about the mission behind Venture Room and how we're transforming venture capital interactions."
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$F, "component")
});
const $$splitComponentImporter$E = () => import("./index-C1rcQwV4.js");
const Route$E = createFileRoute("/")({
  head: () => ({
    meta: [{
      title: "Venture Room — Where Deals Get Decided"
    }, {
      name: "description",
      content: "AI-powered fundraising CRM and deal room. Manage your entire fundraise — from first investor email to final decision — in one structured platform."
    }, {
      property: "og:title",
      content: "Venture Room — Where Deals Get Decided"
    }, {
      property: "og:description",
      content: "The investor-grade platform for founders and VCs. CRM, Deal Room, AI."
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$E, "component")
});
const $$splitComponentImporter$D = () => import("./app.index-gth79moq.js");
const Route$D = createFileRoute("/app/")({
  component: lazyRouteComponent($$splitComponentImporter$D, "component")
});
const $$splitComponentImporter$C = () => import("./solutions.vc-deal-room-BPidwXDV.js");
const Route$C = createFileRoute("/solutions/vc-deal-room")({
  head: () => ({
    meta: [{
      title: "VC Deal Room Software — Venture Room"
    }, {
      name: "description",
      content: "Structured deal rooms with NDA, document vault, Q&A, and decision board."
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$C, "component")
});
const $$splitComponentImporter$B = () => import("./solutions.raise-1m-D-yEWW8Y.js");
const Route$B = createFileRoute("/solutions/raise-1m")({
  head: () => ({
    meta: [{
      title: "Raise Your First $1M — Venture Room"
    }, {
      name: "description",
      content: "The complete playbook and platform to raise your first million."
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$B, "component")
});
const $$splitComponentImporter$A = () => import("./solutions.investor-pipeline-DbhPMpY0.js");
const Route$A = createFileRoute("/solutions/investor-pipeline")({
  head: () => ({
    meta: [{
      title: "Investor Pipeline Management Tool — Venture Room"
    }, {
      name: "description",
      content: "Manage every investor relationship across the full lifecycle of your raise."
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$A, "component")
});
const $$splitComponentImporter$z = () => import("./solutions.fundraising-crm-CMw81zT6.js");
const Route$z = createFileRoute("/solutions/fundraising-crm")({
  head: () => ({
    meta: [{
      title: "Fundraising CRM for Startups — Venture Room"
    }, {
      name: "description",
      content: "The fundraising CRM built for startups. Pipeline, AI email, follow-ups, and analytics."
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$z, "component")
});
const $$splitComponentImporter$y = () => import("./solutions.due-diligence-ShFU7AwW.js");
const Route$y = createFileRoute("/solutions/due-diligence")({
  head: () => ({
    meta: [{
      title: "Startup Due Diligence Platform — Venture Room"
    }, {
      name: "description",
      content: "Templated due diligence across legal, financial, technical, and market."
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$y, "component")
});
const $$splitComponentImporter$x = () => import("./join._token-BST4WH6h.js");
const Route$x = createFileRoute("/join/$token")({
  component: lazyRouteComponent($$splitComponentImporter$x, "component")
});
const $$splitComponentImporter$w = () => import("./auth.callback-CoLhWSAL.js");
const Route$w = createFileRoute("/auth/callback")({
  component: lazyRouteComponent($$splitComponentImporter$w, "component")
});
const $$splitComponentImporter$v = () => import("./app.users-DsamaZ4_.js");
const Route$v = createFileRoute("/app/users")({
  component: lazyRouteComponent($$splitComponentImporter$v, "component")
});
const $$splitComponentImporter$u = () => import("./app.settings-Bw0rvynr.js");
const Route$u = createFileRoute("/app/settings")({
  component: lazyRouteComponent($$splitComponentImporter$u, "component")
});
const $$splitComponentImporter$t = () => import("./app.reports-Cr24rL5e.js");
const Route$t = createFileRoute("/app/reports")({
  component: lazyRouteComponent($$splitComponentImporter$t, "component")
});
const $$splitComponentImporter$s = () => import("./app.profile-CRVIQQvX.js");
const Route$s = createFileRoute("/app/profile")({
  component: lazyRouteComponent($$splitComponentImporter$s, "component")
});
const $$splitComponentImporter$r = () => import("./app.pipeline-DVnzKtpg.js");
const Route$r = createFileRoute("/app/pipeline")({
  component: lazyRouteComponent($$splitComponentImporter$r, "component")
});
const $$splitComponentImporter$q = () => import("./app.notifications-CeL5tZom.js");
const Route$q = createFileRoute("/app/notifications")({
  component: lazyRouteComponent($$splitComponentImporter$q, "component")
});
const $$splitComponentImporter$p = () => import("./app.messages-ZOEv1Pop.js");
const Route$p = createFileRoute("/app/messages")({
  component: lazyRouteComponent($$splitComponentImporter$p, "component")
});
const $$splitComponentImporter$o = () => import("./app.meetings-BE-qsNXO.js");
const Route$o = createFileRoute("/app/meetings")({
  component: lazyRouteComponent($$splitComponentImporter$o, "component")
});
const $$splitComponentImporter$n = () => import("./app.leads-B0RWa4G6.js");
const Route$n = createFileRoute("/app/leads")({
  component: lazyRouteComponent($$splitComponentImporter$n, "component")
});
const $$splitComponentImporter$m = () => import("./app.investor-BFsOu0JM.js");
const Route$m = createFileRoute("/app/investor")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    try {
      let session = null;
      let attempts = 0;
      while (!session && attempts < 3) {
        const {
          data
        } = await supabase.auth.getSession();
        session = data.session;
        if (!session && attempts < 2) await new Promise((r) => setTimeout(r, 300));
        attempts++;
      }
      if (!session) throw redirect({
        to: "/sign-in",
        search: {}
      });
      const {
        data: userRecord
      } = await supabase.from("users").select("role").eq("id", session.user.id).maybeSingle();
      const role = userRecord?.role || session.user.user_metadata?.role;
      if (role === "founder") throw redirect({
        to: "/app",
        search: {}
      });
    } catch (err) {
      if (isRedirect(err)) throw err;
    }
  },
  component: lazyRouteComponent($$splitComponentImporter$m, "component")
});
const $$splitComponentImporter$l = () => import("./app.email-CbI5DM3y.js");
const Route$l = createFileRoute("/app/email")({
  component: lazyRouteComponent($$splitComponentImporter$l, "component")
});
const $$splitComponentImporter$k = () => import("./app.documents-BAWfL-SO.js");
const Route$k = createFileRoute("/app/documents")({
  component: lazyRouteComponent($$splitComponentImporter$k, "component")
});
const $$splitComponentImporter$j = () => import("./app.deal-rooms-oZhZwwt0.js");
const Route$j = createFileRoute("/app/deal-rooms")({
  component: lazyRouteComponent($$splitComponentImporter$j, "component")
});
const $$splitComponentImporter$i = () => import("./app.audit-Dz_yfFC8.js");
const Route$i = createFileRoute("/app/audit")({
  component: lazyRouteComponent($$splitComponentImporter$i, "component")
});
const $$splitComponentImporter$h = () => import("./app.advisor-BVKHGHNx.js");
const Route$h = createFileRoute("/app/advisor")({
  component: lazyRouteComponent($$splitComponentImporter$h, "component")
});
var createSsrRpc = (functionId) => {
  const url2 = "/_serverFn/" + functionId;
  const serverFnMeta = { id: functionId };
  const fn = async (...args) => {
    return (await getServerFnById(functionId))(...args);
  };
  return Object.assign(fn, {
    url: url2,
    serverFnMeta,
    [TSS_SERVER_FUNCTION]: true
  });
};
const $$splitComponentImporter$g = () => import("./api.test-ai-BlgUtB4Z.js");
const checkAIKeys = createServerFn({
  method: "GET"
}).handler(createSsrRpc("157f76e85df17cf0242a7d5c8036d366db569f6a04eeaffd5e9d8f9789563b44"));
const Route$g = createFileRoute("/api/test-ai")({
  loader: () => checkAIKeys(),
  component: lazyRouteComponent($$splitComponentImporter$g, "component")
});
const $$splitComponentImporter$f = () => import("./app.investor.index-BU2HcxAX.js");
const Route$f = createFileRoute("/app/investor/")({
  component: lazyRouteComponent($$splitComponentImporter$f, "component")
});
const $$splitComponentImporter$e = () => import("./app.settings.security-qh4_RpWG.js");
const Route$e = createFileRoute("/app/settings/security")({
  component: lazyRouteComponent($$splitComponentImporter$e, "component")
});
const $$splitComponentImporter$d = () => import("./app.settings.notifications-C6cZW6yT.js");
const Route$d = createFileRoute("/app/settings/notifications")({
  component: lazyRouteComponent($$splitComponentImporter$d, "component")
});
const $$splitComponentImporter$c = () => import("./app.settings.domain-Baf0I4yA.js");
const Route$c = createFileRoute("/app/settings/domain")({
  component: lazyRouteComponent($$splitComponentImporter$c, "component")
});
const $$splitComponentImporter$b = () => import("./app.settings.billing-wl3kYi6Q.js");
const Route$b = createFileRoute("/app/settings/billing")({
  component: lazyRouteComponent($$splitComponentImporter$b, "component")
});
const $$splitComponentImporter$a = () => import("./app.investor.team-Bd_bKdPo.js");
const Route$a = createFileRoute("/app/investor/team")({
  component: lazyRouteComponent($$splitComponentImporter$a, "component")
});
const $$splitComponentImporter$9 = () => import("./app.investor.startups-BX6bI7qA.js");
const Route$9 = createFileRoute("/app/investor/startups")({
  component: lazyRouteComponent($$splitComponentImporter$9, "component")
});
const $$splitComponentImporter$8 = () => import("./app.investor.portfolio-_xxEwoWE.js");
const Route$8 = createFileRoute("/app/investor/portfolio")({
  component: lazyRouteComponent($$splitComponentImporter$8, "component")
});
const $$splitComponentImporter$7 = () => import("./app.investor.pipeline-bYyouJX7.js");
const Route$7 = createFileRoute("/app/investor/pipeline")({
  component: lazyRouteComponent($$splitComponentImporter$7, "component")
});
const $$splitComponentImporter$6 = () => import("./app.investor.diligence-CLg1uA8M.js");
const Route$6 = createFileRoute("/app/investor/diligence")({
  component: lazyRouteComponent($$splitComponentImporter$6, "component")
});
const $$splitComponentImporter$5 = () => import("./app.investor.decisions-Bx1Nmslj.js");
const Route$5 = createFileRoute("/app/investor/decisions")({
  component: lazyRouteComponent($$splitComponentImporter$5, "component")
});
const $$splitComponentImporter$4 = () => import("./app.investor.deal-rooms-Bq4IJp9K.js");
const Route$4 = createFileRoute("/app/investor/deal-rooms")({
  component: lazyRouteComponent($$splitComponentImporter$4, "component")
});
const $$splitComponentImporter$3 = () => import("./app.investor.deal-flow-EZLYWi-h.js");
const Route$3 = createFileRoute("/app/investor/deal-flow")({
  component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
const $$splitComponentImporter$2 = () => import("./app.investor.analysis-DMf2gbz6.js");
const Route$2 = createFileRoute("/app/investor/analysis")({
  component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
const $$splitComponentImporter$1 = () => import("./app.deal-room._id-olRUbhrW.js");
const Route$1 = createFileRoute("/app/deal-room/$id")({
  component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
const $$splitComponentImporter = () => import("./app.deal-room._id_.nda-Dzoe2vTQ.js");
const Route = createFileRoute("/app/deal-room/$id_/nda")({
  component: lazyRouteComponent($$splitComponentImporter, "component")
});
const TermsRoute = Route$P.update({
  id: "/terms",
  path: "/terms",
  getParentRoute: () => Route$Q
});
const SignUpRoute = Route$O.update({
  id: "/sign-up",
  path: "/sign-up",
  getParentRoute: () => Route$Q
});
const SignInRoute = Route$N.update({
  id: "/sign-in",
  path: "/sign-in",
  getParentRoute: () => Route$Q
});
const PrivacyRoute = Route$M.update({
  id: "/privacy",
  path: "/privacy",
  getParentRoute: () => Route$Q
});
const PricingRoute = Route$L.update({
  id: "/pricing",
  path: "/pricing",
  getParentRoute: () => Route$Q
});
const InvestorsRoute = Route$K.update({
  id: "/investors",
  path: "/investors",
  getParentRoute: () => Route$Q
});
const FoundersRoute = Route$J.update({
  id: "/founders",
  path: "/founders",
  getParentRoute: () => Route$Q
});
const ForgotPasswordRoute = Route$I.update({
  id: "/forgot-password",
  path: "/forgot-password",
  getParentRoute: () => Route$Q
});
const DebugRoute = Route$H.update({
  id: "/debug",
  path: "/debug",
  getParentRoute: () => Route$Q
});
const AppRoute = Route$G.update({
  id: "/app",
  path: "/app",
  getParentRoute: () => Route$Q
});
const AboutRoute = Route$F.update({
  id: "/about",
  path: "/about",
  getParentRoute: () => Route$Q
});
const IndexRoute = Route$E.update({
  id: "/",
  path: "/",
  getParentRoute: () => Route$Q
});
const AppIndexRoute = Route$D.update({
  id: "/",
  path: "/",
  getParentRoute: () => AppRoute
});
const SolutionsVcDealRoomRoute = Route$C.update({
  id: "/solutions/vc-deal-room",
  path: "/solutions/vc-deal-room",
  getParentRoute: () => Route$Q
});
const SolutionsRaise1mRoute = Route$B.update({
  id: "/solutions/raise-1m",
  path: "/solutions/raise-1m",
  getParentRoute: () => Route$Q
});
const SolutionsInvestorPipelineRoute = Route$A.update({
  id: "/solutions/investor-pipeline",
  path: "/solutions/investor-pipeline",
  getParentRoute: () => Route$Q
});
const SolutionsFundraisingCrmRoute = Route$z.update({
  id: "/solutions/fundraising-crm",
  path: "/solutions/fundraising-crm",
  getParentRoute: () => Route$Q
});
const SolutionsDueDiligenceRoute = Route$y.update({
  id: "/solutions/due-diligence",
  path: "/solutions/due-diligence",
  getParentRoute: () => Route$Q
});
const JoinTokenRoute = Route$x.update({
  id: "/join/$token",
  path: "/join/$token",
  getParentRoute: () => Route$Q
});
const AuthCallbackRoute = Route$w.update({
  id: "/auth/callback",
  path: "/auth/callback",
  getParentRoute: () => Route$Q
});
const AppUsersRoute = Route$v.update({
  id: "/users",
  path: "/users",
  getParentRoute: () => AppRoute
});
const AppSettingsRoute = Route$u.update({
  id: "/settings",
  path: "/settings",
  getParentRoute: () => AppRoute
});
const AppReportsRoute = Route$t.update({
  id: "/reports",
  path: "/reports",
  getParentRoute: () => AppRoute
});
const AppProfileRoute = Route$s.update({
  id: "/profile",
  path: "/profile",
  getParentRoute: () => AppRoute
});
const AppPipelineRoute = Route$r.update({
  id: "/pipeline",
  path: "/pipeline",
  getParentRoute: () => AppRoute
});
const AppNotificationsRoute = Route$q.update({
  id: "/notifications",
  path: "/notifications",
  getParentRoute: () => AppRoute
});
const AppMessagesRoute = Route$p.update({
  id: "/messages",
  path: "/messages",
  getParentRoute: () => AppRoute
});
const AppMeetingsRoute = Route$o.update({
  id: "/meetings",
  path: "/meetings",
  getParentRoute: () => AppRoute
});
const AppLeadsRoute = Route$n.update({
  id: "/leads",
  path: "/leads",
  getParentRoute: () => AppRoute
});
const AppInvestorRoute = Route$m.update({
  id: "/investor",
  path: "/investor",
  getParentRoute: () => AppRoute
});
const AppEmailRoute = Route$l.update({
  id: "/email",
  path: "/email",
  getParentRoute: () => AppRoute
});
const AppDocumentsRoute = Route$k.update({
  id: "/documents",
  path: "/documents",
  getParentRoute: () => AppRoute
});
const AppDealRoomsRoute = Route$j.update({
  id: "/deal-rooms",
  path: "/deal-rooms",
  getParentRoute: () => AppRoute
});
const AppAuditRoute = Route$i.update({
  id: "/audit",
  path: "/audit",
  getParentRoute: () => AppRoute
});
const AppAdvisorRoute = Route$h.update({
  id: "/advisor",
  path: "/advisor",
  getParentRoute: () => AppRoute
});
const ApiTestAiRoute = Route$g.update({
  id: "/api/test-ai",
  path: "/api/test-ai",
  getParentRoute: () => Route$Q
});
const AppInvestorIndexRoute = Route$f.update({
  id: "/",
  path: "/",
  getParentRoute: () => AppInvestorRoute
});
const AppSettingsSecurityRoute = Route$e.update({
  id: "/security",
  path: "/security",
  getParentRoute: () => AppSettingsRoute
});
const AppSettingsNotificationsRoute = Route$d.update({
  id: "/notifications",
  path: "/notifications",
  getParentRoute: () => AppSettingsRoute
});
const AppSettingsDomainRoute = Route$c.update({
  id: "/domain",
  path: "/domain",
  getParentRoute: () => AppSettingsRoute
});
const AppSettingsBillingRoute = Route$b.update({
  id: "/billing",
  path: "/billing",
  getParentRoute: () => AppSettingsRoute
});
const AppInvestorTeamRoute = Route$a.update({
  id: "/team",
  path: "/team",
  getParentRoute: () => AppInvestorRoute
});
const AppInvestorStartupsRoute = Route$9.update({
  id: "/startups",
  path: "/startups",
  getParentRoute: () => AppInvestorRoute
});
const AppInvestorPortfolioRoute = Route$8.update({
  id: "/portfolio",
  path: "/portfolio",
  getParentRoute: () => AppInvestorRoute
});
const AppInvestorPipelineRoute = Route$7.update({
  id: "/pipeline",
  path: "/pipeline",
  getParentRoute: () => AppInvestorRoute
});
const AppInvestorDiligenceRoute = Route$6.update({
  id: "/diligence",
  path: "/diligence",
  getParentRoute: () => AppInvestorRoute
});
const AppInvestorDecisionsRoute = Route$5.update({
  id: "/decisions",
  path: "/decisions",
  getParentRoute: () => AppInvestorRoute
});
const AppInvestorDealRoomsRoute = Route$4.update({
  id: "/deal-rooms",
  path: "/deal-rooms",
  getParentRoute: () => AppInvestorRoute
});
const AppInvestorDealFlowRoute = Route$3.update({
  id: "/deal-flow",
  path: "/deal-flow",
  getParentRoute: () => AppInvestorRoute
});
const AppInvestorAnalysisRoute = Route$2.update({
  id: "/analysis",
  path: "/analysis",
  getParentRoute: () => AppInvestorRoute
});
const AppDealRoomIdRoute = Route$1.update({
  id: "/deal-room/$id",
  path: "/deal-room/$id",
  getParentRoute: () => AppRoute
});
const AppDealRoomIdNdaRoute = Route.update({
  id: "/deal-room/$id_/nda",
  path: "/deal-room/$id/nda",
  getParentRoute: () => AppRoute
});
const AppInvestorRouteChildren = {
  AppInvestorAnalysisRoute,
  AppInvestorDealFlowRoute,
  AppInvestorDealRoomsRoute,
  AppInvestorDecisionsRoute,
  AppInvestorDiligenceRoute,
  AppInvestorPipelineRoute,
  AppInvestorPortfolioRoute,
  AppInvestorStartupsRoute,
  AppInvestorTeamRoute,
  AppInvestorIndexRoute
};
const AppInvestorRouteWithChildren = AppInvestorRoute._addFileChildren(
  AppInvestorRouteChildren
);
const AppSettingsRouteChildren = {
  AppSettingsBillingRoute,
  AppSettingsDomainRoute,
  AppSettingsNotificationsRoute,
  AppSettingsSecurityRoute
};
const AppSettingsRouteWithChildren = AppSettingsRoute._addFileChildren(
  AppSettingsRouteChildren
);
const AppRouteChildren = {
  AppAdvisorRoute,
  AppAuditRoute,
  AppDealRoomsRoute,
  AppDocumentsRoute,
  AppEmailRoute,
  AppInvestorRoute: AppInvestorRouteWithChildren,
  AppLeadsRoute,
  AppMeetingsRoute,
  AppMessagesRoute,
  AppNotificationsRoute,
  AppPipelineRoute,
  AppProfileRoute,
  AppReportsRoute,
  AppSettingsRoute: AppSettingsRouteWithChildren,
  AppUsersRoute,
  AppIndexRoute,
  AppDealRoomIdRoute,
  AppDealRoomIdNdaRoute
};
const AppRouteWithChildren = AppRoute._addFileChildren(AppRouteChildren);
const rootRouteChildren = {
  IndexRoute,
  AboutRoute,
  AppRoute: AppRouteWithChildren,
  DebugRoute,
  ForgotPasswordRoute,
  FoundersRoute,
  InvestorsRoute,
  PricingRoute,
  PrivacyRoute,
  SignInRoute,
  SignUpRoute,
  TermsRoute,
  ApiTestAiRoute,
  AuthCallbackRoute,
  JoinTokenRoute,
  SolutionsDueDiligenceRoute,
  SolutionsFundraisingCrmRoute,
  SolutionsInvestorPipelineRoute,
  SolutionsRaise1mRoute,
  SolutionsVcDealRoomRoute
};
const routeTree = Route$Q._addFileChildren(rootRouteChildren)._addFileTypes();
function DefaultErrorComponent({ error, reset }) {
  const router2 = useRouter();
  return /* @__PURE__ */ jsx("div", { className: "flex min-h-screen items-center justify-center bg-background px-4", children: /* @__PURE__ */ jsxs("div", { className: "max-w-md text-center", children: [
    /* @__PURE__ */ jsx("div", { className: "mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10", children: /* @__PURE__ */ jsx(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        className: "h-8 w-8 text-destructive",
        fill: "none",
        viewBox: "0 0 24 24",
        stroke: "currentColor",
        strokeWidth: 2,
        children: /* @__PURE__ */ jsx(
          "path",
          {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            d: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          }
        )
      }
    ) }),
    /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold tracking-tight text-foreground", children: "Something went wrong" }),
    /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "An unexpected error occurred. Please try again." }),
    false,
    /* @__PURE__ */ jsxs("div", { className: "mt-6 flex items-center justify-center gap-3", children: [
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => {
            router2.invalidate();
            reset();
          },
          className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
          children: "Try again"
        }
      ),
      /* @__PURE__ */ jsx(
        "a",
        {
          href: "/",
          className: "inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent",
          children: "Go home"
        }
      )
    ] })
  ] }) });
}
const getRouter = () => {
  const router2 = createRouter({
    routeTree,
    context: {},
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: DefaultErrorComponent
  });
  return router2;
};
const router = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  getRouter
}, Symbol.toStringTag, { value: "Module" }));
export {
  LANGUAGES as L,
  Route$x as R,
  useI18n as a,
  useTheme as b,
  createSsrRpc as c,
  Route$g as d,
  uploadDocument as e,
  createNotification as f,
  Route$1 as g,
  Route as h,
  logActivity as l,
  router as r,
  supabase as s,
  useAuth as u
};
