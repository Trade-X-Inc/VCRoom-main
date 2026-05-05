import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "en" | "es" | "fr" | "de" | "ar";

export const LANGUAGES: { code: Lang; label: string; flag: string; dir: "ltr" | "rtl" }[] = [
  { code: "en", label: "English", flag: "🇬🇧", dir: "ltr" },
  { code: "es", label: "Español", flag: "🇪🇸", dir: "ltr" },
  { code: "fr", label: "Français", flag: "🇫🇷", dir: "ltr" },
  { code: "de", label: "Deutsch", flag: "🇩🇪", dir: "ltr" },
  { code: "ar", label: "العربية", flag: "🇸🇦", dir: "rtl" },
];

type Dict = Record<string, string>;

const en: Dict = {
  "nav.product": "Product", "nav.founders": "Founders", "nav.investors": "Investors", "nav.pricing": "Pricing",
  "nav.solutions": "Solutions", "nav.signin": "Sign in", "nav.getStarted": "Get started",
  "app.search": "Search investors, documents, deals…",
  "app.overview": "Overview", "app.leads": "VC Leads", "app.email": "AI Email", "app.profile": "Startup Profile",
  "app.documents": "Documents", "app.dealRooms": "Deal Rooms", "app.messages": "Messages", "app.meetings": "Meetings",
  "app.advisor": "AI Advisor", "app.pipeline": "Pipeline", "app.startups": "Startups", "app.diligence": "Due Diligence",
  "app.analysis": "AI Analysis", "app.decisions": "Decisions", "app.users": "Team & users", "app.audit": "Audit log",
  "app.notifications": "Notifications", "app.settings": "Settings", "app.workspace": "Workspace", "app.investorView": "Investor view",
  "app.founderView": "Founder view", "app.switchView": "Switch view", "app.admin": "Admin",
  "settings.theme": "Theme", "settings.language": "Language", "settings.notifications": "Notification rules",
  "settings.light": "Light", "settings.dark": "Dark", "settings.system": "System",
  "pipeline.title": "Deal Pipeline", "pipeline.subtitle": "Drag deals between stages. AI surfaces stale and hot deals.",
  "pipeline.newDeal": "New deal", "pipeline.deals": "deals",
  "chat.placeholder": "Message the deal room…", "chat.send": "Send", "chat.online": "online",
  "checklist.title": "Due Diligence Checklist", "checklist.complete": "complete", "checklist.add": "Add item",
  "checklist.owner": "Owner", "checklist.due": "Due",
  "docs.upload": "Upload", "docs.dropHere": "Drop files here", "docs.dragOr": "Drag & drop or click to upload",
  "docs.maxSize": "Up to 50 MB · PDF, DOCX, XLSX, PNG",
  "reports.download": "Download report", "reports.csv": "CSV", "reports.pdf": "PDF",
  "reports.title": "Reports", "reports.subtitle": "Export pipeline, diligence, and activity for your partners.",
  "rules.title": "Notification rules", "rules.subtitle": "Pick what you get notified about and where.",
  "rules.channels": "Channels", "rules.events": "Events", "rules.email": "Email", "rules.inApp": "In-app", "rules.push": "Push",
  "common.save": "Save", "common.cancel": "Cancel", "common.add": "Add", "common.delete": "Delete",
};

const es: Dict = {
  "nav.product": "Producto", "nav.founders": "Fundadores", "nav.investors": "Inversores", "nav.pricing": "Precios",
  "nav.solutions": "Soluciones", "nav.signin": "Iniciar sesión", "nav.getStarted": "Comenzar",
  "app.search": "Buscar inversores, documentos, operaciones…",
  "app.overview": "Resumen", "app.leads": "Leads VC", "app.email": "Email IA", "app.profile": "Perfil",
  "app.documents": "Documentos", "app.dealRooms": "Salas de Trato", "app.messages": "Mensajes", "app.meetings": "Reuniones",
  "app.advisor": "Asesor IA", "app.pipeline": "Pipeline", "app.startups": "Startups", "app.diligence": "Due Diligence",
  "app.analysis": "Análisis IA", "app.decisions": "Decisiones", "app.users": "Equipo", "app.audit": "Auditoría",
  "app.notifications": "Notificaciones", "app.settings": "Ajustes", "app.workspace": "Espacio", "app.investorView": "Vista inversor",
  "app.founderView": "Vista fundador", "app.switchView": "Cambiar vista", "app.admin": "Admin",
  "settings.theme": "Tema", "settings.language": "Idioma", "settings.notifications": "Reglas de notificaciones",
  "settings.light": "Claro", "settings.dark": "Oscuro", "settings.system": "Sistema",
  "pipeline.title": "Pipeline de Tratos", "pipeline.subtitle": "Arrastra tratos entre etapas. La IA destaca los calientes.",
  "pipeline.newDeal": "Nuevo trato", "pipeline.deals": "tratos",
  "chat.placeholder": "Mensaje al deal room…", "chat.send": "Enviar", "chat.online": "en línea",
  "checklist.title": "Lista de Due Diligence", "checklist.complete": "completo", "checklist.add": "Agregar",
  "checklist.owner": "Responsable", "checklist.due": "Fecha",
  "docs.upload": "Subir", "docs.dropHere": "Suelta archivos", "docs.dragOr": "Arrastra o haz clic para subir",
  "docs.maxSize": "Hasta 50 MB · PDF, DOCX, XLSX, PNG",
  "reports.download": "Descargar reporte", "reports.csv": "CSV", "reports.pdf": "PDF",
  "reports.title": "Reportes", "reports.subtitle": "Exporta pipeline, diligencia y actividad.",
  "rules.title": "Reglas de notificación", "rules.subtitle": "Elige qué notificaciones recibir y dónde.",
  "rules.channels": "Canales", "rules.events": "Eventos", "rules.email": "Email", "rules.inApp": "En app", "rules.push": "Push",
  "common.save": "Guardar", "common.cancel": "Cancelar", "common.add": "Agregar", "common.delete": "Eliminar",
};

const fr: Dict = {
  "nav.product": "Produit", "nav.founders": "Fondateurs", "nav.investors": "Investisseurs", "nav.pricing": "Tarifs",
  "nav.solutions": "Solutions", "nav.signin": "Connexion", "nav.getStarted": "Commencer",
  "app.search": "Rechercher investisseurs, documents…",
  "app.overview": "Vue d'ensemble", "app.leads": "Leads VC", "app.email": "Email IA", "app.profile": "Profil",
  "app.documents": "Documents", "app.dealRooms": "Deal Rooms", "app.messages": "Messages", "app.meetings": "Réunions",
  "app.advisor": "Conseiller IA", "app.pipeline": "Pipeline", "app.startups": "Startups", "app.diligence": "Due Diligence",
  "app.analysis": "Analyse IA", "app.decisions": "Décisions", "app.users": "Équipe", "app.audit": "Journal",
  "app.notifications": "Notifications", "app.settings": "Paramètres", "app.workspace": "Espace", "app.investorView": "Vue investisseur",
  "app.founderView": "Vue fondateur", "app.switchView": "Changer", "app.admin": "Admin",
  "settings.theme": "Thème", "settings.language": "Langue", "settings.notifications": "Règles de notification",
  "settings.light": "Clair", "settings.dark": "Sombre", "settings.system": "Système",
  "pipeline.title": "Pipeline de Deals", "pipeline.subtitle": "Glissez les deals entre les étapes.",
  "pipeline.newDeal": "Nouveau deal", "pipeline.deals": "deals",
  "chat.placeholder": "Message au deal room…", "chat.send": "Envoyer", "chat.online": "en ligne",
  "checklist.title": "Liste Due Diligence", "checklist.complete": "complet", "checklist.add": "Ajouter",
  "checklist.owner": "Responsable", "checklist.due": "Échéance",
  "docs.upload": "Téléverser", "docs.dropHere": "Déposez ici", "docs.dragOr": "Glissez-déposez ou cliquez",
  "docs.maxSize": "Jusqu'à 50 Mo · PDF, DOCX, XLSX, PNG",
  "reports.download": "Télécharger", "reports.csv": "CSV", "reports.pdf": "PDF",
  "reports.title": "Rapports", "reports.subtitle": "Exportez pipeline, diligence et activité.",
  "rules.title": "Règles de notification", "rules.subtitle": "Choisissez ce que vous recevez.",
  "rules.channels": "Canaux", "rules.events": "Événements", "rules.email": "Email", "rules.inApp": "App", "rules.push": "Push",
  "common.save": "Enregistrer", "common.cancel": "Annuler", "common.add": "Ajouter", "common.delete": "Supprimer",
};

const de: Dict = {
  "nav.product": "Produkt", "nav.founders": "Gründer", "nav.investors": "Investoren", "nav.pricing": "Preise",
  "nav.solutions": "Lösungen", "nav.signin": "Anmelden", "nav.getStarted": "Loslegen",
  "app.search": "Investoren, Dokumente, Deals suchen…",
  "app.overview": "Übersicht", "app.leads": "VC Leads", "app.email": "KI Email", "app.profile": "Profil",
  "app.documents": "Dokumente", "app.dealRooms": "Deal Rooms", "app.messages": "Nachrichten", "app.meetings": "Meetings",
  "app.advisor": "KI Berater", "app.pipeline": "Pipeline", "app.startups": "Startups", "app.diligence": "Due Diligence",
  "app.analysis": "KI Analyse", "app.decisions": "Entscheidungen", "app.users": "Team", "app.audit": "Protokoll",
  "app.notifications": "Benachrichtigungen", "app.settings": "Einstellungen", "app.workspace": "Workspace", "app.investorView": "Investor-Ansicht",
  "app.founderView": "Gründer-Ansicht", "app.switchView": "Wechseln", "app.admin": "Admin",
  "settings.theme": "Design", "settings.language": "Sprache", "settings.notifications": "Benachrichtigungsregeln",
  "settings.light": "Hell", "settings.dark": "Dunkel", "settings.system": "System",
  "pipeline.title": "Deal-Pipeline", "pipeline.subtitle": "Deals zwischen Phasen ziehen.",
  "pipeline.newDeal": "Neuer Deal", "pipeline.deals": "Deals",
  "chat.placeholder": "Nachricht an Deal Room…", "chat.send": "Senden", "chat.online": "online",
  "checklist.title": "Due-Diligence-Checkliste", "checklist.complete": "fertig", "checklist.add": "Hinzufügen",
  "checklist.owner": "Verantwortlich", "checklist.due": "Fällig",
  "docs.upload": "Hochladen", "docs.dropHere": "Dateien ablegen", "docs.dragOr": "Drag & Drop oder klicken",
  "docs.maxSize": "Bis 50 MB · PDF, DOCX, XLSX, PNG",
  "reports.download": "Bericht laden", "reports.csv": "CSV", "reports.pdf": "PDF",
  "reports.title": "Berichte", "reports.subtitle": "Pipeline, Diligence und Aktivität exportieren.",
  "rules.title": "Benachrichtigungsregeln", "rules.subtitle": "Wählen Sie, was Sie erhalten.",
  "rules.channels": "Kanäle", "rules.events": "Ereignisse", "rules.email": "Email", "rules.inApp": "In-App", "rules.push": "Push",
  "common.save": "Speichern", "common.cancel": "Abbrechen", "common.add": "Hinzufügen", "common.delete": "Löschen",
};

const ar: Dict = {
  "nav.product": "المنتج", "nav.founders": "المؤسسون", "nav.investors": "المستثمرون", "nav.pricing": "الأسعار",
  "nav.solutions": "الحلول", "nav.signin": "تسجيل الدخول", "nav.getStarted": "ابدأ",
  "app.search": "ابحث عن مستثمرين، مستندات، صفقات…",
  "app.overview": "نظرة عامة", "app.leads": "عملاء محتملون", "app.email": "بريد بالذكاء", "app.profile": "الملف",
  "app.documents": "المستندات", "app.dealRooms": "غرف الصفقات", "app.messages": "الرسائل", "app.meetings": "الاجتماعات",
  "app.advisor": "مستشار AI", "app.pipeline": "خط الأنابيب", "app.startups": "الشركات", "app.diligence": "العناية الواجبة",
  "app.analysis": "تحليل AI", "app.decisions": "القرارات", "app.users": "الفريق", "app.audit": "السجل",
  "app.notifications": "الإشعارات", "app.settings": "الإعدادات", "app.workspace": "مساحة العمل", "app.investorView": "عرض المستثمر",
  "app.founderView": "عرض المؤسس", "app.switchView": "تبديل العرض", "app.admin": "إدارة",
  "settings.theme": "السمة", "settings.language": "اللغة", "settings.notifications": "قواعد الإشعارات",
  "settings.light": "فاتح", "settings.dark": "داكن", "settings.system": "النظام",
  "pipeline.title": "خط أنابيب الصفقات", "pipeline.subtitle": "اسحب الصفقات بين المراحل.",
  "pipeline.newDeal": "صفقة جديدة", "pipeline.deals": "صفقات",
  "chat.placeholder": "رسالة إلى غرفة الصفقة…", "chat.send": "إرسال", "chat.online": "متصل",
  "checklist.title": "قائمة العناية الواجبة", "checklist.complete": "مكتمل", "checklist.add": "إضافة",
  "checklist.owner": "المسؤول", "checklist.due": "تاريخ",
  "docs.upload": "رفع", "docs.dropHere": "أفلت الملفات هنا", "docs.dragOr": "اسحب وأفلت أو انقر",
  "docs.maxSize": "حتى 50 ميغا · PDF, DOCX, XLSX, PNG",
  "reports.download": "تحميل التقرير", "reports.csv": "CSV", "reports.pdf": "PDF",
  "reports.title": "التقارير", "reports.subtitle": "صدّر خط الأنابيب والعناية والنشاط.",
  "rules.title": "قواعد الإشعارات", "rules.subtitle": "اختر ما تتلقاه وأين.",
  "rules.channels": "القنوات", "rules.events": "الأحداث", "rules.email": "بريد", "rules.inApp": "داخل التطبيق", "rules.push": "Push",
  "common.save": "حفظ", "common.cancel": "إلغاء", "common.add": "إضافة", "common.delete": "حذف",
};

const dicts: Record<Lang, Dict> = { en, es, fr, de, ar };

const STORAGE_KEY = "vr.lang";

type Ctx = { lang: Lang; dir: "ltr" | "rtl"; setLang: (l: Lang) => void; t: (key: string) => string };
const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = (typeof window !== "undefined" && (localStorage.getItem(STORAGE_KEY) as Lang | null)) || "en";
    setLangState(stored);
  }, []);

  const dir = LANGUAGES.find((l) => l.code === lang)?.dir ?? "ltr";

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, lang);
  }, [lang, dir]);

  const t = useMemo(() => (key: string) => dicts[lang][key] ?? dicts.en[key] ?? key, [lang]);
  const ctx = useMemo(() => ({ lang, dir, setLang: setLangState, t }), [lang, dir, t]);

  return <I18nContext.Provider value={ctx}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
