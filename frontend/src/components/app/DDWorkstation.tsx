import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { analyzeThesisAlignment, generateDocSummary } from "@/lib/ai-secure-fn";

function formatThesisText(text: string) {
  const lines = text.split("\n").filter((l) => l.trim());
  const renderInline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
      part.startsWith("**") && part.endsWith("**")
        ? <strong key={j} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
        : <span key={j}>{part}</span>
    );
  return lines.map((line, i) => {
    const trimmed = line.trim();
    if (/overall verdict/i.test(trimmed)) {
      return <div key={i} className="mt-2 pt-2 border-t border-border/40 font-medium">{renderInline(trimmed)}</div>;
    }
    return <div key={i} className="leading-relaxed">{renderInline(trimmed)}</div>;
  });
}
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  CheckCircle2, Circle, ChevronDown, ChevronUp, Flag, Clock, Eye,
  StickyNote, Save, Loader2, FileText, Plus, Sparkles, Trash2, Download, RefreshCw,
  BarChart3, TrendingUp, Users, Scale, Target, Handshake, Play, Image, ExternalLink,
  Star, Zap, DollarSign, Wand2,
} from "lucide-react";
import { runAutoDetection } from "@/lib/dd-fn";

const CATEGORIES = ["Financials", "Team", "Legal", "Market", "Product", "References"] as const;
type DDCategory = (typeof CATEGORIES)[number];
const STATUSES = ["Pending", "In Review", "Complete", "Red Flag"] as const;
type DDStatus = (typeof STATUSES)[number];

const STATUS_CONFIG: Record<DDStatus, { label: string; icon: any; cls: string; dot: string }> = {
  "Pending":   { label: "Pending",   icon: Clock,        cls: "bg-muted text-muted-foreground",     dot: "bg-muted-foreground" },
  "In Review": { label: "In Review", icon: Eye,          cls: "bg-brand/10 text-brand",             dot: "bg-brand" },
  "Complete":  { label: "Complete",  icon: CheckCircle2, cls: "bg-success/10 text-success",         dot: "bg-success" },
  "Red Flag":  { label: "Red Flag",  icon: Flag,         cls: "bg-destructive/10 text-destructive", dot: "bg-destructive" },
};

const CAT_CONFIG: Record<DDCategory, { icon: any; color: string; description: string }> = {
  Financials: { icon: BarChart3,  color: "text-emerald-500", description: "P&L, balance sheet, cash flow, projections, cap table" },
  Team:       { icon: Users,      color: "text-blue-500",    description: "Founder backgrounds, org chart, key hires, advisors" },
  Legal:      { icon: Scale,      color: "text-red-500",     description: "Incorporation, IP ownership, contracts, litigation" },
  Market:     { icon: TrendingUp, color: "text-purple-500",  description: "TAM/SAM/SOM, competition, customer research" },
  Product:    { icon: Target,     color: "text-orange-500",  description: "Roadmap, tech stack, demo access, key metrics" },
  References: { icon: Handshake,  color: "text-pink-500",    description: "Customer refs, investor refs, partner refs" },
};

const DEFAULT_ITEMS: Record<DDCategory, string[]> = {
  Financials: ["Last 3 years P&L", "Current balance sheet", "Cash flow statement", "Revenue projections (3yr)", "Cap table"],
  Team:       ["Founder CVs / LinkedIn", "Org chart", "Key employee contracts", "Advisory board list"],
  Legal:      ["Certificate of incorporation", "Shareholder agreement", "IP ownership docs", "Pending litigation disclosure"],
  Market:     ["TAM/SAM/SOM analysis", "Competitive landscape", "Customer research / surveys"],
  Product:    ["Product roadmap", "Tech architecture overview", "Demo access / sandbox", "Key metrics dashboard"],
  References: ["Customer references (3+)", "Investor references", "Partner / vendor references"],
};

interface Props {
  dealRoomId: string;
  userId: string | undefined;
  isInvestor?: boolean;
  isFounder?: boolean;
}

export function DDWorkstation({ dealRoomId, userId, isInvestor = false, isFounder = false }: Props) {
  const qc = useQueryClient();
  const [expandedCat, setExpandedCat] = useState<DDCategory | null>("Financials");
  const [editingNotes, setEditingNotes] = useState<DDCategory | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [addingItem, setAddingItem] = useState<DDCategory | null>(null);
  const [newItemLabel, setNewItemLabel] = useState("");
  const [vaultOpen, setVaultOpen] = useState(true);
  const [vaultFilter, setVaultFilter] = useState<string>("All");
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [thesisAnalysis, setThesisAnalysis] = useState<Record<string, string>>({});
  const [analyzingDoc, setAnalyzingDoc] = useState<string | null>(null);
  const [scorecard, setScorecard] = useState<Record<string, number>>({});
  const [scorecardOpen, setScorecardOpen] = useState(false);
  const [runningAutoDetect, setRunningAutoDetect] = useState(false);

  useEffect(() => {
    if (!dealRoomId || !userId) return;
    seedDDIfNeeded();
  }, [dealRoomId, userId]);

  const seedDDIfNeeded = async () => {
    const { data: existing } = await supabase
      .from("dd_categories")
      .select("id")
      .eq("deal_room_id", dealRoomId)
      .limit(1);
    if (existing && existing.length > 0) return;

    try {
      const { error: catErr } = await supabase.from("dd_categories").insert(
        CATEGORIES.map((cat) => ({ deal_room_id: dealRoomId, category: cat, status: "Pending" })),
      );
      if (catErr) throw catErr;

      const rows: { deal_room_id: string; category: string; label: string; checked: boolean }[] = [];
      for (const cat of CATEGORIES) {
        for (const label of DEFAULT_ITEMS[cat]) {
          rows.push({ deal_room_id: dealRoomId, category: cat, label, checked: false });
        }
      }
      const { error: itemErr } = await supabase.from("dd_checklist_items").insert(rows);
      if (itemErr) throw itemErr;

      qc.invalidateQueries({ queryKey: ["dd-workstation", dealRoomId] });
    } catch (err: any) {
      console.error("DD seed failed:", err?.message ?? err);
    }
  };

  const { data: ddData, isLoading } = useQuery({
    queryKey: ["dd-workstation", dealRoomId],
    enabled: !!dealRoomId && !!userId,
    queryFn: async () => {
      const [{ data: categories }, { data: items }] = await Promise.all([
        supabase
          .from("dd_categories")
          .select("id, category, status, investor_notes, updated_at")
          .eq("deal_room_id", dealRoomId)
          .order("category"),
        supabase
          .from("dd_checklist_items")
          .select("id, category, label, checked, auto_detected, auto_source, auto_source_label, manually_overridden")
          .eq("deal_room_id", dealRoomId)
          .order("created_at"),
      ]);
      return { categories: categories ?? [], items: items ?? [] };
    },
  });

  const { data: dealDocs = [] } = useQuery({
    queryKey: ["dd-docs", dealRoomId],
    enabled: !!dealRoomId,
    staleTime: 0,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data } = await supabase
        .from("documents")
        .select("id, storage_path, category, ai_summary, file_name")
        .eq("deal_room_id", dealRoomId);
      return data ?? [];
    },
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["doc-reviews", dealRoomId],
    enabled: !!dealRoomId && !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("document_reviews")
        .select("*")
        .eq("deal_room_id", dealRoomId);
      return data ?? [];
    },
  });

  const { data: investorProfile } = useQuery({
    queryKey: ["investor-profile-thesis", userId],
    enabled: !!userId && isInvestor,
    queryFn: async () => {
      const { data } = await supabase
        .from("investor_profiles")
        .select("thesis, sectors, stages, check_size_min, check_size_max, red_flags, key_metrics, fund_name")
        .eq("user_id", userId!)
        .maybeSingle();
      return data;
    },
  });

  const { data: roomMedia } = useQuery({
    queryKey: ["room-media", dealRoomId],
    enabled: !!dealRoomId,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_rooms")
        .select("pitch_deck_url, product_video_url, product_images")
        .eq("id", dealRoomId)
        .maybeSingle();
      return data;
    },
  });

  const categories = ddData?.categories ?? [];
  const checklistItems = ddData?.items ?? [];

  const nameFromPath = (doc: any): string => {
    if (doc.file_name) return doc.file_name;
    const last = (doc.storage_path || "").split("/").pop() ?? "";
    return last.replace(/^\d{13}-/, "") || "Untitled";
  };

  const vaultCategories = ["All", ...Array.from(new Set(dealDocs.map((d: any) => d.category || "Other"))) as string[]];
  const filteredVaultDocs = vaultFilter === "All"
    ? dealDocs
    : dealDocs.filter((d: any) => (d.category || "Other") === vaultFilter);

  const getCatData = (cat: DDCategory) =>
    categories.find((c: any) => c.category === cat) ?? { id: null, status: "Pending", investor_notes: "" };
  const getCatItems = (cat: DDCategory) => checklistItems.filter((i: any) => i.category === cat);
  const getDocReview = (docId: string) =>
    reviews.find((r: any) => r.document_id === docId);

  const getProgress = (cat: DDCategory) => {
    const items = getCatItems(cat);
    if (!items.length) return 0;
    return Math.round((items.filter((i: any) => i.checked).length / items.length) * 100);
  };
  const overallProgress = () => {
    if (!checklistItems.length) return 0;
    return Math.round((checklistItems.filter((i: any) => i.checked).length / checklistItems.length) * 100);
  };

  const toggleItem = async (itemId: string, checked: boolean, isAutoDetected?: boolean) => {
    // Optimistic update — also set manually_overridden if this is an auto-detected item
    qc.setQueryData(["dd-workstation", dealRoomId], (old: any) => ({
      ...old,
      items: old?.items?.map((i: any) =>
        i.id === itemId
          ? { ...i, checked, ...(isAutoDetected ? { manually_overridden: true } : {}) }
          : i
      ),
    }));
    const update: Record<string, any> = { checked };
    if (isAutoDetected) update.manually_overridden = true;
    const { error } = await supabase
      .from("dd_checklist_items")
      .update(update)
      .eq("id", itemId);
    if (error) {
      toast.error("Failed to update");
      qc.invalidateQueries({ queryKey: ["dd-workstation", dealRoomId] });
    }
  };

  const handleRunAutoDetection = async () => {
    if (!userId) return;
    setRunningAutoDetect(true);
    try {
      const result = await runAutoDetection({ data: { dealRoomId, userId } });
      if ("error" in result && result.error) {
        toast.error(result.error as string);
      } else {
        const count = (result.detected as any[]).length;
        toast.success(count > 0 ? `Auto-detected ${count} item${count === 1 ? "" : "s"}` : "No new items auto-detected");
        qc.invalidateQueries({ queryKey: ["dd-workstation", dealRoomId] });
      }
    } catch (err: any) {
      toast.error(err?.message || "Auto-detection failed");
    } finally {
      setRunningAutoDetect(false);
    }
  };

  const deleteItem = async (itemId: string) => {
    const { error } = await supabase
      .from("dd_checklist_items")
      .delete()
      .eq("id", itemId);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["dd-workstation", dealRoomId] });
  };

  const updateStatus = async (cat: DDCategory, status: string) => {
    try {
      const { error } = await supabase.from("dd_categories").upsert(
        { deal_room_id: dealRoomId, category: cat, status, updated_at: new Date().toISOString() },
        { onConflict: "deal_room_id,category" },
      );
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["dd-workstation", dealRoomId] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to update status");
    }
  };

  const saveFeedback = async (cat: DDCategory) => {
    try {
      const { error } = await supabase.from("dd_categories").upsert(
        {
          deal_room_id: dealRoomId,
          category: cat,
          investor_notes: noteDraft,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "deal_room_id,category" },
      );
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["dd-workstation", dealRoomId] });
      setEditingNotes(null);
      toast.success("Feedback saved");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save feedback");
    }
  };

  const addItem = async (cat: DDCategory) => {
    if (!newItemLabel.trim()) return;
    await supabase.from("dd_checklist_items").insert({
      deal_room_id: dealRoomId,
      category: cat,
      label: newItemLabel.trim(),
      checked: false,
    });
    qc.invalidateQueries({ queryKey: ["dd-workstation", dealRoomId] });
    setNewItemLabel("");
    setAddingItem(null);
    toast.success("Item added");
  };

  const analyzeAgainstThesis = async (doc: any) => {
    if (!investorProfile) return;
    setAnalyzingDoc(doc.id);
    try {
      const thesis = [
        investorProfile.thesis && `Thesis: ${investorProfile.thesis}`,
        investorProfile.sectors && `Sectors: ${investorProfile.sectors}`,
        investorProfile.stages && `Stages: ${investorProfile.stages}`,
        investorProfile.check_size_min && `Check size: $${investorProfile.check_size_min}–$${investorProfile.check_size_max}`,
        investorProfile.red_flags && `Won't invest in: ${investorProfile.red_flags}`,
        investorProfile.key_metrics && `Key metrics: ${investorProfile.key_metrics}`,
      ].filter(Boolean).join("\n");

      // Always read the full file — 4-bullet summary loses critical details
      let docContent = "";
      if (doc.storage_path) {
        try {
          const { data: sd } = await supabase.storage.from("documents").createSignedUrl(doc.storage_path, 60);
          if (sd?.signedUrl) {
            const buf = await (await fetch(sd.signedUrl)).arrayBuffer();
            const fileName = doc.file_name || doc.storage_path?.split("/").pop() || "";
            const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
            if (["pptx", "ppt"].includes(ext)) {
              try {
                const { default: JSZip } = await import("jszip");
                const zip = await JSZip.loadAsync(buf);
                const slides = Object.keys(zip.files)
                  .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
                  .sort((a, b) => parseInt(a.match(/\d+/)?.[0]??"0") - parseInt(b.match(/\d+/)?.[0]??"0"));
                const texts: string[] = [];
                for (const s of slides) {
                  const xml = await zip.files[s].async("string");
                  const t = [...xml.matchAll(/<a:t[^>]*?>([^<]+)<\/a:t>/g)]
                    .map((m) => m[1].trim()).filter((t) => t.length > 1 && /[a-zA-Z]/.test(t)).join(" ");
                  if (t) texts.push(t);
                }
                docContent = texts.join(" • ").slice(0, 3000);
              } catch { /* zip failed */ }
            } else if (["docx", "doc"].includes(ext)) {
              try {
                const { default: JSZip } = await import("jszip");
                const zip = await JSZip.loadAsync(buf);
                const wd = zip.files["word/document.xml"];
                if (wd) {
                  const xml = await wd.async("string");
                  docContent = [...xml.matchAll(/<w:t[^>]*?>([^<]+)<\/w:t>/g)]
                    .map((m) => m[1].trim()).filter((t) => /[a-zA-Z]/.test(t)).join(" ").slice(0, 3000);
                }
              } catch { /* zip failed */ }
            } else {
              const raw = new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(buf));
              docContent = raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, " ").replace(/\s+/g, " ").slice(0, 3000).trim();
            }
          }
        } catch { /* signed URL failed */ }
      }

      const fileName = doc.file_name || doc.storage_path?.split("/").pop()?.replace(/^\d{13}-/, "") || "document";
      const summaryHint = doc.ai_summary && doc.ai_summary.length > 50 && !doc.ai_summary.startsWith("Could not")
        ? `\n\nAI SUMMARY (bonus context):\n${doc.ai_summary}`
        : "";
      const docContext = docContent
        ? `Document: ${fileName}\n\nFULL EXTRACTED CONTENT:\n${docContent}${summaryHint}`
        : doc.ai_summary && !doc.ai_summary.startsWith("Could not")
        ? `Document: ${fileName}\n\nAI SUMMARY (full text unavailable):\n${doc.ai_summary}`
        : `Document: ${fileName} (category: ${doc.category || "Other"}) — text extraction failed.`;

      const result = await analyzeThesisAlignment({
        data: {
          userId: investorProfile.user_id || "",
          investorThesis: thesis,
          documentContext: docContext,
          fileName,
        }
      });
      if (result.error) throw new Error(result.reply);
      setThesisAnalysis((prev) => ({ ...prev, [doc.id]: result.reply }));
    } catch {
      setThesisAnalysis((prev) => ({ ...prev, [doc.id]: "Analysis failed. Please try again." }));
    } finally {
      setAnalyzingDoc(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading due diligence data…
      </div>
    );
  }

  if (isFounder) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Deal Report</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Your investor's due diligence progress and feedback on your documents.
          </p>
        </div>

        {/* DD Progress grid */}
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="text-sm font-semibold mb-4">Due Diligence Progress</div>
          <div className="mb-3 h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-gradient-brand transition-all duration-500"
              style={{ width: `${overallProgress()}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            {checklistItems.filter((i: any) => i.checked).length} of {checklistItems.length} items reviewed
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {CATEGORIES.map((cat) => {
              const catData = getCatData(cat);
              const status = (catData.status as DDStatus) ?? "Pending";
              const cfg = STATUS_CONFIG[status];
              const StatusIcon = cfg.icon;
              const items = getCatItems(cat);
              const progress = getProgress(cat);
              const { icon: CatIcon, color } = CAT_CONFIG[cat];
              return (
                <div key={cat} className={cn(
                  "rounded-xl border p-3 space-y-2",
                  status === "Red Flag" ? "border-destructive/30 bg-destructive/5" :
                  status === "Complete" ? "border-success/30 bg-success/5" :
                  "border-border/60 bg-background"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <CatIcon className={cn("h-3.5 w-3.5", color)} />
                      <span className="text-xs font-medium">{cat}</span>
                    </div>
                    <span className={cn("inline-flex items-center gap-0.5 text-[10px] font-medium rounded-full px-1.5 py-0.5", cfg.cls)}>
                      <StatusIcon className="h-2.5 w-2.5" />{cfg.label}
                    </span>
                  </div>
                  <div className="h-1 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-gradient-brand" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground">{items.filter((i: any) => i.checked).length}/{items.length} items</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Document feedback */}
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border/60">
            <div className="text-sm font-semibold">Document Feedback</div>
            <div className="text-xs text-muted-foreground mt-0.5">Investor feedback on your uploaded documents</div>
          </div>
          {dealDocs.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No documents uploaded yet. Upload documents in the Document Vault tab.
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {dealDocs.map((doc: any) => {
                const review = getDocReview(doc.id);
                const docName = nameFromPath(doc);
                return (
                  <div key={doc.id} className="flex items-start gap-3 px-5 py-4">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">{docName}</span>
                        {review?.verdict ? (
                          <span className={cn(
                            "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                            review.verdict === "accepted" && "bg-success/10 text-success",
                            review.verdict === "rejected" && "bg-destructive/10 text-destructive",
                            review.verdict === "needs_revision" && "bg-warning/10 text-warning",
                          )}>
                            {review.verdict === "accepted" ? "✓ Accepted"
                              : review.verdict === "rejected" ? "✗ Rejected"
                              : "↻ Needs revision"}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                            Pending review
                          </span>
                        )}
                      </div>
                      {review?.feedback && (
                        <div className={cn(
                          "mt-2 rounded-lg px-3 py-2 text-xs",
                          review.verdict === "needs_revision" && "bg-warning/10 text-warning border border-warning/20",
                          review.verdict === "rejected" && "bg-destructive/10 text-destructive border border-destructive/20",
                          review.verdict === "accepted" && "bg-success/10 text-success border border-success/20",
                        )}>
                          <span className="font-medium">Feedback: </span>{review.feedback}
                        </div>
                      )}
                      {!review && (
                        <p className="text-xs text-muted-foreground mt-0.5">Waiting for investor to review</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Category feedback */}
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border/60">
            <div className="text-sm font-semibold">Category Feedback</div>
            <div className="text-xs text-muted-foreground mt-0.5">Investor notes per due diligence category</div>
          </div>
          <div className="divide-y divide-border/60">
            {CATEGORIES.map((cat) => {
              const catData = getCatData(cat);
              if (!catData.investor_notes) return null;
              const { icon: CatIcon, color } = CAT_CONFIG[cat];
              return (
                <div key={cat} className="flex items-start gap-3 px-5 py-4">
                  <CatIcon className={cn("h-4 w-4 shrink-0 mt-0.5", color)} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium mb-1">{cat}</div>
                    <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                      {catData.investor_notes}
                    </div>
                  </div>
                </div>
              );
            })}
            {CATEGORIES.every((cat) => !getCatData(cat).investor_notes) && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No feedback yet from your investor.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const checkedCount = checklistItems.filter((i: any) => i.checked).length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4 mb-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Due Diligence</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {checkedCount}/{checklistItems.length} items complete · {overallProgress()}%
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => {
            const status = (getCatData(cat).status as DDStatus) ?? "Pending";
            const cfg = STATUS_CONFIG[status];
            return (
              <span key={cat} className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1", cfg.cls)}>
                <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
                {cat}
              </span>
            );
          })}
        </div>
      </div>

      {isFounder && (
        <div className="mb-4 rounded-lg bg-muted/40 border border-border/40 px-4 py-2.5 text-xs text-muted-foreground flex items-center gap-2">
          <Eye className="h-3.5 w-3.5 shrink-0" />
          This is your investor's due diligence checklist. Items marked complete mean the investor has reviewed them.
        </div>
      )}

      {isInvestor && (
        <div className="mb-4 flex items-center justify-between rounded-lg px-4 py-2.5 text-xs"
          style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)" }}>
          <span className="text-muted-foreground flex items-center gap-1.5">
            <Wand2 className="h-3.5 w-3.5" style={{ color: "#A855F7" }} />
            Auto-detect items from uploaded documents and verified founder data
          </span>
          <button
            onClick={handleRunAutoDetection}
            disabled={runningAutoDetect}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-60"
            style={{ background: "rgba(124,58,237,0.15)", color: "#A855F7", border: "1px solid rgba(124,58,237,0.3)" }}
          >
            {runningAutoDetect
              ? <><Loader2 className="h-3 w-3 animate-spin" /> Running…</>
              : <><Wand2 className="h-3 w-3" /> Run auto-detection</>}
          </button>
        </div>
      )}

      {/* Overall progress bar */}
      <div className="mb-6 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-gradient-brand transition-all duration-500"
          style={{ width: `${overallProgress()}%` }}
        />
      </div>

      {/* Document Vault */}
      <div className="mb-6 rounded-2xl border border-border/60 bg-card overflow-hidden">
        <button
          onClick={() => setVaultOpen((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-accent/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-muted shrink-0">
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold">Document Vault</div>
              <div className="text-xs text-muted-foreground">
                {dealDocs.length} document{dealDocs.length !== 1 ? "s" : ""} · {reviews.filter((r: any) => r.verdict === "accepted").length} accepted · {reviews.filter((r: any) => r.verdict === "needs_revision").length} need revision
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); qc.invalidateQueries({ queryKey: ["dd-docs", dealRoomId] }); }}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-1"
            >
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
            {vaultOpen
              ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
              : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </button>

        {vaultOpen && (
          <div className="border-t border-border/60 divide-y divide-border/60">
            {dealDocs.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No documents uploaded yet. Documents uploaded in the Documents tab will appear here for review.
              </div>
            ) : (
              <>
                {vaultCategories.length > 2 && (
                  <div className="flex gap-1 px-4 py-2 border-b border-border/60 overflow-x-auto">
                    {vaultCategories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setVaultFilter(cat)}
                        className={cn(
                          "shrink-0 rounded-full px-3 py-1 text-xs transition-colors",
                          vaultFilter === cat
                            ? "bg-brand text-brand-foreground"
                            : "border border-border/60 hover:bg-accent",
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
                {filteredVaultDocs.map((doc: any) => {
                  const review = getDocReview(doc.id);
                  const docName = nameFromPath(doc);
                  const isDocExpanded = expandedDoc === doc.id;
                  return (
                    <div key={doc.id} className="border-b border-border/60 last:border-0">
                      {/* Clickable header row */}
                      <button
                        onClick={() => setExpandedDoc(isDocExpanded ? null : doc.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors text-left"
                      >
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium truncate">{docName}</span>
                            {doc.category && (
                              <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">
                                {doc.category}
                              </span>
                            )}
                            {review?.verdict && (
                              <span className={cn(
                                "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                                review.verdict === "accepted" && "bg-success/10 text-success",
                                review.verdict === "rejected" && "bg-destructive/10 text-destructive",
                                review.verdict === "needs_revision" && "bg-warning/10 text-warning",
                              )}>
                                {review.verdict === "accepted" ? "✓ Accepted"
                                  : review.verdict === "rejected" ? "✗ Rejected"
                                  : "↻ Needs revision"}
                              </span>
                            )}
                          </div>
                        </div>
                        {isDocExpanded
                          ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                          : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                      </button>

                      {/* Expanded panel */}
                      {isDocExpanded && (
                        <div className="px-4 pb-4 space-y-3 bg-muted/10">
                          {/* AI Summary — show if exists, otherwise nudge but don't block thesis */}
                          {doc.ai_summary ? (
                            <div className="rounded-xl border border-border/60 bg-card p-4">
                              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <Sparkles className="h-3 w-3" /> AI Summary
                              </div>
                              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{doc.ai_summary}</p>
                            </div>
                          ) : isInvestor && (
                            <div className="rounded-lg border border-dashed border-border/60 px-3 py-2.5 text-[11px] text-muted-foreground flex items-center gap-2">
                              <Sparkles className="h-3 w-3 shrink-0" />
                              No AI summary yet — you can still run thesis alignment directly below (AI reads the file).
                            </div>
                          )}

                          {/* Thesis Alignment — investor only, NOT gated on ai_summary */}
                          {isInvestor && (
                            <div className="rounded-xl border border-brand/25 bg-brand/5 p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="text-xs font-semibold text-brand uppercase tracking-wider flex items-center gap-1.5">
                                  <Sparkles className="h-3.5 w-3.5" /> Thesis Alignment
                                </div>
                                <div className="flex items-center gap-2">
                                  {thesisAnalysis[doc.id] && (
                                    <button
                                      onClick={() => setThesisAnalysis((p) => { const n = {...p}; delete n[doc.id]; return n; })}
                                      className="text-[10px] text-muted-foreground hover:text-foreground"
                                    >Re-analyze</button>
                                  )}
                                  {!thesisAnalysis[doc.id] && (
                                    <button
                                      onClick={() => void analyzeAgainstThesis(doc)}
                                      disabled={analyzingDoc === doc.id || !investorProfile?.thesis}
                                      title={!investorProfile?.thesis ? "Add thesis in your Profile first" : ""}
                                      className="inline-flex items-center gap-1.5 rounded-md bg-brand text-brand-foreground px-3 py-1.5 text-xs font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
                                    >
                                      {analyzingDoc === doc.id
                                        ? <><Loader2 className="h-3 w-3 animate-spin" /> Analyzing…</>
                                        : <><Sparkles className="h-3 w-3" /> Analyze against my thesis</>}
                                    </button>
                                  )}
                                </div>
                              </div>
                              {thesisAnalysis[doc.id] ? (
                                <div className="text-sm leading-relaxed space-y-1.5">
                                  {formatThesisText(thesisAnalysis[doc.id])}
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground">
                                  {!investorProfile?.thesis
                                    ? "Add your investment thesis in Profile → then click Analyze."
                                    : doc.ai_summary
                                    ? "Click Analyze to compare this document against your thesis."
                                    : "Click Analyze — AI will read the file directly and compare against your thesis."}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Preview + Download */}
                          <div className="flex gap-2">
                            <button
                              onClick={async () => {
                                const { data } = await supabase.storage
                                  .from("documents")
                                  .createSignedUrl(doc.storage_path, 300);
                                if (!data?.signedUrl) { toast.error("Could not load preview"); return; }
                                const url = data.signedUrl;
                                const ext = (doc.file_name || doc.storage_path || "").split(".").pop()?.toLowerCase() ?? "";
                                const isOffice = ["pptx", "docx", "xlsx", "ppt", "doc", "xls"].includes(ext);
                                if (isOffice) {
                                  window.open(`https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=false`, "_blank");
                                } else {
                                  window.open(url, "_blank");
                                }
                              }}
                              className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-1.5 text-xs hover:bg-accent transition-colors"
                            >
                              <Eye className="h-3.5 w-3.5" /> Preview
                            </button>
                            <button
                              onClick={async () => {
                                const { data } = await supabase.storage
                                  .from("documents")
                                  .createSignedUrl(doc.storage_path, 300);
                                if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                              }}
                              className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-1.5 text-xs hover:bg-accent transition-colors"
                            >
                              <Download className="h-3.5 w-3.5" /> Download
                            </button>
                          </div>

                          {/* Review panel — investor only */}
                          {isInvestor && (
                            <DocumentReviewPanel
                              doc={doc}
                              review={review}
                              dealRoomId={dealRoomId}
                              userId={userId}
                              category={doc.category || "Other"}
                              onReviewed={() => {
                                qc.invalidateQueries({ queryKey: ["doc-reviews", dealRoomId] });
                              }}
                            />
                          )}

                          {/* Founder sees feedback */}
                          {isFounder && review?.feedback && (
                            <div className={cn(
                              "rounded-lg px-3 py-2.5 text-xs",
                              review.verdict === "needs_revision" && "bg-warning/10 text-warning border border-warning/20",
                              review.verdict === "rejected" && "bg-destructive/10 text-destructive border border-destructive/20",
                              review.verdict === "accepted" && "bg-success/10 text-success border border-success/20",
                            )}>
                              <span className="font-medium">Investor feedback: </span>{review.feedback}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* Media & Links */}
                <div className="border-t border-border/60 px-5 py-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Media &amp; Links
                  </div>
                  <div className="space-y-3">
                    {/* Pitch Deck — uploaded file takes priority over URL */}
                    {(() => {
                      const uploadedDeck = dealDocs.find((d: any) =>
                        (d.category === "Pitch Deck") ||
                        /(pitch.?deck|pitch|deck)/i.test(d.file_name || d.storage_path || "")
                      );
                      return (
                        <div className="flex items-start gap-3">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium mb-1.5">Pitch Deck</div>
                            {uploadedDeck ? (
                              <div className="space-y-1.5">
                                <button
                                  onClick={async () => {
                                    const { data } = await supabase.storage
                                      .from("documents")
                                      .createSignedUrl(uploadedDeck.storage_path, 300);
                                    if (!data?.signedUrl) { toast.error("Could not open file"); return; }
                                    const ext = (uploadedDeck.file_name || uploadedDeck.storage_path || "").split(".").pop()?.toLowerCase() ?? "";
                                    const isOffice = ["pptx", "ppt"].includes(ext);
                                    window.open(isOffice ? `https://docs.google.com/gview?url=${encodeURIComponent(data.signedUrl)}&embedded=false` : data.signedUrl, "_blank");
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-md border border-brand/40 bg-brand/5 text-brand px-3 py-1.5 text-xs font-medium hover:bg-brand/15 transition-colors"
                                >
                                  <FileText className="h-3 w-3" />
                                  {uploadedDeck.file_name || uploadedDeck.storage_path?.split("/").pop()?.replace(/^\d{13}-/, "") || "Pitch Deck"} ↗
                                </button>
                                {roomMedia?.pitch_deck_url && (
                                  <a href={roomMedia.pitch_deck_url} target="_blank" rel="noopener noreferrer"
                                    className="text-[10px] text-muted-foreground hover:underline flex items-center gap-1">
                                    <ExternalLink className="h-3 w-3" /> Also: external link
                                  </a>
                                )}
                              </div>
                            ) : isFounder ? (
                              <div className="space-y-1.5">
                                <p className="text-[11px] text-muted-foreground">Upload a PDF/PPTX in Document Vault (category: Pitch Deck), or paste a link below.</p>
                                <input
                                  type="url"
                                  defaultValue={roomMedia?.pitch_deck_url ?? ""}
                                  placeholder="https://docsend.com/view/..."
                                  onBlur={async (e) => {
                                    await supabase.from("deal_rooms")
                                      .update({ pitch_deck_url: e.target.value || null })
                                      .eq("id", dealRoomId);
                                  }}
                                  className="w-full rounded-md border border-border/60 bg-background px-3 py-1.5 text-xs focus:outline-none focus:border-brand/50"
                                />
                              </div>
                            ) : roomMedia?.pitch_deck_url ? (
                              <a href={roomMedia.pitch_deck_url} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-brand hover:underline flex items-center gap-1">
                                <ExternalLink className="h-3 w-3" /> View pitch deck
                              </a>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">No pitch deck uploaded yet</span>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Product video */}
                    <div className="flex items-center gap-3">
                      <Play className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground mb-1">Product Video URL (YouTube/Loom/Vimeo)</div>
                        {isFounder ? (
                          <input
                            type="url"
                            defaultValue={roomMedia?.product_video_url ?? ""}
                            placeholder="https://youtube.com/watch?v=..."
                            onBlur={async (e) => {
                              await supabase.from("deal_rooms")
                                .update({ product_video_url: e.target.value || null })
                                .eq("id", dealRoomId);
                            }}
                            className="w-full rounded-md border border-border/60 bg-background px-3 py-1.5 text-xs focus:outline-none focus:border-brand/50"
                          />
                        ) : roomMedia?.product_video_url ? (
                          <a href={roomMedia.product_video_url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-brand hover:underline flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" /> Watch product video
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Not provided</span>
                        )}
                      </div>
                    </div>

                    {/* Product images */}
                    <div className="flex items-start gap-3">
                      <Image className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground mb-1">Product Images (Google Drive or direct image URLs)</div>
                        {isFounder && (
                          <input
                            type="url"
                            placeholder="Paste URL and press Enter or click away to add…"
                            onBlur={async (e) => {
                              if (!e.target.value.trim()) return;
                              const existing = (roomMedia?.product_images as string[]) ?? [];
                              await supabase.from("deal_rooms")
                                .update({ product_images: [...existing, e.target.value.trim()] })
                                .eq("id", dealRoomId);
                              e.target.value = "";
                              qc.invalidateQueries({ queryKey: ["room-media", dealRoomId] });
                            }}
                            className="w-full rounded-md border border-border/60 bg-background px-3 py-1.5 text-xs focus:outline-none focus:border-brand/50 mb-2"
                          />
                        )}
                        {((roomMedia?.product_images as string[]) ?? []).length > 0 ? (
                          <div className="flex gap-2 flex-wrap">
                            {(roomMedia?.product_images as string[]).map((imgUrl, i) => (
                              <a key={i} href={imgUrl} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-brand hover:underline border border-border/60 rounded px-2 py-1">
                                Image {i + 1} ↗
                              </a>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No images added</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Investor Scorecard — non-AI structured investment analysis ── */}
      {isInvestor && (() => {
        const dims = [
          { key: "team",       label: "Team & Founders",        icon: Users,      desc: "Experience, domain expertise, coachability" },
          { key: "market",     label: "Market Size & Timing",   icon: TrendingUp, desc: "TAM/SAM/SOM, timing, tailwinds" },
          { key: "product",    label: "Product & Tech",         icon: Zap,        desc: "Differentiation, moat, tech risk" },
          { key: "traction",   label: "Traction & Metrics",     icon: BarChart3,  desc: "Revenue, growth, retention, KPIs" },
          { key: "financials", label: "Financials & Use of Funds", icon: DollarSign, desc: "Burn, runway, unit economics" },
          { key: "fit",        label: "Thesis Fit",             icon: Target,     desc: "Stage, sector, check size match" },
        ] as const;
        const scores = Object.values(scorecard);
        const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        const verdict = avg >= 4.2 ? { l: "Strong Pass", c: "text-success bg-success/10 border-success/30" }
          : avg >= 3.5 ? { l: "Lean Pass", c: "text-brand bg-brand/10 border-brand/30" }
          : avg >= 2.8 ? { l: "Watch List", c: "text-warning bg-warning/10 border-warning/30" }
          : avg >= 2 ? { l: "Lean No", c: "text-orange-500 bg-orange-500/10 border-orange-500/30" }
          : scores.length > 0 ? { l: "Pass", c: "text-destructive bg-destructive/10 border-destructive/30" }
          : null;
        return (
          <div className="mb-6 rounded-2xl border border-border/60 bg-card overflow-hidden">
            <button
              onClick={() => setScorecardOpen((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-accent/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand/10 shrink-0">
                  <Star className="h-4 w-4 text-brand" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold">Investment Scorecard</div>
                  <div className="text-xs text-muted-foreground">Rate this startup across 6 VC dimensions</div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {scores.length > 0 && verdict && (
                  <span className={cn("text-xs font-bold px-2.5 py-1 rounded-lg border", verdict.c)}>
                    {avg.toFixed(1)}/5 · {verdict.l}
                  </span>
                )}
                {scorecardOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </button>
            {scorecardOpen && (
              <div className="border-t border-border/60 px-5 py-4 space-y-4">
                <div className="grid gap-3">
                  {dims.map(({ key, label, icon: Icon, desc }) => (
                    <div key={key} className="flex items-center gap-3">
                      <div className="w-44 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-xs font-medium">{label}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground leading-tight mt-0.5 pl-5">{desc}</div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-1">
                        {[1,2,3,4,5].map((s) => (
                          <button
                            key={s}
                            onClick={() => setScorecard((p) => ({ ...p, [key]: s }))}
                            className={cn(
                              "h-8 w-8 rounded-md text-xs font-bold transition-all border",
                              (scorecard[key] ?? 0) >= s
                                ? s >= 4 ? "bg-success text-success-foreground border-success"
                                  : s === 3 ? "bg-brand text-brand-foreground border-brand"
                                  : "bg-warning text-warning-foreground border-warning"
                                : "border-border/60 text-muted-foreground hover:border-brand/50 hover:text-brand"
                            )}
                          >{s}</button>
                        ))}
                        {scorecard[key] && (
                          <span className="text-[10px] text-muted-foreground ml-1">
                            {["","Poor","Below avg","Average","Strong","Exceptional"][scorecard[key]]}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {scores.length >= 3 && verdict && (
                  <div className={cn("rounded-xl border p-4 flex items-center justify-between", verdict.c)}>
                    <div>
                      <div className="text-xs opacity-70 mb-0.5">Overall verdict · {scores.length}/6 scored</div>
                      <div className="text-xl font-bold">{verdict.l}</div>
                      <div className="text-xs opacity-70 mt-0.5">Average: {avg.toFixed(1)} / 5</div>
                    </div>
                    <button onClick={() => setScorecard({})} className="text-[11px] opacity-60 hover:opacity-100">Reset</button>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                  Score each dimension 1–5 based on your review. Local to this session — copy to your CRM notes.
                </p>
              </div>
            )}
          </div>
        );
      })()}

      {/* Category accordion */}
      <div className="space-y-3">
        {CATEGORIES.map((cat) => {
          const catData = getCatData(cat);
          const items = getCatItems(cat);
          const progress = getProgress(cat);
          const isExpanded = expandedCat === cat;
          const status = (catData.status as DDStatus) ?? "Pending";
          const cfg = STATUS_CONFIG[status];
          const StatusIcon = cfg.icon;
          const { icon: CatIcon, color, description } = CAT_CONFIG[cat];
          const isEditingNote = editingNotes === cat;

          return (
            <div key={cat} className="rounded-2xl border border-border/60 bg-card overflow-hidden">
              <button
                onClick={() => setExpandedCat(isExpanded ? null : cat)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-accent/40 transition-colors text-left"
              >
                <div className={cn("grid h-9 w-9 place-items-center rounded-xl bg-muted shrink-0", color)}>
                  <CatIcon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{cat}</span>
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium", cfg.cls)}>
                      <StatusIcon className="h-3 w-3" />{cfg.label}
                    </span>
                    {catData.investor_notes && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                        <StickyNote className="h-3 w-3" /> Feedback
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center gap-3">
                    <div className="flex-1 max-w-[160px] h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-gradient-brand transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {items.filter((i: any) => i.checked).length}/{items.length}
                    </span>
                  </div>
                </div>
                {isExpanded
                  ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                  : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
              </button>

              {isExpanded && (
                <div className="border-t border-border/60">
                  <div className="px-5 py-2 bg-muted/20">
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>


                  <div className="grid lg:grid-cols-[1fr_260px] divide-y lg:divide-y-0 lg:divide-x divide-border/60">
                    {/* Checklist */}
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Checklist</div>
                        {!isFounder && (
                          <button
                            onClick={() => { setAddingItem(cat); setNewItemLabel(""); }}
                            className="inline-flex items-center gap-1 text-[10px] text-brand hover:underline"
                          >
                            <Plus className="h-3 w-3" /> Add item
                          </button>
                        )}
                      </div>

                      {addingItem === cat && (
                        <div className="flex gap-2 mb-3">
                          <input
                            value={newItemLabel}
                            onChange={(e) => setNewItemLabel(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && addItem(cat)}
                            placeholder="New checklist item…"
                            autoFocus
                            className="flex-1 rounded-md border border-border/60 bg-background px-2 py-1 text-xs focus:outline-none focus:border-brand/50"
                          />
                          <button onClick={() => addItem(cat)}
                            className="rounded-md bg-gradient-brand text-brand-foreground px-2 py-1 text-xs shadow-glow">
                            Add
                          </button>
                          <button onClick={() => setAddingItem(null)}
                            className="text-muted-foreground hover:text-foreground text-xs px-1">
                            ✕
                          </button>
                        </div>
                      )}

                      {items.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No items yet.</p>
                      ) : (
                        <div className="space-y-1">
                          {items.map((item: any) => {
                            const isAutoDetected = !!item.auto_detected && !item.manually_overridden;
                            return (
                              <button
                                key={item.id}
                                onClick={isFounder ? undefined : () => toggleItem(item.id, !item.checked, isAutoDetected)}
                                className={cn("w-full flex items-start gap-3 rounded-lg px-3 py-2.5 text-left group transition-colors", isFounder ? "cursor-default" : "hover:bg-accent/50")}
                              >
                                {item.checked
                                  ? <CheckCircle2 className={cn("h-4 w-4 shrink-0 mt-0.5", isAutoDetected ? "text-emerald-400" : "text-success")} />
                                  : <Circle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 group-hover:text-foreground" />}
                                <span className="flex-1 min-w-0">
                                  <span className={cn("text-sm", item.checked ? "line-through text-muted-foreground" : "")}>
                                    {item.label}
                                  </span>
                                  {isAutoDetected && item.auto_source_label && (
                                    <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
                                      style={{ background: "rgba(16,185,129,0.12)", color: "#10B981" }}>
                                      <Wand2 className="h-2.5 w-2.5" />
                                      {item.auto_source_label}
                                    </span>
                                  )}
                                  {item.manually_overridden && item.auto_detected && (
                                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
                                      style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>
                                      overridden
                                    </span>
                                  )}
                                </span>
                                {isInvestor && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); void deleteItem(item.id); }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto text-muted-foreground hover:text-destructive shrink-0 mt-0.5"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Status + Feedback */}
                    <div className="p-5 space-y-5">
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Status</div>
                        {isFounder ? (
                          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium", cfg.cls)}>
                            <StatusIcon className="h-3.5 w-3.5" />{cfg.label}
                          </span>
                        ) : (
                          <div className="grid grid-cols-2 gap-1.5">
                            {STATUSES.map((s) => {
                              const scfg = STATUS_CONFIG[s];
                              const SIcon = scfg.icon;
                              return (
                                <button
                                  key={s}
                                  onClick={() => updateStatus(cat, s)}
                                  className={cn(
                                    "flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition-all",
                                    status === s ? cn(scfg.cls, "border-current") : "border-border/60 text-muted-foreground hover:bg-accent",
                                  )}
                                >
                                  <SIcon className="h-3.5 w-3.5 shrink-0" />{s}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Feedback</div>
                          {!isEditingNote && !isFounder && (
                            <button
                              onClick={() => { setEditingNotes(cat); setNoteDraft(catData.investor_notes ?? ""); }}
                              className="inline-flex items-center gap-1 text-[10px] text-brand hover:underline"
                            >
                              <StickyNote className="h-3 w-3" />
                              {catData.investor_notes ? "Edit feedback" : "Add feedback"}
                            </button>
                          )}
                        </div>
                        {isEditingNote ? (
                          <div className="space-y-2">
                            <textarea
                              value={noteDraft}
                              onChange={(e) => setNoteDraft(e.target.value)}
                              rows={4}
                              placeholder="Internal feedback for this category…"
                              className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:border-brand/50"
                            />
                            <div className="flex gap-2">
                              <button onClick={() => setEditingNotes(null)}
                                className="flex-1 rounded-md border border-border/60 py-1.5 text-xs hover:bg-accent">
                                Cancel
                              </button>
                              <button onClick={() => saveFeedback(cat)}
                                className="flex-1 inline-flex items-center justify-center gap-1 rounded-md bg-gradient-brand text-brand-foreground py-1.5 text-xs shadow-glow">
                                <Save className="h-3 w-3" /> Save
                              </button>
                            </div>
                          </div>
                        ) : catData.investor_notes ? (
                          <div className="rounded-lg bg-muted/40 border border-border/40 px-3 py-2.5 text-xs text-muted-foreground whitespace-pre-wrap">
                            {catData.investor_notes}
                          </div>
                        ) : (
                          <div className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-center">
                            <FileText className="h-4 w-4 text-muted-foreground/40 mx-auto mb-1" />
                            <p className="text-xs text-muted-foreground/60">No feedback yet</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Document review panel (investors only) ────────────────────────
function DocumentReviewPanel({ doc, review, dealRoomId, userId, category, onReviewed }: {
  doc: any;
  review: any;
  dealRoomId: string;
  userId: string | undefined;
  category: string;
  onReviewed: () => void;
}) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState(review?.feedback ?? "");
  const [saving, setSaving] = useState(false);

  const submitReview = async (verdict: string) => {
    if (!userId) return;
    setSaving(true);
    try {
      await supabase.from("document_reviews").upsert({
        document_id: doc.id,
        deal_room_id: dealRoomId,
        reviewer_id: userId,
        category,
        verdict,
        feedback: feedback.trim() || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "document_id,reviewer_id" });
      onReviewed();
      setShowFeedback(false);
      toast.success(
        verdict === "accepted" ? "Document accepted"
          : verdict === "rejected" ? "Document rejected"
          : "Document flagged for revision"
      );
    } catch {
      toast.error("Failed to save review");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-t border-border/60 px-4 py-3 bg-muted/20">
      {!showFeedback ? (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground mr-1">Review:</span>
          <button
            onClick={() => submitReview("accepted")}
            disabled={saving}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              review?.verdict === "accepted"
                ? "bg-success text-success-foreground"
                : "border border-success/40 text-success hover:bg-success/10",
            )}
          >
            <CheckCircle2 className="h-3 w-3" /> Accept
          </button>
          <button
            onClick={() => setShowFeedback(true)}
            disabled={saving}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              review?.verdict === "needs_revision"
                ? "bg-warning text-warning-foreground"
                : "border border-warning/40 text-warning hover:bg-warning/10",
            )}
          >
            <StickyNote className="h-3 w-3" /> Needs revision
          </button>
          <button
            onClick={() => setShowFeedback(true)}
            disabled={saving}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              review?.verdict === "rejected"
                ? "bg-destructive text-destructive-foreground"
                : "border border-destructive/40 text-destructive hover:bg-destructive/10",
            )}
          >
            <Flag className="h-3 w-3" /> Reject
          </button>
          {review?.feedback && (
            <span className="text-[10px] text-muted-foreground italic ml-1">
              "{review.feedback.slice(0, 40)}{review.feedback.length > 40 ? "…" : ""}"
            </span>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Add feedback for the founder (what needs to change, what's missing…)"
            rows={2}
            autoFocus
            className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-xs resize-none focus:outline-none focus:border-brand/50"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowFeedback(false)}
              className="rounded-md border border-border/60 px-2.5 py-1 text-xs hover:bg-accent"
            >
              Cancel
            </button>
            <button
              onClick={() => submitReview("needs_revision")}
              disabled={saving}
              className="rounded-md border border-warning/40 text-warning px-2.5 py-1 text-xs hover:bg-warning/10 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin inline" /> : "Flag for revision"}
            </button>
            <button
              onClick={() => submitReview("rejected")}
              disabled={saving}
              className="rounded-md border border-destructive/40 text-destructive px-2.5 py-1 text-xs hover:bg-destructive/10 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin inline" /> : "Reject"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}