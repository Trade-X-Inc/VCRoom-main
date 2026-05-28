import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "en" | "es" | "fr" | "de" | "ar" | "zh" | "ko" | "ja" | "ru";

export const LANGUAGES: { code: Lang; label: string; flag: string; dir: "ltr" | "rtl" }[] = [
  { code: "en", label: "English",  flag: "🇬🇧", dir: "ltr" },
  { code: "ar", label: "العربية", flag: "🇸🇦", dir: "rtl" },
  { code: "zh", label: "中文",     flag: "🇨🇳", dir: "ltr" },
  { code: "ko", label: "한국어",   flag: "🇰🇷", dir: "ltr" },
  { code: "ja", label: "日本語",   flag: "🇯🇵", dir: "ltr" },
  { code: "ru", label: "Русский", flag: "🇷🇺", dir: "ltr" },
  { code: "es", label: "Español", flag: "🇪🇸", dir: "ltr" },
  { code: "fr", label: "Français",flag: "🇫🇷", dir: "ltr" },
  { code: "de", label: "Deutsch", flag: "🇩🇪", dir: "ltr" },
];

type Dict = Record<string, string>;

const en: Dict = {
  // ── Landing ──────────────────────────────────────────────────────
  "landing.hero.headline":    "The deal room where trust gets built.",
  "landing.hero.subheadline": "Founders and investors waste months on back-and-forth emails, scattered documents, and zero visibility. Hockystick replaces all of it — one room, every deal, no chaos.",
  "landing.hero.cta.founder": "I'm raising capital",
  "landing.hero.cta.investor":"I invest in startups",
  "landing.hero.trust":       "No credit card · Free during beta · Setup in 2 minutes",
  "landing.pain.headline":    "Raising capital is broken. Everyone knows it. Nobody fixed it.",
  "landing.nav.talktoai":     "Talk to AI",
  "landing.nav.pricing":      "Pricing",
  "landing.chat.headline":    "Your next deal is one chat away.",
  "landing.chat.subheadline": "Our AI knows Hockystick inside out — features, pricing, how it works for your specific situation. Ask anything. Get real answers. No sales calls.",
  // ── Nav / App ────────────────────────────────────────────────────
  "nav.product": "Product", "nav.founders": "Founders", "nav.investors": "Investors", "nav.pricing": "Pricing",
  "nav.solutions": "Solutions", "nav.signin": "Sign in", "nav.getStarted": "Get started",
  "app.search": "Search investors, documents, deals…",
  "app.overview": "Overview", "app.leads": "VC Leads", "app.email": "AI Email", "app.profile": "Company Profile",
  "app.documents": "Documents", "app.dealRooms": "Deal Rooms", "app.messages": "Team Messages", "app.meetings": "Meetings",
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

const ar: Dict = {
  "landing.hero.headline":    "غرفة الصفقات حيث تُبنى الثقة.",
  "landing.hero.cta.founder": "أنا أجمع رأس المال",
  "landing.hero.cta.investor":"أنا أستثمر في الشركات الناشئة",
  "landing.hero.trust":       "بدون بطاقة ائتمان · مجاني خلال النسخة التجريبية · إعداد في دقيقتين",
  "landing.pain.headline":    "جمع رأس المال معطوب. الجميع يعرف ذلك. لا أحد أصلحه.",
  "landing.nav.talktoai":     "تحدث مع الذكاء الاصطناعي",
  "landing.nav.pricing":      "الأسعار",
  "landing.chat.headline":    "صفقتك القادمة على بُعد محادثة.",
  "nav.signin": "تسجيل الدخول", "nav.getStarted": "ابدأ الآن",
  "common.save": "حفظ", "common.cancel": "إلغاء", "common.add": "إضافة", "common.delete": "حذف",
};

const zh: Dict = {
  "landing.hero.headline":    "信任在这里建立的交易室。",
  "landing.hero.cta.founder": "我正在融资",
  "landing.hero.cta.investor":"我投资初创公司",
  "landing.hero.trust":       "无需信用卡 · Beta期间免费 · 2分钟设置",
  "landing.pain.headline":    "融资已经崩溃。每个人都知道。没人修复它。",
  "landing.nav.talktoai":     "与AI对话",
  "landing.nav.pricing":      "定价",
  "landing.chat.headline":    "你的下一笔交易只需一次对话。",
  "nav.signin": "登录", "nav.getStarted": "立即开始",
  "common.save": "保存", "common.cancel": "取消", "common.add": "添加", "common.delete": "删除",
};

const ko: Dict = {
  "landing.hero.headline":    "신뢰가 구축되는 딜룸.",
  "landing.hero.cta.founder": "저는 자금을 조달하고 있습니다",
  "landing.hero.cta.investor":"저는 스타트업에 투자합니다",
  "landing.hero.trust":       "신용카드 불필요 · 베타 기간 무료 · 2분 설정",
  "landing.pain.headline":    "자금 조달은 망가졌습니다. 모두가 알고 있습니다. 아무도 고치지 않았습니다.",
  "landing.nav.talktoai":     "AI와 대화",
  "landing.nav.pricing":      "가격",
  "landing.chat.headline":    "다음 거래는 대화 한 번이면 됩니다.",
  "nav.signin": "로그인", "nav.getStarted": "시작하기",
  "common.save": "저장", "common.cancel": "취소", "common.add": "추가", "common.delete": "삭제",
};

const ja: Dict = {
  "landing.hero.headline":    "信頼が築かれるディールルーム。",
  "landing.hero.cta.founder": "資金調達中です",
  "landing.hero.cta.investor":"スタートアップに投資しています",
  "landing.hero.trust":       "クレジットカード不要 · ベータ期間中無料 · 2分でセットアップ",
  "landing.pain.headline":    "資金調達は壊れています。誰もが知っています。誰も直しませんでした。",
  "landing.nav.talktoai":     "AIと話す",
  "landing.nav.pricing":      "料金",
  "landing.chat.headline":    "次の取引はチャット一つで。",
  "nav.signin": "サインイン", "nav.getStarted": "始める",
  "common.save": "保存", "common.cancel": "キャンセル", "common.add": "追加", "common.delete": "削除",
};

const ru: Dict = {
  "landing.hero.headline":    "Комната сделок, где строится доверие.",
  "landing.hero.cta.founder": "Я привлекаю капитал",
  "landing.hero.cta.investor":"Я инвестирую в стартапы",
  "landing.hero.trust":       "Без кредитной карты · Бесплатно в бета · Настройка за 2 минуты",
  "landing.pain.headline":    "Привлечение капитала сломано. Все знают об этом. Никто не исправил.",
  "landing.nav.talktoai":     "Поговорить с ИИ",
  "landing.nav.pricing":      "Цены",
  "landing.chat.headline":    "Ваша следующая сделка в одном чате.",
  "nav.signin": "Войти", "nav.getStarted": "Начать",
  "common.save": "Сохранить", "common.cancel": "Отмена", "common.add": "Добавить", "common.delete": "Удалить",
};

const es: Dict = {
  "landing.hero.headline":    "La sala de acuerdos donde se construye la confianza.",
  "landing.hero.cta.founder": "Estoy recaudando capital",
  "landing.hero.cta.investor":"Invierto en startups",
  "landing.hero.trust":       "Sin tarjeta de crédito · Gratis en beta · Configuración en 2 minutos",
  "landing.pain.headline":    "Recaudar capital está roto. Todos lo saben. Nadie lo arregló.",
  "landing.nav.talktoai":     "Hablar con IA",
  "landing.nav.pricing":      "Precios",
  "landing.chat.headline":    "Tu próximo acuerdo está a un chat de distancia.",
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
  "landing.hero.headline":    "La salle des deals où la confiance se construit.",
  "landing.hero.cta.founder": "Je lève des fonds",
  "landing.hero.cta.investor":"J'investis dans des startups",
  "landing.hero.trust":       "Sans carte de crédit · Gratuit en bêta · Configuration en 2 minutes",
  "landing.pain.headline":    "La levée de fonds est cassée. Tout le monde le sait. Personne ne l'a réparé.",
  "landing.nav.talktoai":     "Parler à l'IA",
  "landing.nav.pricing":      "Tarifs",
  "landing.chat.headline":    "Votre prochaine affaire est à une conversation.",
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

const dicts: Record<Lang, Dict> = { en, es, fr, de, ar, zh, ko, ja, ru };

const STORAGE_KEY = "vr.lang";

type Ctx = { lang: Lang; dir: "ltr" | "rtl"; setLang: (l: Lang) => void; t: (key: string) => string };
const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? (localStorage.getItem(STORAGE_KEY) as Lang | null) : null;
    const valid = stored && LANGUAGES.find((l) => l.code === stored);
    setLangState(valid ? (stored as Lang) : "en");
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
