import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  CheckCircle2, Circle, ChevronDown, ChevronUp, Flag, Clock, Eye,
  StickyNote, Save, Loader2, FileText, Plus, Sparkles, Trash2, Download, RefreshCw,
  BarChart3, TrendingUp, Users, Scale, Target, Handshake, Play, Image, ExternalLink,
} from "lucide-react";

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
          .select("id, category, label, checked")
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

  const toggleItem = async (itemId: string, checked: boolean) => {
    qc.setQueryData(["dd-workstation", dealRoomId], (old: any) => ({
      ...old,
      items: old?.items?.map((i: any) => i.id === itemId ? { ...i, checked } : i),
    }));
    const { error } = await supabase
      .from("dd_checklist_items")
      .update({ checked })
      .eq("id", itemId);
    if (error) {
      toast.error("Failed to update");
      qc.invalidateQueries({ queryKey: ["dd-workstation", dealRoomId] });
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
    if (!investorProfile || !doc.ai_summary) return;
    setAnalyzingDoc(doc.id);
    try {
      const openAIKey = (import.meta.env as any).VITE_OPENAI_API_KEY || "";
      const thesis = [
        investorProfile.thesis && `Thesis: ${investorProfile.thesis}`,
        investorProfile.sectors && `Sectors: ${investorProfile.sectors}`,
        investorProfile.stages && `Stages: ${investorProfile.stages}`,
        investorProfile.check_size_min && `Check size: ${investorProfile.check_size_min} - ${investorProfile.check_size_max}`,
        investorProfile.red_flags && `Red flags (won't invest in): ${investorProfile.red_flags}`,
        investorProfile.key_metrics && `Key metrics I look for: ${investorProfile.key_metrics}`,
      ].filter(Boolean).join("\n");

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openAIKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 200,
          messages: [
            {
              role: "system",
              content: "You are a VC analyst. Given an investor's thesis and a document summary, provide a brief thesis alignment analysis. Use ✅ for matches, ⚠️ for concerns, ❌ for red flags. Be specific and concise. Max 5 bullet points.",
            },
            {
              role: "user",
              content: `INVESTOR THESIS:\n${thesis}\n\nDOCUMENT SUMMARY:\n${doc.ai_summary}\n\nAnalyze alignment:`,
            },
          ],
        }),
      });
      const result = await response.json();
      const analysis = result.choices?.[0]?.message?.content || "Could not analyze";
      setThesisAnalysis((prev) => ({ ...prev, [doc.id]: analysis }));
    } catch {
      setThesisAnalysis((prev) => ({ ...prev, [doc.id]: "Analysis failed" }));
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
                        <div className="px-4 pb-4 space-y-4 bg-muted/10">
                          {/* AI Summary */}
                          {doc.ai_summary ? (
                            <div className="rounded-xl border border-border/60 bg-card p-4">
                              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <Sparkles className="h-3 w-3" /> AI Summary
                              </div>
                              <p className="text-sm text-foreground/90 leading-relaxed">{doc.ai_summary}</p>
                            </div>
                          ) : (
                            <div className="rounded-xl border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                              No AI summary yet. Generate one from the Documents tab.
                            </div>
                          )}

                          {/* Thesis alignment — investor only */}
                          {isInvestor && investorProfile && (
                            <div className="rounded-xl border border-border/60 bg-card p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                  Thesis Alignment
                                </div>
                                {doc.ai_summary && !thesisAnalysis[doc.id] && (
                                  <button
                                    onClick={() => void analyzeAgainstThesis(doc)}
                                    disabled={analyzingDoc === doc.id}
                                    className="inline-flex items-center gap-1 text-[10px] text-brand hover:underline disabled:opacity-50"
                                  >
                                    {analyzingDoc === doc.id
                                      ? <><Loader2 className="h-3 w-3 animate-spin" /> Analyzing…</>
                                      : <><Sparkles className="h-3 w-3" /> Analyze against my thesis</>}
                                  </button>
                                )}
                              </div>
                              {thesisAnalysis[doc.id] ? (
                                <div className="text-sm whitespace-pre-wrap leading-relaxed">
                                  {thesisAnalysis[doc.id]}
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground">
                                  {!doc.ai_summary
                                    ? "Generate an AI summary first, then analyze thesis alignment."
                                    : !investorProfile.thesis
                                    ? "Add your investment thesis in your Profile to enable alignment analysis."
                                    : "Click 'Analyze against my thesis' to see how this document aligns with your investment criteria."}
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
                    {/* Pitch deck */}
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground mb-1">Pitch Deck URL</div>
                        {isFounder ? (
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
                        ) : roomMedia?.pitch_deck_url ? (
                          <a href={roomMedia.pitch_deck_url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-brand hover:underline flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" /> View pitch deck
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Not provided</span>
                        )}
                      </div>
                    </div>

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
                          {items.map((item: any) => (
                            <button
                              key={item.id}
                              onClick={isFounder ? undefined : () => toggleItem(item.id, !item.checked)}
                              className={cn("w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left group transition-colors", isFounder ? "cursor-default" : "hover:bg-accent/50")}
                            >
                              {item.checked
                                ? <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                                : <Circle className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-foreground" />}
                              <span className={cn("text-sm flex-1", item.checked ? "line-through text-muted-foreground" : "")}>
                                {item.label}
                              </span>
                              {isInvestor && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); void deleteItem(item.id); }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto text-muted-foreground hover:text-destructive shrink-0"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </button>
                          ))}
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
