import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  FileText, CheckCircle2, AlertCircle, Zap,
  ArrowRight, ChevronDown, Loader2, X, Upload, Trash2,
} from "lucide-react";
import { PageGuide } from "@/components/app/PageGuide";
import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { EmptyState, PageBreadcrumb } from "@/components/system";

const ALLOWED_EXTENSIONS = new Set(["pdf","pptx","ppt","xlsx","xls","docx","doc","csv","png","jpg","jpeg"]);
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export const Route = createFileRoute("/app/documents")({
  // R9: relocated to Prepare › IP Vault — old URL redirects to the default leaf.
  beforeLoad: () => {
    throw redirect({ to: "/app/prepare/ip-vault/document-intake", replace: true });
  },
});

const STAGE_OPTIONS = ["Pre-seed", "Seed", "Series A", "Series B"] as const;
type Stage = (typeof STAGE_OPTIONS)[number];

const STAGE_GUIDANCE: Record<Stage, string> = {
  "Pre-seed": "Focus on problem, solution, team, and use of funds",
  "Seed": "Add traction, market sizing, business model, and financials",
  "Series A": "Complete all financials, cap table, and customer references",
  "Series B": "Full DD pack required — all documents should be complete",
};

// DB stores lowercase; display capitalised
const TEMPLATE_CATEGORIES = ["All", "market", "financials", "team", "product", "legal"] as const;
const CATEGORY_LABELS: Record<string, string> = {
  All: "All", market: "Market", financials: "Financials",
  team: "Team", product: "Product", legal: "Legal",
};
// R11 step 2: fixed display order for category-organized lists (Document
// Intake, Digital Document Vault) — Market, Financials, Team, Product, Legal.
const CATEGORY_SORT_ORDER: Record<string, number> = {
  market: 0, financials: 1, team: 2, product: 3, legal: 4,
};

type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

interface DocumentTemplate {
  id: string;
  slug: string;
  name: string;
  category: string;
  is_required: boolean;
  stage_relevance: string[];
  ai_prompt?: string;
  sort_order: number;
}

interface AIFeedback {
  overall_score: number;
  signal: "strong" | "adequate" | "weak" | "critical";
  summary: string;
  strengths: string[];
  gaps: string[];
  recommendations: string[];
  investor_flag: string | null;
}

interface FounderDocument {
  id: string;
  startup_id: string;
  template_id: string;
  template_slug: string;
  title: string;
  content: Record<string, string>;
  completeness_score: number;
  status: "empty" | "draft" | "ai_extracted" | "complete" | "needs_review";
  file_path?: string;
  file_name?: string;
  file_size?: number;
  ai_feedback?: AIFeedback | null;
  visibility?: string | null;
  updated_at: string;
}

// ── Template field definitions ─────────────────────────────────────
const TEMPLATE_FIELDS: Record<string, Array<{
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "percentage";
  placeholder: string;
  required: boolean;
}>> = {
  "problem-solution": [
    { key: "problem", label: "What problem do you solve?", type: "textarea", placeholder: "Describe the specific pain your customers face. Be concrete — what breaks, costs money, or wastes time?", required: true },
    { key: "solution", label: "How do you solve it?", type: "textarea", placeholder: "Your solution mechanism — not features, but how it works fundamentally", required: true },
    { key: "why_us", label: "Why is this team uniquely positioned?", type: "textarea", placeholder: "Domain expertise, unfair advantage, founder-market fit...", required: true },
    { key: "why_now", label: "Why is now the right time?", type: "textarea", placeholder: "What market shift, technology change, or regulatory event makes this possible now?", required: true },
    { key: "customer_proof", label: "Customer validation", type: "textarea", placeholder: "Quotes, pilots, LOIs, early customers who confirmed the problem", required: false },
  ],
  "financial-model": [
    { key: "revenue_last_12m", label: "Revenue last 12 months (USD)", type: "number", placeholder: "0", required: true },
    { key: "revenue_year1", label: "Projected revenue Year 1 (USD)", type: "number", placeholder: "0", required: true },
    { key: "revenue_year2", label: "Projected revenue Year 2 (USD)", type: "number", placeholder: "0", required: false },
    { key: "revenue_year3", label: "Projected revenue Year 3 (USD)", type: "number", placeholder: "0", required: false },
    { key: "monthly_burn", label: "Monthly burn rate (USD)", type: "number", placeholder: "0", required: true },
    { key: "runway_months", label: "Current runway (months)", type: "number", placeholder: "0", required: true },
    { key: "cac", label: "Customer acquisition cost (USD)", type: "number", placeholder: "0", required: false },
    { key: "ltv", label: "Customer lifetime value (USD)", type: "number", placeholder: "0", required: false },
    { key: "gross_margin", label: "Gross margin (%)", type: "percentage", placeholder: "0", required: false },
    { key: "assumptions", label: "Key assumptions", type: "textarea", placeholder: "Describe the main assumptions behind your projections...", required: false },
  ],
  "cap-table": [
    { key: "founder_name", label: "Founder name", type: "text", placeholder: "Full name", required: true },
    { key: "founder_ownership", label: "Founder ownership (%)", type: "percentage", placeholder: "0", required: true },
    { key: "cofounder_name", label: "Co-founder name", type: "text", placeholder: "Full name (if applicable)", required: false },
    { key: "cofounder_ownership", label: "Co-founder ownership (%)", type: "percentage", placeholder: "0", required: false },
    { key: "investor_ownership", label: "Total investor ownership (%)", type: "percentage", placeholder: "0", required: false },
    { key: "option_pool", label: "Option pool (%)", type: "percentage", placeholder: "0", required: false },
    { key: "previous_rounds", label: "Previous rounds raised", type: "textarea", placeholder: "e.g. Pre-seed $500K from Angel investors in 2023", required: false },
    { key: "current_investors", label: "Current investor names", type: "textarea", placeholder: "List all current investors", required: false },
  ],
  "market-sizing": [
    { key: "tam_size", label: "Total addressable market (USD)", type: "number", placeholder: "0", required: true },
    { key: "tam_source", label: "TAM source / methodology", type: "text", placeholder: "e.g. Gartner 2024, bottom-up calculation", required: true },
    { key: "sam_size", label: "Serviceable addressable market (USD)", type: "number", placeholder: "0", required: true },
    { key: "target_customer", label: "Target customer profile", type: "textarea", placeholder: "Job title, company size, industry...", required: true },
    { key: "geography", label: "Target geography", type: "text", placeholder: "e.g. GCC, MENA, Global", required: true },
    { key: "market_timing", label: "Why is now the right time?", type: "textarea", placeholder: "What market shift makes this the right moment...", required: false },
  ],
  "traction-summary": [
    { key: "arr_mrr", label: "ARR or MRR (USD)", type: "number", placeholder: "0", required: false },
    { key: "growth_rate", label: "Growth rate", type: "text", placeholder: "e.g. +34% MoM", required: false },
    { key: "customer_count", label: "Paying customers", type: "number", placeholder: "0", required: false },
    { key: "key_metric", label: "Key traction metric", type: "text", placeholder: "The one number that proves traction", required: true },
    { key: "traction_narrative", label: "Traction story", type: "textarea", placeholder: "What happened, when, what it means...", required: true },
    { key: "notable_customers", label: "Notable customers / logos", type: "text", placeholder: "e.g. Aramco, ADNOC (anonymise if needed)", required: false },
  ],
  "team-bios": [
    { key: "founder_name", label: "Founder full name", type: "text", placeholder: "", required: true },
    { key: "founder_role", label: "Founder role", type: "text", placeholder: "CEO / CTO / Founder", required: true },
    { key: "founder_background", label: "Founder background", type: "textarea", placeholder: "Previous companies, education, domain expertise...", required: true },
    { key: "founder_linkedin", label: "Founder LinkedIn URL", type: "text", placeholder: "https://linkedin.com/in/...", required: false },
    { key: "cofounder_name", label: "Co-founder full name", type: "text", placeholder: "Leave blank if none", required: false },
    { key: "cofounder_role", label: "Co-founder role", type: "text", placeholder: "", required: false },
    { key: "cofounder_background", label: "Co-founder background", type: "textarea", placeholder: "", required: false },
    { key: "key_hires", label: "Key hires", type: "textarea", placeholder: "Name, role, why they matter...", required: false },
    { key: "advisors", label: "Advisors", type: "textarea", placeholder: "Name, domain, why they matter...", required: false },
  ],
  "business-model": [
    { key: "revenue_model", label: "Revenue model", type: "text", placeholder: "SaaS / transactional / marketplace / services", required: true },
    { key: "pricing", label: "Pricing structure", type: "textarea", placeholder: "How you charge, tiers, per-unit...", required: true },
    { key: "cac", label: "Customer acquisition cost", type: "text", placeholder: "e.g. $200 per customer", required: false },
    { key: "ltv", label: "Customer lifetime value", type: "text", placeholder: "e.g. $2,400 over 24 months", required: false },
    { key: "payback_period", label: "Payback period", type: "text", placeholder: "e.g. 8 months", required: false },
    { key: "burn_rate", label: "Monthly burn rate", type: "text", placeholder: "e.g. $45,000/month", required: true },
    { key: "runway", label: "Runway", type: "text", placeholder: "e.g. 18 months", required: true },
  ],
  "competitive-landscape": [
    { key: "main_competitors", label: "Main competitors", type: "textarea", placeholder: "List named competitors investors will ask about", required: true },
    { key: "differentiation", label: "Key differentiation", type: "textarea", placeholder: "What you have that they do not — be specific", required: true },
    { key: "moat", label: "Defensible moat", type: "textarea", placeholder: "Network effect / IP / switching cost / brand...", required: true },
    { key: "competitive_matrix", label: "Competitive positioning", type: "textarea", placeholder: "How you compare on key dimensions...", required: false },
  ],
  "use-of-funds": [
    { key: "product_engineering", label: "Product & Engineering (%)", type: "percentage", placeholder: "0", required: true },
    { key: "team_expansion", label: "Team expansion (%)", type: "percentage", placeholder: "0", required: true },
    { key: "sales_marketing", label: "Sales & Marketing (%)", type: "percentage", placeholder: "0", required: true },
    { key: "operations", label: "Operations (%)", type: "percentage", placeholder: "0", required: true },
    { key: "milestones_18m", label: "18-month milestones", type: "textarea", placeholder: "What this round gets you to...", required: true },
    { key: "next_round", label: "Target for next round", type: "text", placeholder: "e.g. Series A at $20M on $5M ARR", required: false },
  ],
  "product-roadmap": [
    { key: "current_state", label: "Current product state", type: "textarea", placeholder: "What exists today — MVP, beta, GA...", required: true },
    { key: "q1_milestones", label: "Next 90 days", type: "textarea", placeholder: "Specific deliverables and launch targets", required: true },
    { key: "q2_q3_milestones", label: "Q2–Q3 milestones", type: "textarea", placeholder: "Key features, market expansion, or revenue targets", required: false },
    { key: "q4_milestones", label: "End of year goals", type: "textarea", placeholder: "What does success look like at 12 months?", required: false },
    { key: "tech_stack", label: "Core technology", type: "text", placeholder: "Key technologies powering the product", required: false },
    { key: "ip_moat", label: "IP / proprietary elements", type: "textarea", placeholder: "Patents filed, proprietary algorithms, unique data...", required: false },
  ],
  "tech-stack-overview": [
    { key: "architecture", label: "System architecture", type: "textarea", placeholder: "How the system is structured — frontend, backend, infrastructure", required: true },
    { key: "tech_stack", label: "Technology stack", type: "text", placeholder: "e.g. React, Node.js, AWS, PostgreSQL", required: true },
    { key: "scalability", label: "Scalability approach", type: "textarea", placeholder: "How does it scale? What are the current limits?", required: false },
    { key: "ip_patents", label: "IP and patents", type: "textarea", placeholder: "Filed or granted patents, proprietary algorithms, trade secrets", required: false },
    { key: "security", label: "Security measures", type: "textarea", placeholder: "Data protection, compliance (SOC2, GDPR, etc.)", required: false },
  ],
  "customer-references": [
    { key: "top_customers", label: "Top customers by revenue", type: "textarea", placeholder: "Company name (anonymise if needed), industry, contract value", required: true },
    { key: "reference_contacts", label: "Reference contacts", type: "textarea", placeholder: "2-3 customers willing to speak to investors. Name + email.", required: false },
    { key: "churn_rate", label: "Monthly churn rate", type: "text", placeholder: "e.g. 2.3% monthly", required: false },
    { key: "nps_score", label: "NPS or satisfaction score", type: "text", placeholder: "e.g. NPS 67", required: false },
    { key: "notable_logos", label: "Notable logos / names", type: "text", placeholder: "Recognisable customers you can name publicly", required: false },
  ],
  "incorporation-docs": [
    { key: "company_legal_name", label: "Legal company name", type: "text", placeholder: "Full registered legal name", required: true },
    { key: "incorporation_date", label: "Incorporation date", type: "text", placeholder: "DD/MM/YYYY", required: true },
    { key: "jurisdiction", label: "Jurisdiction", type: "text", placeholder: "e.g. DIFC, Cayman Islands, Delaware", required: true },
    { key: "company_number", label: "Company registration number", type: "text", placeholder: "", required: true },
    { key: "registered_address", label: "Registered address", type: "text", placeholder: "", required: false },
    { key: "upload_note", label: "Document upload", type: "textarea", placeholder: "Describe the document or note its location. Upload option coming soon.", required: false },
  ],
  "shareholder-agreements": [
    { key: "sha_date", label: "SHA date", type: "text", placeholder: "Date of most recent shareholder agreement", required: false },
    { key: "key_terms", label: "Key terms summary", type: "textarea", placeholder: "Pro-rata rights, drag-along, tag-along, board composition...", required: false },
    { key: "prior_term_sheets", label: "Prior term sheets", type: "textarea", placeholder: "Summary of any previous term sheets or convertible notes", required: false },
    { key: "upload_note", label: "Document upload", type: "textarea", placeholder: "Note the document location. Upload option coming soon.", required: false },
  ],
  "bank-statements": [
    { key: "bank_name", label: "Bank name", type: "text", placeholder: "Primary operating bank", required: true },
    { key: "current_balance", label: "Current cash balance (USD)", type: "number", placeholder: "0", required: true },
    { key: "monthly_burn", label: "Monthly burn rate (USD)", type: "number", placeholder: "0", required: true },
    { key: "runway_months", label: "Runway (months)", type: "number", placeholder: "0", required: true },
    { key: "upload_note", label: "Statement upload", type: "textarea", placeholder: "Upload of actual statements required for deal room. Note period covered here.", required: false },
  ],
  "esop": [
    { key: "option_pool_size", label: "Option pool size (%)", type: "percentage", placeholder: "e.g. 10", required: true },
    { key: "total_shares_reserved", label: "Total shares reserved for ESOP", type: "number", placeholder: "0", required: false },
    { key: "vesting_schedule", label: "Vesting schedule", type: "text", placeholder: "e.g. 4 years with 1 year cliff", required: true },
    { key: "cliff_period", label: "Cliff period", type: "text", placeholder: "e.g. 12 months", required: false },
    { key: "jurisdiction", label: "ESOP jurisdiction", type: "text", placeholder: "e.g. DIFC, Cayman Islands, Delaware", required: false },
    { key: "key_grants", label: "Key employee grants", type: "textarea", placeholder: "List key grants: role, shares/%, vesting status...", required: false },
    { key: "remaining_pool", label: "Remaining unallocated pool (%)", type: "percentage", placeholder: "e.g. 6.5", required: false },
    { key: "notes", label: "Additional notes", type: "textarea", placeholder: "Any special terms, accelerated vesting triggers, good/bad leaver provisions...", required: false },
  ],
};

function formatFileSize(bytes?: number): string {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getStatusBorderColor(status?: string) {
  switch (status) {
    case "draft": return "border-l-amber-500/60";
    case "ai_extracted": return "border-l-blue-500/60";
    case "complete": return "border-l-green-500/60";
    default: return "border-l-white/10";
  }
}

function getStatusIcon(status: string): { Icon: any; color: string; label: string } {
  switch (status) {
    case "empty":
      return { Icon: () => <div className="w-5 h-5 rounded-full border-2 border-border shrink-0" />, color: "text-faint", label: "Not started" };
    case "draft":
      return { Icon: AlertCircle, color: "text-amber-400", label: "In progress" };
    case "ai_extracted":
      return { Icon: Zap, color: "text-blue-400", label: "AI extracted — needs review" };
    case "complete":
      return { Icon: CheckCircle2, color: "text-green-400", label: "Complete" };
    case "needs_review":
      return { Icon: AlertCircle, color: "text-amber-400", label: "Needs attention" };
    default:
      return { Icon: FileText, color: "text-muted-foreground", label: status };
  }
}

// Stage access tiers for display badges
const STAGE2_SLUGS = new Set(["competitive-landscape", "product-roadmap", "tech-stack-overview", "traction-summary"]);
const STAGE3_SLUGS = new Set(["financial-model", "cap-table", "incorporation-docs", "shareholder-agreements", "bank-statements", "customer-references"]);


export type DocumentsView = "document-intake" | "source-files" | "digital-document-vault" | "privacy-settings";

// R9: `view` renders one IP Vault leaf's slice of this workspace under route
// control. Source Files = physical uploads (file_path set); Digital Document
// Vault = Hockystick-processed documents (structured content) — deliberately
// distinct concepts, never merged (R9 step 6).
export function Documents({ view }: { view?: DocumentsView } = {}) {
  const { user } = useAuth();
  const [selectedStage, setSelectedStage] = useState<Stage>("Seed");
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory>("All");
  const [editingDoc, setEditingDoc] = useState<FounderDocument | null>(null);
  const [showInstructions, setShowInstructions] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [showCustomUpload, setShowCustomUpload] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [customUploading, setCustomUploading] = useState(false);
  const [customCategory, setCustomCategory] = useState<Exclude<TemplateCategory, "All"> | null>(null);
  const [customExtractError, setCustomExtractError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch startup
  const { data: startup } = useQuery({
    queryKey: ["startup", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("startups")
        .select("id, company_name, stage")
        .eq("founder_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  // Fetch templates
  const { data: templates = [] } = useQuery({
    queryKey: ["document-templates"],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("document_templates")
        .select("*")
        .order("sort_order");
      return (data ?? []) as DocumentTemplate[];
    },
  });

  // Fetch founder documents
  const { data: founderDocs = [], refetch: refetchFounderDocs } = useQuery({
    queryKey: ["founder-documents", startup?.id],
    enabled: !!startup?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("founder_documents")
        .select("*")
        .eq("startup_id", startup!.id);
      return (data ?? []) as FounderDocument[];
    },
  });

  // Merge templates with founder documents. R11 fix: custom documents
  // (template_id === null) have no matching row in `templates` — without a
  // synthetic template entry here, they never rendered anywhere in the IP
  // Vault (Intake, Source Files, Digital Document Vault, Privacy Settings
  // all iterate this list). Each custom doc gets a one-off virtual template
  // built from its own stored category/title.
  const documentsWithStatus = useMemo(() => {
    const templateCards = templates.map(template => ({
      ...template,
      founderDoc: founderDocs.find(d => d.template_slug === template.slug) ?? null,
    }));
    const customDocs = founderDocs.filter(d => !d.template_id);
    const customCards = customDocs.map(doc => ({
      id: doc.id,
      slug: doc.template_slug,
      name: doc.title,
      category: (doc.content as any)?.category ?? "product",
      is_required: false,
      stage_relevance: STAGE_OPTIONS.map(s => s.toLowerCase().replace(/\s+/g, "-")),
      sort_order: 9999,
      founderDoc: doc,
    }));
    return [...templateCards, ...customCards];
  }, [templates, founderDocs]);

  // Normalise stage to DB format: "Series A" → "series-a"
  const stageKey = selectedStage.toLowerCase().replace(/\s+/g, "-");

  // Filter by stage and category
  const filteredDocs = useMemo(() => {
    let filtered = documentsWithStatus;
    filtered = filtered.filter(t => t.stage_relevance.includes(stageKey as any));
    if (selectedCategory !== "All") {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }
    // R9 leaf slices over the same template cards:
    if (view === "document-intake") {
      // still to add — no doc yet, only an empty/draft shell, or extraction
      // failed and needs attention (R11: a failed custom-doc extraction has
      // a real file but no usable content — it stays actionable in Intake).
      filtered = filtered.filter(t =>
        !t.founderDoc ||
        ["empty", "draft"].includes(t.founderDoc.status) ||
        (t.founderDoc.status === "needs_review" && !!(t.founderDoc.content as any)?.extraction_error),
      );
    } else if (view === "source-files") {
      // physical uploads only
      filtered = filtered.filter(t => !!t.founderDoc?.file_path);
    } else if (view === "digital-document-vault") {
      // Hockystick-processed documents — genuinely extracted structured
      // content only. A stored extraction_error means nothing was actually
      // extracted, so it's excluded here even though status is non-empty.
      filtered = filtered.filter(t =>
        !!t.founderDoc &&
        !(t.founderDoc.content as any)?.extraction_error &&
        (Object.keys(t.founderDoc.content ?? {}).length > 0 ||
          ["ai_extracted", "complete", "needs_review"].includes(t.founderDoc.status)),
      );
    } else if (view === "privacy-settings") {
      // every managed document, for its visibility control
      filtered = filtered.filter(t => !!t.founderDoc);
    }
    // R11 step 2: sort into the fixed 5-category order so the list reads as
    // organized sections (Market, Financials, Team, Product, Legal) rather
    // than an unsorted flat list — applies whenever "All" categories show.
    const categoryOrder = CATEGORY_SORT_ORDER;
    return [...filtered].sort((a, b) => (categoryOrder[a.category] ?? 99) - (categoryOrder[b.category] ?? 99));
  }, [documentsWithStatus, stageKey, selectedCategory, view]);

  async function handleFileUpload(templateSlug: string, templateName: string, templateId: string, file: File) {
    if (!startup?.id) return;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTENSIONS.has(ext)) { toast.error(`${file.name}: file type not allowed`); return; }
    if (file.size > MAX_FILE_SIZE) { toast.error(`${file.name}: exceeds 50 MB limit`); return; }
    setUploading(templateSlug);
    try {
      const filePath = `founder-docs/${startup.id}/${templateSlug}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { error: upsertError } = await supabase.from("founder_documents").upsert({
        startup_id: startup.id,
        template_id: templateId,
        template_slug: templateSlug,
        title: templateName,
        status: "complete",
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        content: {},
        completeness_score: 100,
        updated_at: new Date().toISOString(),
      }, { onConflict: "startup_id,template_slug" });
      if (upsertError) throw upsertError;
      toast.success(`${templateName} uploaded`);
      // Badge evaluation — fire-and-forget on this write event
      import("@/lib/badge-award-engine").then((m) => m.evaluateAndAwardBadges({ data: { startup_id: startup?.id } })).catch(() => {});
      // Readiness checklist refresh — new documents change the gap analysis
      if (startup?.id) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session) return;
          import("@/lib/profile-checklist-fn").then(({ generateFounderChecklist }) =>
            generateFounderChecklist({ data: { userAccessToken: session.access_token, startupId: startup.id } })
          ).catch((e) => console.error("[checklist] background run failed:", e));
        });
      }
      refetchFounderDocs();
      const { logActivity } = await import("@/lib/activity-log-fn");
      logActivity({
        account_type: "founder",
        account_id: startup.id,
        actor_user_id: user!.id,
        actor_name: user!.fullName || user!.email || "Founder",
        action_type: "document_uploaded",
        target_label: templateName,
        detail: `Uploaded ${file.name}`,
      });
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  // R11 step 1: Custom Document — upload any file (not tied to a pre-built
  // template), extract structured data via extractCustomDocument() (the
  // same JSON-schema extraction pattern profile builder uses — replaces
  // the prose-only generateDocSummary(), which produced no structured
  // fields and used a category enum that never matched this app's 5
  // categories). Extraction failure is stored honestly, never silently as
  // if it were content — the row always saves (so the file isn't lost),
  // but its status reflects what actually happened.
  async function handleCustomDocumentUpload() {
    if (!startup?.id || !user?.id || !customFile || !customTitle.trim() || !customCategory) return;
    const file = customFile;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTENSIONS.has(ext)) { toast.error(`${file.name}: file type not allowed`); return; }
    if (file.size > MAX_FILE_SIZE) { toast.error(`${file.name}: exceeds 50 MB limit`); return; }
    setCustomUploading(true);
    setCustomExtractError(null);
    try {
      const slug = `custom-${customTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now()}`;
      const filePath = `founder-docs/${startup.id}/${slug}/${file.name}`;
      const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { extractDocumentText } = await import("@/lib/document-extractor");
      const text = await extractDocumentText(file, file.name);
      const { extractCustomDocument } = await import("@/lib/profile-builder-fn");
      const result = await extractCustomDocument({
        data: { userId: user.id, documentText: text, fileName: file.name },
      }).catch((e: any): Awaited<ReturnType<typeof extractCustomDocument>> => ({
        data: null, missing_fields: [], error: e?.message || "Extraction failed",
      }));

      const extractionSucceeded = !result.error && !!result.data;
      const category = result.data?.suggested_category ?? customCategory;

      const { error: upsertError } = await supabase.from("founder_documents").upsert({
        startup_id: startup.id,
        template_id: null,
        template_slug: slug,
        title: customTitle.trim(),
        status: extractionSucceeded ? "ai_extracted" : "needs_review",
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        content: extractionSucceeded
          ? { ...result.data, category }
          : { category, extraction_error: result.error || "Could not extract structured data from this document." },
        completeness_score: extractionSucceeded ? 100 : 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: "startup_id,template_slug" });
      if (upsertError) throw upsertError;

      if (extractionSucceeded) {
        toast.success(`${customTitle.trim()} uploaded and extracted`);
      } else {
        setCustomExtractError(result.error || "Could not extract structured data.");
        toast.error("Uploaded, but extraction failed — stored in Source Files. You can retry or fill manually.");
      }

      import("@/lib/badge-award-engine").then((m) => m.evaluateAndAwardBadges({ data: { startup_id: startup?.id } })).catch(() => {});
      // R11 step 4: invalidate every view of founder_documents — Intake,
      // Source Files, Digital Document Vault, and Privacy Settings are
      // separate route mounts of this same component, each with its own
      // query observer; a plain refetch() only updates the currently
      // mounted one.
      queryClient.invalidateQueries({ queryKey: ["founder-documents", startup.id] });
      const { logActivity } = await import("@/lib/activity-log-fn");
      logActivity({
        account_type: "founder",
        account_id: startup.id,
        actor_user_id: user.id,
        actor_name: user.fullName || user.email || "Founder",
        action_type: "document_uploaded",
        target_label: customTitle.trim(),
        detail: `Uploaded ${file.name}`,
      });
      if (extractionSucceeded) {
        setShowCustomUpload(false);
        setCustomTitle("");
        setCustomFile(null);
        setCustomCategory(null);
      }
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setCustomUploading(false);
    }
  }

  // R11 step 1: retry extraction for a custom doc whose first attempt
  // failed — re-downloads the already-stored original, no re-upload needed.
  const [retryingDocId, setRetryingDocId] = useState<string | null>(null);
  async function handleRetryExtraction(doc: FounderDocument) {
    if (!doc.file_path || !user?.id) return;
    setRetryingDocId(doc.id);
    try {
      const { data: blob, error: downloadError } = await supabase.storage.from("documents").download(doc.file_path);
      if (downloadError || !blob) throw downloadError || new Error("Could not read stored file.");
      const file = new File([blob], doc.file_name || "document", { type: blob.type });

      const { extractDocumentText } = await import("@/lib/document-extractor");
      const text = await extractDocumentText(file, file.name);
      const { extractCustomDocument } = await import("@/lib/profile-builder-fn");
      const result = await extractCustomDocument({
        data: { userId: user.id, documentText: text, fileName: file.name },
      }).catch((e: any): Awaited<ReturnType<typeof extractCustomDocument>> => ({
        data: null, missing_fields: [], error: e?.message || "Extraction failed",
      }));

      const extractionSucceeded = !result.error && !!result.data;
      const priorCategory = (doc.content as any)?.category ?? "product";
      const category = result.data?.suggested_category ?? priorCategory;

      const { error: updateError } = await supabase.from("founder_documents").update({
        status: extractionSucceeded ? "ai_extracted" : "needs_review",
        content: extractionSucceeded
          ? { ...result.data, category }
          : { category, extraction_error: result.error || "Could not extract structured data from this document." },
        completeness_score: extractionSucceeded ? 100 : 0,
        updated_at: new Date().toISOString(),
      }).eq("id", doc.id);
      if (updateError) throw updateError;

      if (extractionSucceeded) toast.success("Extraction succeeded");
      else toast.error("Extraction failed again — try filling manually.");
      if (startup?.id) queryClient.invalidateQueries({ queryKey: ["founder-documents", startup.id] });
    } catch (e: any) {
      toast.error(e.message || "Retry failed");
    } finally {
      setRetryingDocId(null);
    }
  }

  // R11 step 3: delete a Source File original. Extracted data lives in the
  // same row's `content` field (the Digital Document Vault reads from it) —
  // deleting the file only clears the physical original and its Storage
  // object, keeping the row (and the vault entry) if extraction already
  // succeeded. If nothing was ever extracted, there's nothing left to keep,
  // so the whole row is removed.
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  async function handleDeleteSourceFile(doc: FounderDocument) {
    if (!doc.file_path) return;
    if (!confirm(`Delete "${doc.file_name}"? This removes the original file only.`)) return;
    setDeletingDocId(doc.id);
    try {
      const { error: storageError } = await supabase.storage.from("documents").remove([doc.file_path]);
      if (storageError) throw storageError;

      const extractionError = (doc.content as any)?.extraction_error;
      const hasExtractedContent = !extractionError && Object.keys(doc.content ?? {}).length > 0;

      if (hasExtractedContent) {
        // Extracted content already lives in this row — keep it (the
        // Digital Document Vault entry survives), just clear the file
        // reference so Source Files no longer lists an original.
        const { error } = await supabase.from("founder_documents").update({
          file_path: null, file_name: null, file_size: null, updated_at: new Date().toISOString(),
        }).eq("id", doc.id);
        if (error) throw error;
      } else {
        // Nothing extracted — nothing left to keep.
        const { error } = await supabase.from("founder_documents").delete().eq("id", doc.id);
        if (error) throw error;
      }

      toast.success("File deleted");
      if (startup?.id) queryClient.invalidateQueries({ queryKey: ["founder-documents", startup.id] });
    } catch (e: any) {
      toast.error(e.message || "Could not delete file");
    } finally {
      setDeletingDocId(null);
    }
  }

  if (user?.role === "investor") {
    return (
      <div className="p-6 lg:p-8 max-w-2xl mx-auto text-center py-20">
        <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
        <h2 className="text-lg font-semibold mb-2">Documents are for founders</h2>
        <p className="text-sm text-muted-foreground">This section is only available to startup founders.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
    <div className="flex-1 overflow-y-auto p-6 lg:p-8">
      {/* Header */}
      <PageBreadcrumb items={[{ label: "Your raise", to: "/app/prepare" }, { label: "Documents" }]} />
      <div className="flex items-start justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1" style={{ fontFamily: "Syne, sans-serif" }}>
            {view === "document-intake" ? "Document Intake"
              : view === "source-files" ? "Source Files"
              : view === "digital-document-vault" ? "Digital Document Vault"
              : view === "privacy-settings" ? "Document Privacy Settings"
              : "Documents"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {view === "document-intake" ? "Add the documents investors expect for your stage."
              : view === "source-files" ? "The original files you uploaded."
              : view === "digital-document-vault" ? "Your Hockystick-processed documents."
              : view === "privacy-settings" ? "Control which documents each stage can see."
              : "Your document workspace — guided by AI"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PageGuide pageId="documents" />
          <span className="text-sm text-muted-foreground">Stage:</span>
          <div className="relative inline-flex">
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value as Stage)}
              className="appearance-none bg-card border border-border/60 rounded-md px-3 py-1.5 text-sm pr-8 focus:outline-none focus:border-brand/50 cursor-pointer"
            >
              {STAGE_OPTIONS.map(stage => (
                <option key={stage} value={stage}>{stage}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>

      {/* R11 step 3: permanent explainer — Source Files' role in the
          lifecycle, stated plainly so founders never wonder why this page
          exists once documents are extracted. */}
      {view === "source-files" && (
        <div className="mb-6 rounded-none border border-border bg-[#FAFAFA] px-5 py-4">
          <p className="text-sm" style={{ color: "#52525B" }}>
            Original files you uploaded. Once information is extracted into your Digital Document Vault,
            these originals serve one purpose. Attachment into a deal room if an investor requests the
            physical document. They are never public. You may delete them after extraction.
          </p>
        </div>
      )}

      {/* R10 step 3: ProfileBuilder (Digital Profile summary) removed from
          Document Intake — redundant now that the cover/profile UI lives
          only on Go Live > Full Digital Profile View (R10 step 1). Source
          Files, Digital Document Vault, and Document Privacy Settings each
          get their own distinct content per R10 steps 4-6. */}

      {/* R10 steps 4-6: Source Files, Digital Document Vault, and Document
          Privacy Settings each get dedicated content below instead of the
          shared template-card grid — that grid (fill/upload flow, stage
          guidance, categories) stays specific to Document Intake. */}
      {(!view || view === "document-intake") && (
      <>
      {/* How it works — collapsible */}
      <div className="mb-6 border border-border rounded-none p-5 bg-white/[0.02]">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setShowInstructions(prev => !prev)}
        >
          <div className="flex items-center gap-2">
            <span className="text-brand">✦</span>
            <span className="text-sm font-medium text-foreground">How your document workspace works</span>
          </div>
          <span className="text-muted-foreground text-xs">{showInstructions ? "Hide" : "Show"}</span>
        </div>
        {showInstructions && (
          <div className="mt-4 grid sm:grid-cols-3 gap-4">
            {[
              { n: "01", title: "Fill or upload", body: "Fill each document using our structured template, or upload your existing file. AI extracts the key information automatically." },
              { n: "02", title: "AI reviews for gaps", body: "Our AI checks each document against what investors actually ask for your stage. It flags weak areas and tells you what to improve." },
              { n: "03", title: "Investors see what matters", body: "Stage 2 documents unlock when an investor connects. Stage 3 (financials, cap table, legal) unlock only inside a deal room. You control all access." },
            ].map(({ n, title, body }) => (
              <div key={n} className="bg-accent rounded-lg p-4">
                <div className="text-brand text-lg font-semibold mb-2">{n}</div>
                <div className="text-sm font-medium text-foreground mb-1">{title}</div>
                <div className="text-xs text-muted-foreground leading-relaxed">{body}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stage guidance */}
      <div className="mb-6 p-4 rounded-lg border border-brand/20 bg-accent">
        <p className="text-brand text-xs font-semibold uppercase tracking-wider mb-1">Stage guidance — {selectedStage}</p>
        <p className="text-brand/80 text-sm mt-1">{STAGE_GUIDANCE[selectedStage]}</p>
      </div>

      {/* Main content: sidebar + documents */}
      <div className="flex flex-col sm:grid sm:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* Categories — horizontal scrollable chips on mobile, vertical rail from sm: up */}
        <div className="w-full sm:col-span-3">
          <div className="flex sm:flex-col gap-2 sm:gap-1 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0 -mx-1 px-1 sm:mx-0 sm:px-0">
            {TEMPLATE_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "shrink-0 whitespace-nowrap text-left px-4 py-2 rounded-full sm:rounded-lg text-sm font-medium transition-colors",
                  selectedCategory === cat
                    ? "hs-gradient text-white"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground bg-accent/40 sm:bg-transparent"
                )}
              >
                {CATEGORY_LABELS[cat] ?? cat}
              </button>
            ))}
          </div>
        </div>

        {/* Documents list */}
        <div className="w-full sm:col-span-9">
          <div className="space-y-3">
            {/* R10 step 3: Custom Document — upload anything, alongside the
                pre-built templates. Only on Document Intake. */}
            {(!view || view === "document-intake") && (
              <button
                onClick={() => { setCustomExtractError(null); setShowCustomUpload(true); }}
                className="w-full rounded-none border border-dashed border-border bg-card p-5 text-left hover:border-brand/50 hover:bg-accent/20 transition-colors flex items-center gap-3"
              >
                <div className="grid h-9 w-9 place-items-center rounded-none bg-accent shrink-0">
                  <Upload className="h-4 w-4 text-brand" />
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">Add a custom document</div>
                  <div className="text-xs text-muted-foreground">Upload any file not covered by a template — AI extracts structured data automatically.</div>
                </div>
              </button>
            )}
            {filteredDocs.length === 0 ? (
              <EmptyState kind="empty" title="No documents" />
            ) : (
              filteredDocs.map((template, i) => {
                const showCategoryHeader = selectedCategory === "All" && (i === 0 || filteredDocs[i - 1].category !== template.category);
                const doc = template.founderDoc;
                const status = doc?.status ?? "empty";
                const { Icon: StatusIcon, color: statusColor } = getStatusIcon(status);
                const buttonAction = !doc || status === "empty" ? "Start"
                  : status === "ai_extracted" ? "Review"
                  : status === "draft" ? "Continue"
                  : "Edit";
                const isUploading = uploading === template.slug;
                const isStage2 = STAGE2_SLUGS.has(template.slug);
                const isStage3 = STAGE3_SLUGS.has(template.slug);
                const hasFeedback = !!(doc?.ai_feedback && typeof doc.ai_feedback === "object" && Object.keys(doc.ai_feedback).length > 0);
                const feedbackScore = hasFeedback ? (doc!.ai_feedback as AIFeedback).overall_score : undefined;
                const feedbackSignal = hasFeedback ? (doc!.ai_feedback as AIFeedback).signal : undefined;
                const extractionError = (doc?.content as any)?.extraction_error as string | undefined;

                return (
                  <div key={template.id}>
                  {showCategoryHeader && (
                    <div className={cn("text-xs font-semibold uppercase tracking-wider text-muted-foreground", i === 0 ? "mb-2" : "mt-5 mb-2")}>
                      {CATEGORY_LABELS[template.category] ?? template.category}
                    </div>
                  )}
                  <div
                    className={cn(
                      "rounded-none border border-border/60 bg-card p-5 hover:border-border transition-all border-l-2",
                      getStatusBorderColor(status)
                    )}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <StatusIcon className={cn("h-4 w-4 shrink-0", statusColor)} />
                          <h3 className="text-sm font-semibold text-foreground">{template.name}</h3>
                          {hasFeedback && feedbackScore !== undefined && (
                            <span className={cn(
                              "text-xs font-bold px-2 py-0.5 rounded-full",
                              feedbackSignal === "strong" ? "bg-green-500/15 text-green-400"
                              : feedbackSignal === "adequate" ? "bg-amber-500/15 text-amber-400"
                              : "bg-red-500/15 text-red-400"
                            )}>
                              {feedbackScore}/10
                            </span>
                          )}
                          {template.is_required ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/15 text-red-400">
                              Required
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-accent text-muted-foreground">
                              Optional
                            </span>
                          )}
                          {isStage3 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-orange-400/10 text-orange-400">
                              Deal room
                            </span>
                          )}
                          {isStage2 && !isStage3 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-purple-400/10 text-brand">
                              Detail pack
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground break-words sm:truncate">
                          {doc?.file_name
                            ? `📎 ${doc.file_name}`
                            : doc && status !== "empty"
                            ? doc.title
                            : `Create your ${template.name.toLowerCase()}`}
                        </p>
                        {doc && doc.completeness_score > 0 && status !== "complete" && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 bg-accent h-1 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-amber-400 rounded-full transition-all"
                                style={{ width: `${doc.completeness_score}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground tabular-nums">{doc.completeness_score}%</span>
                          </div>
                        )}
                        {/* R11: honest extraction-failure state — never a
                            silent empty result. */}
                        {extractionError && (
                          <div className="mt-2 rounded-none border border-amber-500/30 bg-amber-500/5 px-2.5 py-2">
                            <p className="text-xs font-medium text-amber-600">Could not extract — document stored in Source Files.</p>
                            <p className="text-xs mt-0.5" style={{ color: "#71717A" }}>{extractionError}</p>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRetryExtraction(doc!); }}
                              disabled={retryingDocId === doc?.id}
                              className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium text-brand hover:underline disabled:opacity-50"
                            >
                              {retryingDocId === doc?.id ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                              {retryingDocId === doc?.id ? "Retrying…" : "Retry extraction"}
                            </button>
                          </div>
                        )}
                        {/* Per-document coaching hint */}
                        {hasFeedback && Array.isArray((doc!.ai_feedback as Record<string, unknown>).recommendations) && (
                          <p className="text-xs text-amber-400/80 mt-1.5">
                            → {((doc!.ai_feedback as Record<string, unknown[]>).recommendations)[0]}
                          </p>
                        )}

                        {doc && (status === "complete" || status === "ai_extracted") && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              const newVisibility = doc.visibility === "deal_room" ? "stage2" : "deal_room";
                              const { error } = await supabase.from("founder_documents").update({ visibility: newVisibility }).eq("id", doc.id);
                              if (error) { console.error("[documents] visibility toggle failed:", error); toast.error("Could not change visibility."); return; }
                              refetchFounderDocs();
                            }}
                            title={doc.visibility === "deal_room" ? "Visible in deal room — click to restrict" : "Not in deal room — click to include"}
                            className={cn(
                              "mt-1.5 text-xs px-2 py-0.5 rounded-full transition-colors",
                              doc.visibility === "deal_room"
                                ? "bg-orange-500/15 text-orange-400 hover:bg-orange-500/25"
                                : "bg-accent text-muted-foreground hover:bg-accent"
                            )}
                          >
                            {doc.visibility === "deal_room" ? "🏛 Deal room" : "+ Add to deal room"}
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Start/Edit button */}
                        <button
                          onClick={() => {
                            setEditingDoc(doc ?? {
                              id: "",
                              startup_id: startup?.id ?? "",
                              template_id: template.id,
                              template_slug: template.slug,
                              title: template.name,
                              content: {},
                              completeness_score: 0,
                              status: "empty",
                              updated_at: new Date().toISOString(),
                            });
                          }}
                          className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-xs font-medium hover:shadow-glow transition-shadow"
                        >
                          {buttonAction} <ArrowRight className="h-3 w-3" />
                        </button>

                        {/* Upload instead */}
                        {isUploading ? (
                          <div className="px-2 py-1.5">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                          </div>
                        ) : (
                          <label className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer px-1 py-1.5">
                            <Upload className="h-3 w-3" />
                            Upload
                            <input
                              type="file"
                              className="sr-only"
                              accept=".pdf,.pptx,.ppt,.xlsx,.xls,.docx,.doc,.csv"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(template.slug, template.name, template.id, file);
                                e.target.value = "";
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      </>
      )}

      {/* R10 step 4 — Source Files: the actual original uploaded files,
          each with a clear "ready to attach in deal room" state/action
          reusing the existing visibility toggle logic. */}
      {view === "source-files" && (
        <div className="space-y-3">
          {filteredDocs.length === 0 ? (
            <EmptyState kind="empty" title="No files uploaded yet" />
          ) : (
            filteredDocs.map((template, i) => {
              const showCategoryHeader = i === 0 || filteredDocs[i - 1].category !== template.category;
              const doc = template.founderDoc!;
              const attached = doc.visibility === "deal_room";
              const extractionError = (doc.content as any)?.extraction_error as string | undefined;
              const extracted = !extractionError && (Object.keys(doc.content ?? {}).length > 0 || ["ai_extracted", "complete"].includes(doc.status));
              return (
                <div key={template.id}>
                {showCategoryHeader && (
                  <div className={cn("text-xs font-semibold uppercase tracking-wider text-muted-foreground", i === 0 ? "mb-2" : "mt-5 mb-2")}>
                    {CATEGORY_LABELS[template.category] ?? template.category}
                  </div>
                )}
                <div className="rounded-none border border-border bg-white p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="grid h-10 w-10 place-items-center rounded-none bg-accent shrink-0">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{doc.file_name ?? template.name}</div>
                      <div className="text-xs mt-0.5 flex items-center gap-1.5 flex-wrap" style={{ color: "#71717A" }}>
                        <span>{template.name} · {formatFileSize(doc.file_size)} · Uploaded {new Date(doc.updated_at).toLocaleDateString()}</span>
                        <span className={cn(
                          "inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full",
                          extractionError ? "bg-amber-500/10 text-amber-600"
                            : extracted ? "bg-green-500/10 text-green-600"
                            : "bg-accent text-muted-foreground",
                        )}>
                          {extractionError ? "Extraction failed" : extracted ? "Extracted" : "Not yet extracted"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={async () => {
                        const newVisibility = attached ? "stage2" : "deal_room";
                        const { error } = await supabase.from("founder_documents").update({ visibility: newVisibility }).eq("id", doc.id);
                        if (error) { toast.error("Could not update."); return; }
                        if (startup?.id) queryClient.invalidateQueries({ queryKey: ["founder-documents", startup.id] });
                      }}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-none border px-3 py-1.5 text-xs font-medium transition-colors",
                        attached
                          ? "border-brand bg-accent text-brand"
                          : "border-border text-muted-foreground hover:bg-accent",
                      )}
                    >
                      {attached ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                      {attached ? "Ready to attach" : "Attach to deal room"}
                    </button>
                    <button
                      onClick={() => handleDeleteSourceFile(doc)}
                      disabled={deletingDocId === doc.id}
                      title="Delete original file"
                      className="inline-flex items-center gap-1 rounded-none border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:border-red-500/40 hover:text-red-500 transition-colors disabled:opacity-50"
                    >
                      {deletingDocId === doc.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* R10 step 5 — Digital Document Vault: the Hockystick-processed
          counterpart to the Digital Profile — structured AI-extracted
          detail per document, ready to attach when a deal room exists. */}
      {view === "digital-document-vault" && (
        <div className="space-y-4">
          {filteredDocs.length === 0 ? (
            <EmptyState kind="empty" title="No processed documents yet" />
          ) : (
            filteredDocs.map((template, i) => {
              const showCategoryHeader = i === 0 || filteredDocs[i - 1].category !== template.category;
              const doc = template.founderDoc!;
              const attached = doc.visibility === "deal_room";
              const content = (doc.content ?? {}) as Record<string, any>;
              // R11 step 2: structured custom-doc fields (funding_ask,
              // use_of_funds, projections, key_metrics, highlights) render
              // distinctly from raw template key-value pairs.
              const structuredKeys = ["suggested_category", "category", "highlights", "funding_ask", "use_of_funds", "projections", "key_metrics", "ai_summary", "classification"];
              const contentEntries = Object.entries(content).filter(([k, v]) => v && !structuredKeys.includes(k));
              const fields = TEMPLATE_FIELDS[template.slug] ?? [];
              const labelFor = (key: string) => fields.find((f) => f.key === key)?.label ?? key.replace(/_/g, " ");
              const isCustomDoc = !template.id || !TEMPLATE_FIELDS[template.slug];
              return (
                <div key={template.id}>
                {showCategoryHeader && (
                  <div className={cn("text-xs font-semibold uppercase tracking-wider text-muted-foreground", i === 0 ? "mb-2" : "mt-5 mb-2")}>
                    {CATEGORY_LABELS[template.category] ?? template.category}
                  </div>
                )}
                <div className="rounded-none border border-border bg-white overflow-hidden">
                  <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-foreground">{template.name}</div>
                      <div className="text-xs mt-0.5" style={{ color: "#71717A" }}>
                        {doc.completeness_score}% complete · Updated {new Date(doc.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        const newVisibility = attached ? "stage2" : "deal_room";
                        const { error } = await supabase.from("founder_documents").update({ visibility: newVisibility }).eq("id", doc.id);
                        if (error) { toast.error("Could not update."); return; }
                        refetchFounderDocs();
                      }}
                      className={cn(
                        "shrink-0 inline-flex items-center gap-1.5 rounded-none border px-3 py-1.5 text-xs font-medium transition-colors",
                        attached ? "border-brand bg-accent text-brand" : "border-border text-muted-foreground hover:bg-accent",
                      )}
                    >
                      {attached ? "Ready to attach" : "Attach to deal room"}
                    </button>
                  </div>
                  <div className="p-5 space-y-4">
                    {doc.content?.ai_summary && (
                      <p className="text-sm leading-relaxed" style={{ color: "#52525B" }}>{String(doc.content.ai_summary)}</p>
                    )}
                    {isCustomDoc && Array.isArray(content.highlights) && content.highlights.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#71717A" }}>Highlights</div>
                        <ul className="space-y-1.5">
                          {content.highlights.map((h: string, idx: number) => (
                            <li key={idx} className="text-sm flex gap-2" style={{ color: "#52525B" }}>
                              <span className="text-brand shrink-0">✦</span>{h}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {isCustomDoc && (content.funding_ask || content.use_of_funds || content.projections) && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {content.funding_ask && (
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#71717A" }}>Funding ask</div>
                            <div className="mt-1 text-sm text-foreground">{content.funding_ask}</div>
                          </div>
                        )}
                        {content.use_of_funds && (
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#71717A" }}>Use of funds</div>
                            <div className="mt-1 text-sm text-foreground">{content.use_of_funds}</div>
                          </div>
                        )}
                        {content.projections && (
                          <div className="sm:col-span-2">
                            <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#71717A" }}>Projections</div>
                            <div className="mt-1 text-sm text-foreground">{content.projections}</div>
                          </div>
                        )}
                      </div>
                    )}
                    {isCustomDoc && Array.isArray(content.key_metrics) && content.key_metrics.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#71717A" }}>Key metrics</div>
                        <div className="grid gap-3 sm:grid-cols-3">
                          {content.key_metrics.map((m: { label: string; value: string }, idx: number) => (
                            <div key={idx} className="rounded-none border border-border bg-[#FAFAFA] p-3">
                              <div className="text-xs" style={{ color: "#71717A" }}>{m.label}</div>
                              <div className="mt-1 text-sm font-medium text-foreground">{m.value}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {!isCustomDoc && (
                      contentEntries.length === 0 ? (
                        <p className="text-sm" style={{ color: "#71717A" }}>No structured data extracted yet.</p>
                      ) : (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {contentEntries.map(([key, val]) => (
                            <div key={key}>
                              <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#71717A" }}>{labelFor(key)}</div>
                              <div className="mt-1 text-sm text-foreground">{String(val)}</div>
                            </div>
                          ))}
                        </div>
                      )
                    )}
                  </div>
                </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* R10 step 6 — Document Privacy Settings: two distinct control
          sections (Source Files, Digital Document Vault), not one shared
          block. Each lists its own documents with independent visibility
          toggles. */}
      {view === "privacy-settings" && (
        <div className="space-y-8">
          {[
            { key: "source-files" as const, label: "Source Files privacy", description: "Control which of your original uploaded files are visible in a deal room." },
            { key: "digital-document-vault" as const, label: "Digital Document Vault privacy", description: "Control which Hockystick-processed documents are visible in a deal room." },
          ].map(({ key, label, description }) => {
            const docsForSection = key === "source-files"
              ? documentsWithStatus.filter((t) => !!t.founderDoc?.file_path)
              : documentsWithStatus.filter((t) =>
                  !!t.founderDoc &&
                  !(t.founderDoc.content as any)?.extraction_error &&
                  (Object.keys(t.founderDoc.content ?? {}).length > 0 ||
                    ["ai_extracted", "complete", "needs_review"].includes(t.founderDoc.status)));
            return (
              <div key={key}>
                <div className="text-sm font-semibold text-foreground">{label}</div>
                <p className="text-xs mt-1 mb-3" style={{ color: "#71717A" }}>{description}</p>
                {docsForSection.length === 0 ? (
                  <EmptyState kind="empty" title="Nothing here yet" />
                ) : (
                  <div className="rounded-none border border-border bg-white divide-y divide-border">
                    {docsForSection.map((template) => {
                      const doc = template.founderDoc!;
                      const attached = doc.visibility === "deal_room";
                      return (
                        <div key={template.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">{template.name}</div>
                            <div className="text-xs" style={{ color: "#71717A" }}>{doc.file_name ?? doc.title}</div>
                          </div>
                          <button
                            onClick={async () => {
                              const newVisibility = attached ? "stage2" : "deal_room";
                              const { error } = await supabase.from("founder_documents").update({ visibility: newVisibility }).eq("id", doc.id);
                              if (error) { toast.error("Could not update."); return; }
                              refetchFounderDocs();
                            }}
                            role="switch"
                            aria-checked={attached}
                            className={cn(
                              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                              attached ? "bg-brand" : "bg-accent",
                            )}
                          >
                            <span className={cn(
                              "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
                              attached ? "translate-x-5" : "translate-x-0",
                            )} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Document Editor Modal */}
      {editingDoc && (
        <DocumentEditorModal
          doc={editingDoc}
          template={templates.find(t => t.id === editingDoc.template_id)}
          startup={startup}
          onClose={() => setEditingDoc(null)}
          onSave={() => {
            queryClient.invalidateQueries({ queryKey: ["founder-documents"] });
            setEditingDoc(null);
          }}
        />
      )}

      {/* Custom Document upload modal */}
      {showCustomUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !customUploading && setShowCustomUpload(false)}>
          <div className="w-full max-w-md rounded-none border border-border bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold" style={{ fontFamily: "Syne, sans-serif" }}>Add a custom document</h3>
              <button onClick={() => !customUploading && setShowCustomUpload(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: "#52525B" }}>Document title</label>
                <input
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g. Letter of Intent — Acme Corp"
                  className="w-full rounded-none border border-border bg-white px-3 py-2 text-sm outline-none focus:border-brand/50"
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: "#52525B" }}>Category</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {(["market", "financials", "team", "product", "legal"] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCustomCategory(cat)}
                      className={cn(
                        "rounded-none border px-2 py-1.5 text-xs font-medium capitalize transition-colors",
                        customCategory === cat ? "border-brand bg-accent text-brand" : "border-border text-muted-foreground hover:bg-accent/40",
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <p className="text-xs mt-1.5" style={{ color: "#71717A" }}>AI will suggest a category once extracted — you can change it later.</p>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: "#52525B" }}>File</label>
                <label className="rounded-none border border-dashed border-border p-5 text-center cursor-pointer hover:border-brand/50 hover:bg-accent/20 transition-colors block">
                  <Upload className="h-5 w-5 text-muted-foreground mx-auto" />
                  <div className="text-sm font-medium mt-2">{customFile ? customFile.name : "Choose a file"}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">PDF, DOCX, PPTX, XLSX, CSV · Max 50MB</div>
                  <input type="file" accept=".pdf,.pptx,.ppt,.xlsx,.xls,.docx,.doc,.csv" className="sr-only" onChange={(e) => e.target.files?.[0] && setCustomFile(e.target.files[0])} />
                </label>
              </div>
              {customExtractError && (
                <div className="rounded-none border border-amber-500/30 bg-amber-500/5 px-3 py-2.5">
                  <p className="text-xs font-medium text-amber-600">Could not extract this document.</p>
                  <p className="text-xs mt-0.5" style={{ color: "#71717A" }}>{customExtractError}</p>
                  <p className="text-xs mt-1" style={{ color: "#71717A" }}>It's stored in Source Files — retry, or fill it in manually.</p>
                </div>
              )}
              <button
                onClick={handleCustomDocumentUpload}
                disabled={customUploading || !customFile || !customTitle.trim() || !customCategory}
                className="w-full inline-flex items-center justify-center gap-2 rounded-none hs-gradient text-brand-foreground px-4 py-2.5 text-sm font-medium disabled:opacity-50"
              >
                {customUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {customUploading ? "Uploading & extracting…" : customExtractError ? "Retry" : "Upload & extract"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}

interface DocumentEditorModalProps {
  doc: FounderDocument;
  template?: DocumentTemplate;
  startup?: any;
  onClose: () => void;
  onSave: () => void;
}

function DocumentEditorModal({ doc, template, startup, onClose, onSave }: DocumentEditorModalProps) {
  const [content, setContent] = useState<Record<string, string>>(doc.content ?? {});
  const [saving, setSaving] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewFeedback, setReviewFeedback] = useState<AIFeedback | null>(doc.ai_feedback ?? null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const fields = template ? (TEMPLATE_FIELDS[template.slug] ?? []) : [];

  // Live completeness
  const liveScore = useMemo(() => {
    if (fields.length === 0) return doc.completeness_score;
    const filled = fields.filter(f => (content[f.key] ?? "").trim().length > 0).length;
    return Math.round((filled / fields.length) * 100);
  }, [content, fields, doc.completeness_score]);

  const handleSave = async () => {
    if (!startup?.id || !template) return;
    setSaving(true);
    try {
      const filled = fields.filter(f => (content[f.key] ?? "").trim().length > 0).length;
      const score = fields.length > 0 ? Math.round((filled / fields.length) * 100) : 0;
      const status = score === 100 ? "complete" : score > 0 ? "draft" : "empty";

      const { error } = await supabase.from("founder_documents").upsert({
        startup_id: startup.id,
        template_id: template.id,
        template_slug: template.slug,
        title: template.name,
        content,
        completeness_score: score,
        status,
        updated_at: new Date().toISOString(),
      }, { onConflict: "startup_id,template_slug" });

      if (error) throw error;
      toast.success("Document saved");
      // Badge evaluation — fire-and-forget on this write event
      import("@/lib/badge-award-engine").then((m) => m.evaluateAndAwardBadges({ data: { startup_id: startup?.id } })).catch(() => {});
      onSave();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleAIReview = async () => {
    if (isReviewing || !template) return;
    const filledFields = Object.values(content).filter(v => v && String(v).trim()).length;
    if (filledFields === 0) {
      setReviewError("Fill in some fields first before requesting a review.");
      return;
    }
    setIsReviewing(true);
    setReviewError(null);
    setReviewFeedback(null);
    try {
      const { data, error } = await supabase.functions.invoke("review-document", {
        body: {
          templateSlug: template.slug,
          content,
          stage: startup?.stage ?? "seed",
        },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error("Review failed");
      setReviewFeedback(data.feedback);
      if (startup?.id) {
        const { error: fbErr } = await supabase.from("founder_documents")
          .update({ ai_feedback: data.feedback, status: "needs_review", updated_at: new Date().toISOString() })
          .eq("startup_id", startup.id)
          .eq("template_slug", template.slug);
        if (fbErr) console.error("[documents] ai feedback save failed:", fbErr);
      }
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Review failed. Try again.");
    } finally {
      setIsReviewing(false);
    }
  };

  const inputCls = "w-full rounded-lg border border-border bg-accent px-3 py-2.5 text-sm text-foreground placeholder:text-faint focus:outline-none focus:border-brand/60 focus:ring-1 focus:ring-brand/20";

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl rounded-2xl border border-border/60 bg-card shadow-2xl overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between sticky top-0 bg-card z-10">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-base font-semibold text-foreground" style={{ fontFamily: "Syne, sans-serif" }}>{template?.name ?? "Document"}</h2>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex-1 bg-accent h-1 rounded-full overflow-hidden">
                <div
                  className="h-full hs-gradient rounded-full transition-all duration-300"
                  style={{ width: `${liveScore}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{liveScore}% complete</span>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Fields */}
        <div className="px-6 py-6 space-y-5 max-h-[calc(100vh-200px)] overflow-y-auto">
          {fields.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No fields</p>
            </div>
          ) : (
            fields.map(field => (
              <div key={field.key}>
                <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium block mb-1.5">
                  {field.label}
                  {field.required && <span className="text-red-400 ml-1">*</span>}
                </label>
                {field.type === "textarea" ? (
                  <textarea
                    value={content[field.key] ?? ""}
                    onChange={(e) => setContent(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className={cn(inputCls, "resize-none min-h-[100px]")}
                  />
                ) : field.type === "number" ? (
                  <input
                    type="number"
                    value={content[field.key] ?? ""}
                    onChange={(e) => setContent(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className={inputCls}
                  />
                ) : field.type === "percentage" ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={content[field.key] ?? ""}
                      onChange={(e) => setContent(prev => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className={cn(inputCls, "flex-1")}
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={content[field.key] ?? ""}
                    onChange={(e) => setContent(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className={inputCls}
                  />
                )}
              </div>
            ))
          )}
        </div>

        {/* Error */}
        {reviewError && (
          <div className="mx-6 mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {reviewError}
          </div>
        )}

        {/* AI Feedback */}
        {reviewFeedback && (
          <div className="mx-6 mb-6 space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-accent border border-border">
              <div className="flex-1 min-w-0 pr-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">AI Review</p>
                <p className="text-sm text-foreground leading-relaxed">{reviewFeedback.summary}</p>
              </div>
              <div className={cn(
                "shrink-0 w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold border-2",
                reviewFeedback.signal === "strong" ? "border-green-500 text-green-400"
                : reviewFeedback.signal === "adequate" ? "border-amber-500 text-amber-400"
                : reviewFeedback.signal === "weak" ? "border-orange-500 text-orange-400"
                : "border-red-500 text-red-400"
              )}>
                {reviewFeedback.overall_score}
              </div>
            </div>

            {reviewFeedback.investor_flag && (
              <div className="p-3 rounded-lg bg-red-500/8 border border-red-500/20">
                <p className="text-xs text-red-400 uppercase tracking-wider mb-1">⚠ Investor will push back on</p>
                <p className="text-sm text-muted-foreground">{reviewFeedback.investor_flag}</p>
              </div>
            )}

            {reviewFeedback.strengths?.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Strengths</p>
                <ul className="space-y-1">
                  {reviewFeedback.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-green-400 mt-0.5 shrink-0">✓</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {reviewFeedback.gaps?.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Gaps to address</p>
                <ul className="space-y-1">
                  {reviewFeedback.gaps.map((g, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-amber-400 mt-0.5 shrink-0">→</span>{g}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {reviewFeedback.recommendations?.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Fix these</p>
                <ul className="space-y-1">
                  {reviewFeedback.recommendations.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-brand mt-0.5 shrink-0 font-bold">{i + 1}</span>{r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/60 flex items-center justify-between sticky bottom-0 bg-card">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            Close
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAIReview}
              disabled={isReviewing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-brand/40 text-brand px-4 py-2 text-sm hover:bg-accent disabled:opacity-50 transition-colors"
            >
              {isReviewing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isReviewing ? "Reviewing…" : "AI Review"}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg hs-gradient text-foreground px-4 py-2 text-sm font-medium hover:bg-[#6d28d9] disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
