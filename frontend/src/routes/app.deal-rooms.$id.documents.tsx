import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FileText, Image, Film, Plus, X, Loader2, Eye, Download, Trash2, Sparkles,
  ChevronUp, ChevronDown, Upload, Link as LinkIcon, ExternalLink, Shield, CheckCircle2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Dropzone } from "@/components/app/Dropzone";
import { Stage2Gate } from "@/components/app/DealRoomWorkflow";
import { generateDocSummary } from "@/lib/ai-secure-fn";
import { extractDocumentText } from "@/lib/document-extractor";
import { withTimeout, AITimeoutError } from "@/lib/with-timeout";
import { AI_TIMEOUT_MESSAGE } from "@/hooks/useTimedAI";
import { triggerDocumentUploadedEmail } from "@/lib/email/triggers";
import { useGeneratedNdaDocs } from "@/lib/store";
import { EmptyState } from "@/components/system";
import { useDealRoom } from "@/hooks/useDealRoom";

export const Route = createFileRoute("/app/deal-rooms/$id/documents")({
  component: DocumentsPage,
});

const ALLOWED_UPLOAD_EXTENSIONS = new Set(["pdf", "pptx", "ppt", "xlsx", "xls", "docx", "doc", "csv", "png", "jpg", "jpeg"]);
const MAX_UPLOAD_SIZE = 50 * 1024 * 1024;

const CATEGORY_COLORS: Record<string, string> = {
  "Pitch Deck": "bg-accent text-brand",
  "Financials": "bg-success/10 text-success",
  "Legal": "bg-violet/10 text-violet",
  "Market Research": "bg-warning/10 text-warning",
  "Team": "bg-accent text-brand",
  "Product": "bg-violet/10 text-violet",
  "Other": "bg-accent text-gray-500",
};

const TEXT_EXTS = new Set(["pdf", "docx", "doc", "xlsx", "xls", "csv", "pptx", "ppt", "txt"]);

function getFileTypeStyle(ext: string): { bg: string; color: string; Icon: any } {
  if (ext === "pdf") return { bg: "bg-red-500/10", color: "text-red-500", Icon: FileText };
  if (["docx", "doc"].includes(ext)) return { bg: "bg-blue-500/10", color: "text-blue-500", Icon: FileText };
  if (["xlsx", "xls", "csv"].includes(ext)) return { bg: "bg-green-500/10", color: "text-green-500", Icon: FileText };
  if (["pptx", "ppt"].includes(ext)) return { bg: "bg-orange-500/10", color: "text-orange-500", Icon: FileText };
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return { bg: "bg-accent", color: "text-purple-500", Icon: Image };
  if (["mp4", "mov", "avi", "webm"].includes(ext)) return { bg: "bg-orange-500/10", color: "text-orange-500", Icon: Film };
  return { bg: "bg-accent", color: "text-gray-500", Icon: FileText };
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const CAT_BORDER: Record<string, string> = {
  "Pitch Deck": "border-l-purple-500",
  "Financials": "border-l-green-500",
  "Legal": "border-l-red-500",
  "Market Research": "border-l-violet-500",
  "Team": "border-l-blue-500",
  "Product": "border-l-orange-500",
  "Other": "border-l-muted-foreground/40",
};

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function DocPreviewModal({ doc, onClose }: { doc: any; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const rawName = doc.name || doc.storage_path?.split("/").pop() || "Document";
  const displayName = rawName.replace(/^\d{13}-/, "");
  const ext = displayName.split(".").pop()?.toLowerCase() ?? "";
  const isImage = ["png", "jpg", "jpeg", "gif", "webp"].includes(ext);
  const isPdf = ext === "pdf";
  const isOffice = ["pptx", "docx", "xlsx", "ppt", "doc", "xls"].includes(ext);

  useEffect(() => {
    supabase.storage.from("documents").createSignedUrl(doc.storage_path, 300).then(({ data }) => {
      if (data?.signedUrl) setUrl(data.signedUrl);
    });
  }, [doc.storage_path]);

  return (
    <div
      className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm grid place-items-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl rounded-2xl border border-[rgba(0,0,0,0.08)] bg-card shadow-elev overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(0,0,0,0.08)]">
          <div className="text-sm font-semibold truncate">{displayName}</div>
          <button
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-md text-gray-500 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6">
          {!url ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            </div>
          ) : isImage ? (
            <img src={url} alt={displayName} className="max-w-full max-h-[60vh] object-contain mx-auto rounded-lg" />
          ) : isPdf ? (
            <iframe
              src={url}
              className="w-full h-[70vh] rounded-lg border border-[rgba(0,0,0,0.08)]"
              title={displayName}
            />
          ) : isOffice ? (
            <iframe
              src={`https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`}
              className="w-full h-[70vh] rounded-lg border border-[rgba(0,0,0,0.08)]"
              title={displayName}
            />
          ) : (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-accent">
                <FileText className="h-8 w-8 text-gray-500" />
              </div>
              <p className="text-sm text-gray-500">Preview not available for this file type.</p>
              <a
                href={url}
                download={displayName}
                className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-4 py-2 text-sm"
              >
                <Download className="h-4 w-4" /> Download to view
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DocumentsPage() {
  const { dealRoomId, isFounder, isInvestor, userId, startupId } = useDealRoom();
  const queryClient = useQueryClient();
  const [showLibrary, setShowLibrary] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<any | null>(null);
  const [activeVaultTab, setActiveVaultTab] = useState<"documents" | "links">("documents");
  const [showAddLink, setShowAddLink] = useState(false);
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [addingLink, setAddingLink] = useState(false);
  const [addingFromLib, setAddingFromLib] = useState<string | null>(null);
  const pendingDeletes = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [generatingSummaryId, setGeneratingSummaryId] = useState<string | null>(null);
  const [editingSummaryId, setEditingSummaryId] = useState<string | null>(null);
  const [summaryEdits, setSummaryEdits] = useState<Record<string, string>>({});
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const summaryExpandedRef = useRef<Record<string, boolean>>({});
  const [summaryExpandedTick, setSummaryExpandedTick] = useState(0);
  const [activeDocTab, setActiveDocTab] = useState("All");
  const isSummaryExpanded = (docId: string) => summaryExpandedRef.current[docId] ?? false;
  const toggleSummary = (docId: string) => {
    summaryExpandedRef.current[docId] = !summaryExpandedRef.current[docId];
    setSummaryExpandedTick((t) => t + 1);
  };
  const expandSummary = (docId: string) => {
    summaryExpandedRef.current[docId] = true;
    setSummaryExpandedTick((t) => t + 1);
  };

  async function trackDocumentView(params: {
    documentId?: string;
    founderDocumentId?: string;
  }) {
    if (!isInvestor) return;
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      const { data: profile } = await supabase
        .from("investor_profiles")
        .select("your_name, fund_name")
        .eq("user_id", authUser.id)
        .maybeSingle();
      const viewerName = profile?.your_name ?? profile?.fund_name ?? "Investor";
      const { error } = await supabase.from("document_views").insert({
        document_id: params.documentId ?? null,
        founder_document_id: params.founderDocumentId ?? null,
        deal_room_id: dealRoomId,
        startup_id: startupId,
        viewer_id: authUser.id,
        viewer_role: "investor",
        viewer_name: viewerName,
      });
      if (error) console.error("[trackDocumentView] insert failed:", error);
    } catch (e) {
      console.error("[trackDocumentView]", e);
    }
  }

  const { data: docs = [] } = useQuery({
    queryKey: ["documents", dealRoomId],
    enabled: !!userId,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*, uploader:users!uploader_id(full_name)")
        .eq("deal_room_id", dealRoomId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: libraryDocs = [], isLoading: libLoading } = useQuery({
    queryKey: ["library-docs", userId],
    enabled: showLibrary && !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("documents")
        .select("*")
        .eq("uploader_id", userId!)
        .neq("deal_room_id", dealRoomId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: dealRoomLinks = [] } = useQuery({
    queryKey: ["deal-room-links", dealRoomId],
    enabled: !!dealRoomId,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_room_links")
        .select("*, users(full_name)")
        .eq("deal_room_id", dealRoomId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: investorDocs = [] } = useQuery({
    queryKey: ["investor-documents", dealRoomId, userId],
    enabled: !!userId && !!dealRoomId,
    staleTime: 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("documents")
        .select("*, uploader:uploader_id(full_name, avatar_url)")
        .eq("deal_room_id", dealRoomId)
        .eq("uploaded_by_role", "investor")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: platformDocs = [] } = useQuery({
    queryKey: ["platform-docs", startupId],
    enabled: !!startupId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("founder_documents")
        .select(`id, template_slug, title, status, content, completeness_score, ai_feedback, visibility, updated_at, document_templates ( name, category )`)
        .eq("startup_id", startupId!)
        .eq("visibility", "deal_room")
        .in("status", ["complete", "ai_extracted", "needs_review"])
        .order("updated_at", { ascending: false });
      if (error) console.error("[platform-docs] error:", error);
      return data ?? [];
    },
  });

  const { data: drStageData } = useQuery({
    queryKey: ["dr-stage-gate", dealRoomId],
    enabled: !!dealRoomId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_rooms")
        .select("workflow_stage, stage2_unlocked")
        .eq("id", dealRoomId)
        .maybeSingle();
      return data ?? null;
    },
  });
  const stage2Unlocked = drStageData?.stage2_unlocked ?? false;

  const platformDocsSplit = isInvestor
    ? {
        stage1: (platformDocs as any[]).filter((d) => !d.deal_room_stage || d.deal_room_stage === 1),
        stage2: (platformDocs as any[]).filter((d) => d.deal_room_stage === 2),
      }
    : { stage1: platformDocs as any[], stage2: [] };

  const visibleInvestorDocs = isFounder
    ? (investorDocs as any[]).filter((d) => d.visibility !== "private")
    : investorDocs;

  const [investorDocVisibility, setInvestorDocVisibility] = useState<Record<string, "shared" | "private">>({});

  const updateDocVisibility = async (docId: string, visibility: "shared" | "private") => {
    setInvestorDocVisibility((prev) => ({ ...prev, [docId]: visibility }));
    const { error } = await supabase.from("documents").update({ visibility }).eq("id", docId);
    if (error) { console.error("[docs] visibility update failed:", error); toast.error("Could not change document visibility."); return; }
    queryClient.invalidateQueries({ queryKey: ["investor-documents", dealRoomId, userId] });
  };

  const removeInvestorDoc = async (docId: string) => {
    const { error } = await supabase.from("documents").update({ deal_room_id: null }).eq("id", docId);
    if (error) { console.error("[docs] remove failed:", error); toast.error("Could not remove document."); return; }
    queryClient.invalidateQueries({ queryKey: ["investor-documents", dealRoomId, userId] });
    toast.success("Document removed");
  };

  const addLink = async () => {
    if (!linkName.trim() || !linkUrl.trim() || !userId) return;
    setAddingLink(true);
    const url = linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`;
    const { error } = await supabase.from("deal_room_links").insert({
      deal_room_id: dealRoomId,
      uploader_id: userId,
      name: linkName.trim(),
      url,
      visibility: "shared",
    });
    if (error) { console.error("[links] add failed:", error); toast.error("Could not add link."); setAddingLink(false); return; }
    queryClient.invalidateQueries({ queryKey: ["deal-room-links", dealRoomId] });
    setLinkName(""); setLinkUrl(""); setShowAddLink(false); setAddingLink(false);
    toast.success("Link added");
  };

  const removeLink = async (linkId: string) => {
    const { error } = await supabase.from("deal_room_links").delete().eq("id", linkId);
    if (error) { console.error("[links] remove failed:", error); toast.error("Could not remove link."); return; }
    queryClient.invalidateQueries({ queryKey: ["deal-room-links", dealRoomId] });
    toast.success("Link removed");
  };

  const ndaDocs = useGeneratedNdaDocs().filter((d) => d.dealRoomId === dealRoomId);

  const handleDownload = async (storagePath: string) => {
    const { data } = await supabase.storage.from("documents").createSignedUrl(storagePath, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const handleDocRemove = (doc: any) => {
    queryClient.setQueryData(["documents", dealRoomId], (old: any[]) =>
      (old ?? []).filter((d) => d.id !== doc.id)
    );
    const rawName = doc.name || doc.storage_path?.split("/").pop() || "Document";
    const displayName = rawName.replace(/^\d{13}-/, "");
    let toastId: string | number;
    const timer = setTimeout(async () => {
      const { error } = await supabase.from("documents").update({ deal_room_id: null }).eq("id", doc.id);
      if (error) { console.error("[docs] deferred remove failed:", error); toast.error(`Could not remove "${displayName}".`); }
      queryClient.invalidateQueries({ queryKey: ["documents", dealRoomId] });
    }, 5000);
    toastId = toast(`"${displayName}" removed`, {
      action: {
        label: "Undo",
        onClick: () => {
          clearTimeout(timer);
          queryClient.invalidateQueries({ queryKey: ["documents", dealRoomId] });
          toast.dismiss(toastId);
        },
      },
      duration: 5000,
    });
  };

  const addFromLibrary = async (docId: string) => {
    setAddingFromLib(docId);
    const { error } = await supabase.from("documents").update({ deal_room_id: dealRoomId }).eq("id", docId);
    if (error) { console.error("[docs] add from library failed:", error); toast.error("Could not add document."); setAddingFromLib(null); return; }
    await queryClient.invalidateQueries({ queryKey: ["documents", dealRoomId] });
    await queryClient.invalidateQueries({ queryKey: ["library-docs", userId] });
    setAddingFromLib(null);
    toast.success("Document added to deal room");
    setShowLibrary(false);
  };

  const generateSummary = async (doc: any) => {
    setGeneratingSummaryId(doc.id);
    try {
      const { data: signedData, error: signedError } = await supabase.storage
        .from("documents")
        .createSignedUrl(doc.storage_path, 60);
      if (signedError || !signedData?.signedUrl) {
        toast.error("Could not access file");
        return;
      }

      const response = await fetch(signedData.signedUrl);
      if (!response.ok) {
        toast.error("File download failed");
        return;
      }

      const arrayBuffer = await response.arrayBuffer();
      const fileName = doc.file_name ||
        doc.storage_path?.split("/").pop()?.replace(/^\d{13}-/, "") || "";

      const textContent = await extractDocumentText(arrayBuffer, fileName);

      if (!textContent || textContent.length < 30) {
        const honestMessage = `Could not extract readable text from this file.\n\nTo review: Click Preview or Download to open locally.`;
        const { error: msgErr } = await supabase.from("documents").update({ ai_summary: honestMessage }).eq("id", doc.id);
        if (msgErr) console.error("[docs] ai_summary placeholder save failed:", msgErr);
        queryClient.setQueryData(["documents", dealRoomId], (old: any[]) =>
          (old ?? []).map((d: any) => d.id === doc.id ? { ...d, ai_summary: honestMessage } : d)
        );
        queryClient.invalidateQueries({ queryKey: ["dd-docs", dealRoomId] });
        queryClient.invalidateQueries({ queryKey: ["documents", dealRoomId] });
        expandSummary(doc.id);
        toast.success("Document processed");
        return;
      }

      const aiData = await withTimeout(generateDocSummary({
        data: {
          userId: userId || "",
          documentContent: textContent.slice(0, 3000),
          fileName,
          category: doc.category,
        }
      }));
      if (aiData.error === "usage_limit") {
        toast.error(aiData.reply || "Daily AI limit reached");
        return;
      }
      const summary = aiData.reply || "";
      if (!summary) {
        toast.error("AI returned empty response — check Cloudflare logs");
        return;
      }

      const { error: sumErr } = await supabase.from("documents").update({ ai_summary: summary }).eq("id", doc.id);
      if (sumErr) throw sumErr;
      queryClient.setQueryData(["documents", dealRoomId], (old: any[]) =>
        (old ?? []).map((d: any) => d.id === doc.id ? { ...d, ai_summary: summary } : d)
      );
      queryClient.invalidateQueries({ queryKey: ["dd-docs", dealRoomId] });
      expandSummary(doc.id);
      toast.success("Summary generated");
    } catch (err) {
      console.error("Summary error:", err);
      toast.error(err instanceof AITimeoutError ? AI_TIMEOUT_MESSAGE : (err instanceof Error ? err.message : "Summary failed"));
    } finally {
      setGeneratingSummaryId(null);
    }
  };

  const DOC_CATEGORIES = ["All", "Pitch Deck", "Financials", "Legal", "Market Research", "Team", "Product", "Other"] as const;

  const DEAL_ROOM_EXPECTED_DOCS = [
    { category: "Pitch Deck", name: "Pitch Deck (PDF or PPTX)" },
    { category: "Pitch Deck", name: "Executive Summary / One-pager" },
    { category: "Financials", name: "Last 3 years P&L" },
    { category: "Financials", name: "Revenue projections (3 years)" },
    { category: "Financials", name: "Cap table" },
    { category: "Legal", name: "Certificate of incorporation" },
    { category: "Legal", name: "Shareholder agreement" },
    { category: "Team", name: "Founder CVs / LinkedIn" },
    { category: "Product", name: "Product roadmap" },
    { category: "Market Research", name: "TAM/SAM/SOM analysis" },
  ];

  const pitchDeckDoc = (docs as any[]).find((d) =>
    d.category === "Pitch Deck" || /(pitch.?deck|pitch|deck)/i.test(d.file_name || d.storage_path || "")
  );
  const filteredDocs = activeDocTab === "All"
    ? [
        ...(pitchDeckDoc ? [pitchDeckDoc] : []),
        ...(docs as any[]).filter((d) => d.id !== pitchDeckDoc?.id),
      ]
    : (docs as any[]).filter((d: any) => (d.category || "Other") === activeDocTab);

  const expectedForTab = activeDocTab !== "All"
    ? DEAL_ROOM_EXPECTED_DOCS.filter((e) => e.category === activeDocTab)
    : [];

  const catCounts = (docs as any[]).reduce((acc: Record<string, number>, d) => {
    const cat = d.category || "Other";
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-xl bg-gray-100/50 p-1">
          <button
            onClick={() => setActiveVaultTab("documents")}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
              activeVaultTab === "documents" ? "hs-gradient text-brand-foreground shadow-sm" : "text-gray-500 hover:text-foreground"
            )}
          >
            📁 Documents
            <span className="ml-1.5 text-[10px] text-gray-500">({(docs as any[]).length})</span>
          </button>
          <button
            onClick={() => setActiveVaultTab("links")}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
              activeVaultTab === "links" ? "hs-gradient text-brand-foreground shadow-sm" : "text-gray-500 hover:text-foreground"
            )}
          >
            🔗 Links
            <span className="ml-1.5 text-[10px] text-gray-500">({(dealRoomLinks as any[]).length})</span>
          </button>
        </div>
        <div className="flex gap-2">
          {activeVaultTab === "documents" && isFounder && (
            <button
              onClick={() => setShowLibrary(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-brand/40 bg-accent text-brand px-3 py-1.5 text-sm hover:bg-accent"
            >
              <Plus className="h-4 w-4" /> Add from library
            </button>
          )}
          {activeVaultTab === "links" && (
            <button
              onClick={() => setShowAddLink(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-sm shadow-glow"
            >
              <Plus className="h-4 w-4" /> Add link
            </button>
          )}
        </div>
      </div>

      {activeVaultTab === "documents" && (<>

      {(platformDocs as any[]).length > 0 && (
        <div className="mt-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-foreground">Platform Documents</h3>
            <span className="text-xs bg-accent text-brand px-2 py-0.5 rounded-full">
              {(platformDocs as any[]).length} structured
            </span>
          </div>
          {isInvestor && <Stage2Gate stage2Unlocked={stage2Unlocked} />}
          {isInvestor && platformDocsSplit.stage1.length > 0 && (
            <div className="mb-2">
              <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 font-semibold">Stage 1 — Initial review</div>
              <div className="space-y-2">
                {platformDocsSplit.stage1.map((doc: any) => (
                  <div key={doc.id}
                    className="flex items-center justify-between p-4 rounded-none border border-border bg-white/[0.02] hover:bg-accent transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-brand text-sm shrink-0">≡</div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {doc.document_templates?.category
                            ? doc.document_templates.category.charAt(0).toUpperCase() + doc.document_templates.category.slice(1)
                            : "Document"}
                          {" · "}Updated {formatRelativeTime(doc.updated_at)}
                          {doc.completeness_score > 0 && <> · {doc.completeness_score}% complete</>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full", doc.status === "complete" ? "bg-green-500/15 text-green-400" : "bg-amber-500/15 text-amber-400")}>
                        {doc.status === "complete" ? "✓ Complete" : "In progress"}
                      </span>
                      <button
                        onClick={() => {
                          setViewingDoc(doc);
                          trackDocumentView({ founderDocumentId: doc.id });
                        }}
                        className="text-xs px-3 py-1.5 rounded-lg bg-accent text-brand hover:bg-accent transition-colors">
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {isInvestor && platformDocsSplit.stage2.length > 0 && stage2Unlocked && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 font-semibold">Stage 2 — Full diligence</div>
              <div className="space-y-2">
                {platformDocsSplit.stage2.map((doc: any) => (
                  <div key={doc.id}
                    className="flex items-center justify-between p-4 rounded-none border border-border bg-white/[0.02] hover:bg-accent transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-brand text-sm shrink-0">≡</div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {doc.document_templates?.category
                            ? doc.document_templates.category.charAt(0).toUpperCase() + doc.document_templates.category.slice(1)
                            : "Document"}
                          {" · "}Updated {formatRelativeTime(doc.updated_at)}
                          {doc.completeness_score > 0 && <> · {doc.completeness_score}% complete</>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full", doc.status === "complete" ? "bg-green-500/15 text-green-400" : "bg-amber-500/15 text-amber-400")}>
                        {doc.status === "complete" ? "✓ Complete" : "In progress"}
                      </span>
                      <button
                        onClick={() => {
                          setViewingDoc(doc);
                          trackDocumentView({ founderDocumentId: doc.id });
                        }}
                        className="text-xs px-3 py-1.5 rounded-lg bg-accent text-brand hover:bg-accent transition-colors">
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {!isInvestor && (
          <div className="space-y-2">
            {(platformDocs as any[]).map((doc: any) => (
              <div key={doc.id}
                className="flex items-center justify-between p-4 rounded-none border border-border bg-white/[0.02] hover:bg-accent transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-brand text-sm shrink-0">≡</div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {doc.document_templates?.category
                        ? doc.document_templates.category.charAt(0).toUpperCase() + doc.document_templates.category.slice(1)
                        : "Document"}
                      {" · "}Updated {formatRelativeTime(doc.updated_at)}
                      {doc.completeness_score > 0 && <> · {doc.completeness_score}% complete</>}
                      {" · "}
                      <span className="font-medium text-brand">
                        Stage {(doc.deal_room_stage ?? 1) === 2 ? "2 — Full diligence" : "1 — Initial review"}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={cn("text-xs px-2 py-0.5 rounded-full", doc.status === "complete" ? "bg-green-500/15 text-green-400" : "bg-amber-500/15 text-amber-400")}>
                    {doc.status === "complete" ? "✓ Complete" : "In progress"}
                  </span>
                  <button
                    onClick={() => {
                      setViewingDoc(doc);
                      trackDocumentView({ founderDocumentId: doc.id });
                    }}
                    className="text-xs px-3 py-1.5 rounded-lg bg-accent text-brand hover:bg-accent transition-colors">
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      )}

      {(platformDocs as any[]).length > 0 && (docs as any[]).length > 0 && (
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-border/40" />
          <span className="text-xs text-gray-500 uppercase tracking-wider">Uploaded files</span>
          <div className="flex-1 h-px bg-border/40" />
        </div>
      )}

      {isFounder && (
        <div className="mt-5 space-y-3">
          <div className="rounded-lg bg-gray-100/40 border border-[rgba(0,0,0,0.08)] px-4 py-3 text-xs text-gray-500 space-y-1">
            <div>💡 <strong>Documents shared here are visible to the investor</strong> and appear in their Workstation automatically.</div>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {[
                { ext: "PDF", color: "text-red-600 bg-red-500/10" },
                { ext: "PPTX", color: "text-orange-600 bg-orange-500/10" },
                { ext: "DOCX", color: "text-blue-600 bg-blue-500/10" },
                { ext: "XLSX", color: "text-green-600 bg-green-500/10" },
                { ext: "CSV", color: "text-green-600 bg-green-500/10" },
                { ext: "PNG/JPG", color: "text-brand bg-accent" },
              ].map(({ ext, color }) => (
                <span key={ext} className={cn("rounded px-1.5 py-0.5 text-[9px] font-bold uppercase", color)}>{ext}</span>
              ))}
              <span className="text-[10px] text-gray-500 self-center">· Max 50MB per file</span>
            </div>
          </div>
          <Dropzone
            dealRoomId={dealRoomId}
            activeDocTab={activeDocTab !== "All" ? activeDocTab : undefined}
            onUploadComplete={(fileName) => {
              queryClient.invalidateQueries({ queryKey: ["documents", dealRoomId] });
              if (fileName && userId) {
                triggerDocumentUploadedEmail({
                  data: { dealRoomId, documentName: fileName, uploaderUserId: userId },
                }).catch(() => {});
                supabase
                  .from("deal_room_members")
                  .select("user_id")
                  .eq("deal_room_id", dealRoomId)
                  .then(({ data: members }) => {
                    const investorMembers = (members ?? []).filter((m: any) => m.user_id !== userId);
                    if (investorMembers.length > 0) {
                      supabase.from("notifications").insert(
                        investorMembers.map((m: any) => ({
                          user_id: m.user_id,
                          kind: "deal_activity",
                          title: "New document in this deal room",
                          body: `A document was shared with you in this deal room.`,
                          read: false,
                          action_url: `/app/deal-rooms/${dealRoomId}/documents`,
                          meta: { deal_room_id: dealRoomId },
                        }))
                      ).then(({ error: nErr }) => {
                        if (nErr) console.warn("[notification] deal_activity insert failed:", nErr.message);
                      });
                    }
                  });
              }
            }}
          />
        </div>
      )}

      <div className="flex gap-1 mt-5 pb-2 overflow-x-auto border-b border-[rgba(0,0,0,0.08)]">
        {DOC_CATEGORIES.map((cat) => {
          const count = cat === "All" ? (docs as any[]).length : (catCounts[cat] ?? 0);
          return (
            <button
              key={cat}
              onClick={() => setActiveDocTab(cat)}
              className={cn(
                "shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs transition-colors",
                activeDocTab === cat
                  ? "hs-gradient text-brand-foreground"
                  : "border border-[rgba(0,0,0,0.08)] hover:bg-gray-100"
              )}
            >
              {cat}
              {count > 0 && (
                <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-bold", activeDocTab === cat ? "bg-background/20" : "bg-accent text-gray-500")}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {showLibrary && (
        <div
          className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm grid place-items-center p-4"
          onClick={() => setShowLibrary(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-[rgba(0,0,0,0.08)] bg-card shadow-elev"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-[rgba(0,0,0,0.08)]">
              <div className="text-sm font-semibold">Add from document library</div>
              <button
                onClick={() => setShowLibrary(false)}
                className="grid h-8 w-8 place-items-center rounded-md text-gray-500 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-3 max-h-80 overflow-y-auto">
              {libLoading && <div className="text-sm text-gray-500 p-3 animate-pulse">Loading…</div>}
              {!libLoading && (libraryDocs as any[]).length === 0 && (
                <div className="text-sm text-gray-500 p-3 text-center py-6">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-[#71717A]" />
                  No documents to add. Upload documents from the main Documents page first.
                </div>
              )}
              {(libraryDocs as any[]).map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50">
                  <div className="grid h-8 w-8 place-items-center rounded-md bg-accent shrink-0">
                    <FileText className="h-4 w-4 text-brand" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {doc.name || doc.storage_path?.split("/").pop() || "Document"}
                    </div>
                    {doc.category && <div className="text-xs text-gray-500">{doc.category}</div>}
                  </div>
                  <button
                    onClick={() => addFromLibrary(doc.id)}
                    disabled={addingFromLib === doc.id}
                    className="shrink-0 inline-flex items-center gap-1 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-xs disabled:opacity-50"
                  >
                    {addingFromLib === doc.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                    Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {ndaDocs.length > 0 && (
        <div className="mt-5">
          <div className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-2">System generated</div>
          <div className="rounded-none border border-[rgba(0,0,0,0.08)] bg-card shadow-card divide-y divide-border/60">
            {ndaDocs.map((d) => (
              <div key={d.name} className="flex items-center gap-3 px-5 py-3">
                <div className="grid h-8 w-8 place-items-center rounded-md bg-success/10"><Shield className="h-4 w-4 text-success" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{d.name}</div>
                  <div className="text-xs text-gray-500">Auto-generated NDA · {new Date(d.createdAt).toLocaleDateString()}</div>
                </div>
                <span className="inline-flex items-center gap-1 text-success text-xs"><CheckCircle2 className="h-3.5 w-3.5" /> Signed by all</span>
                <button className="text-gray-500 hover:text-foreground"><Download className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {filteredDocs.length > 0 && (
        <div className="mt-5 space-y-3">
          {filteredDocs.map((doc) => {
            const rawName = doc.name || doc.storage_path?.split("/").pop() || "Document";
            const displayName = rawName.replace(/^\d{13}-/, "");
            const ext = displayName.split(".").pop()?.toLowerCase() ?? "";
            const hasSummary = !!doc.ai_summary;
            const isGenerating = generatingSummaryId === doc.id;
            const isEditing = editingSummaryId === doc.id;
            const supportsAI = TEXT_EXTS.has(ext);
            const catColor = CATEGORY_COLORS[doc.category] ?? "bg-accent text-gray-500";
            const catBorder = CAT_BORDER[doc.category] ?? "border-l-muted-foreground/40";
            const { bg: iconBg, color: iconColor, Icon: FileIcon } = getFileTypeStyle(ext);
            const fileSize = formatFileSize(doc.file_size ?? null);

            return (
              <div
                key={doc.id}
                className={cn(
                  "rounded-none bg-card overflow-hidden border border-[rgba(0,0,0,0.08)] border-l-4",
                  catBorder
                )}
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className={cn("grid h-9 w-9 place-items-center rounded-lg shrink-0", iconBg)}>
                    <FileIcon className={cn("h-4 w-4", iconColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">{displayName}</span>
                      {activeDocTab === "All" && pitchDeckDoc?.id === doc.id && (
                        <span className="shrink-0 text-[9px] font-bold bg-accent text-brand px-1.5 py-0.5 rounded-full">📌 PINNED</span>
                      )}
                      {doc.category && (
                        <span className={cn("shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium", catColor)}>
                          {doc.category}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                      <span>{doc.uploader?.full_name ?? "Unknown"}</span>
                      <span>·</span>
                      <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                      {fileSize && <><span>·</span><span>{fileSize}</span></>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setPreviewDoc(doc);
                        trackDocumentView({ documentId: doc.id });
                      }}
                      className="grid h-7 w-7 place-items-center rounded-md text-gray-500 hover:bg-accent hover:text-foreground"
                      title="Preview"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDownload(doc.storage_path)}
                      className="grid h-7 w-7 place-items-center rounded-md text-gray-500 hover:bg-accent hover:text-foreground"
                      title="Download"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    {isFounder && (
                      <button
                        onClick={() => handleDocRemove(doc)}
                        title="Remove from deal room"
                        className="grid h-7 w-7 place-items-center rounded-md text-gray-500 hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {supportsAI && (
                  <div className="border-t border-[rgba(0,0,0,0.08)]">
                    {hasSummary ? (
                      <div className="px-4 py-2.5">
                        <button
                          onClick={() => toggleSummary(doc.id)}
                          className="flex items-center gap-1.5 text-xs text-brand hover:underline w-full text-left"
                        >
                          <Sparkles className="h-3.5 w-3.5 shrink-0" />
                          <span className="flex-1">AI Summary</span>
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[9px] font-medium",
                            doc.summary_edited ? "bg-accent text-brand" : "bg-muted/60 text-gray-500"
                          )}>
                            {doc.summary_edited ? "Edited" : "AI"}
                          </span>
                          {isSummaryExpanded(doc.id)
                            ? <ChevronUp className="h-3 w-3 shrink-0" />
                            : <ChevronDown className="h-3 w-3 shrink-0" />}
                        </button>
                        {isSummaryExpanded(doc.id) && (
                          <div className="mt-2 rounded-lg border-l-2 border-brand/40 bg-gray-100/30 px-3 py-3">
                            {isEditing ? (
                              <div className="space-y-2">
                                <textarea
                                  value={summaryEdits[doc.id] ?? ""}
                                  onChange={(e) => setSummaryEdits((s) => ({ ...s, [doc.id]: e.target.value }))}
                                  rows={4}
                                  className="w-full rounded-md border border-[rgba(0,0,0,0.08)] bg-background px-3 py-2 text-xs resize-none focus:outline-none focus:border-brand/50"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setEditingSummaryId(null)}
                                    className="text-[10px] border border-[rgba(0,0,0,0.08)] rounded px-2 py-1 hover:bg-gray-100"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={async () => {
                                      const text = summaryEdits[doc.id]?.trim();
                                      if (!text) return;
                                      const { error } = await supabase.from("documents")
                                        .update({ ai_summary: text, summary_edited: true })
                                        .eq("id", doc.id);
                                      if (error) { toast.error("Failed to save summary"); return; }
                                      queryClient.invalidateQueries({ queryKey: ["documents", dealRoomId] });
                                      queryClient.invalidateQueries({ queryKey: ["dd-docs", dealRoomId] });
                                      setEditingSummaryId(null);
                                      setSummaryEdits((s) => { const n = { ...s }; delete n[doc.id]; return n; });
                                      toast.success("Summary saved");
                                    }}
                                    className="text-[10px] bg-gradient-brand text-brand-foreground rounded px-2 py-1"
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-line">
                                  {doc.ai_summary}
                                </p>
                                <div className="flex gap-2 mt-2">
                                  <button
                                    onClick={() => generateSummary(doc)}
                                    disabled={isGenerating}
                                    className="text-[10px] text-gray-500 hover:text-foreground border border-[rgba(0,0,0,0.08)] rounded px-2 py-0.5 hover:bg-accent disabled:opacity-50"
                                  >
                                    {isGenerating ? "Regenerating…" : "Regenerate"}
                                  </button>
                                  {isFounder && (
                                    <button
                                      onClick={() => {
                                        setEditingSummaryId(doc.id);
                                        setSummaryEdits((s) => ({ ...s, [doc.id]: doc.ai_summary! }));
                                      }}
                                      className="text-[10px] text-gray-500 hover:text-foreground border border-[rgba(0,0,0,0.08)] rounded px-2 py-0.5 hover:bg-gray-100"
                                    >
                                      Edit
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-4 py-2.5">
                        <Sparkles className="h-3.5 w-3.5 text-brand shrink-0" />
                        <span className="text-xs font-medium text-brand flex-1">AI Summary</span>
                        <span className="text-xs text-gray-500 italic mr-2">Not generated</span>
                        <button
                          onClick={() => generateSummary(doc)}
                          disabled={isGenerating}
                          className="inline-flex items-center gap-1 rounded-md hs-gradient text-brand-foreground px-2.5 py-1 text-xs font-medium shadow-sm disabled:opacity-50"
                        >
                          {isGenerating
                            ? <><Loader2 className="h-3 w-3 animate-spin" /> Generating…</>
                            : <><Sparkles className="h-3 w-3" /> Generate</>}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {filteredDocs.length === 0 && activeDocTab === "All" && (
        <div className="flex flex-col items-center justify-center text-center">
          <EmptyState kind="empty" title="No documents" />
          {isFounder && (
            <label className="-mt-4 inline-flex items-center gap-1.5 rounded-md hs-gradient text-brand-foreground px-4 py-2 text-sm cursor-pointer">
              <Upload className="h-4 w-4" /> Upload
              <input
                type="file"
                className="sr-only"
                accept=".pdf,.pptx,.ppt,.docx,.doc,.xlsx,.xls,.csv,.png,.jpg,.jpeg"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !userId) return;
                  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
                  if (!ALLOWED_UPLOAD_EXTENSIONS.has(ext)) { toast.error(`${file.name}: file type not allowed`); e.target.value = ""; return; }
                  if (file.size > MAX_UPLOAD_SIZE) { toast.error(`${file.name}: exceeds 50 MB limit`); e.target.value = ""; return; }
                  const path = `${dealRoomId}/${userId}/${Date.now()}-${file.name}`;
                  const { error } = await supabase.storage.from("documents").upload(path, file);
                  if (error) { toast.error("Upload failed"); return; }
                  const { error: insErr } = await supabase.from("documents").insert({
                    deal_room_id: dealRoomId,
                    uploader_id: userId,
                    storage_path: path,
                    file_name: file.name,
                    file_size: file.size,
                    category: "Other",
                  });
                  if (insErr) { console.error("[docs] insert after upload failed:", insErr); toast.error("Upload failed — please try again."); return; }
                  queryClient.invalidateQueries({ queryKey: ["documents", dealRoomId] });
                  toast.success("Uploaded!");
                  e.target.value = "";
                  const { data: members } = await supabase
                    .from("deal_room_members")
                    .select("user_id")
                    .eq("deal_room_id", dealRoomId);
                  const investorMembers = (members ?? []).filter((m: any) => m.user_id !== userId);
                  if (investorMembers.length > 0) {
                    supabase.from("notifications").insert(
                      investorMembers.map((m: any) => ({
                        user_id: m.user_id,
                        kind: "deal_activity",
                        title: "New document in this deal room",
                        body: `A document was shared with you in this deal room.`,
                        read: false,
                        action_url: `/app/deal-rooms/${dealRoomId}/documents`,
                        meta: { deal_room_id: dealRoomId },
                      }))
                    ).then(({ error: nErr }) => {
                      if (nErr) console.warn("[notification] deal_activity insert failed:", nErr.message);
                    });
                  }
                }}
              />
            </label>
          )}
        </div>
      )}

      {activeDocTab !== "All" && expectedForTab.length > 0 && (
        <div className="pb-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-4">
            Recommended for this category
          </div>
          <div className="rounded-none border border-dashed border-[rgba(0,0,0,0.08)] divide-y divide-border/40 overflow-hidden">
            {expectedForTab.map((expected) => (
              <div key={expected.name} className="flex items-center gap-3 px-4 py-3 bg-gray-100/20">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-muted shrink-0">
                  <FileText className="h-4 w-4 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-500">{expected.name}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">Not uploaded</div>
                </div>
                {isFounder && (
                  <label className="inline-flex items-center gap-1.5 rounded-md border border-brand/40 text-brand px-3 py-1.5 text-xs cursor-pointer hover:bg-accent transition-colors shrink-0">
                    <Upload className="h-3 w-3" /> Upload
                    <input
                      type="file"
                      className="sr-only"
                      accept=".pdf,.pptx,.ppt,.docx,.doc,.xlsx,.xls,.csv,.png,.jpg,.jpeg"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !userId) return;
                        const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
                        if (!ALLOWED_UPLOAD_EXTENSIONS.has(ext)) { toast.error(`${file.name}: file type not allowed`); e.target.value = ""; return; }
                        if (file.size > MAX_UPLOAD_SIZE) { toast.error(`${file.name}: exceeds 50 MB limit`); e.target.value = ""; return; }
                        const path = `${dealRoomId}/${userId}/${Date.now()}-${file.name}`;
                        const { error: upErr } = await supabase.storage.from("documents").upload(path, file);
                        if (upErr) { toast.error("Upload failed"); return; }
                        const { error: insErr } = await supabase.from("documents").insert({
                          deal_room_id: dealRoomId,
                          uploader_id: userId,
                          storage_path: path,
                          category: expected.category,
                          file_name: file.name,
                          file_size: file.size,
                        });
                        if (insErr) { console.error("[docs] insert after upload failed:", insErr); toast.error("Upload failed — please try again."); return; }
                        queryClient.invalidateQueries({ queryKey: ["documents", dealRoomId] });
                        toast.success(`${file.name} uploaded`);
                        e.target.value = "";
                        const { data: members } = await supabase
                          .from("deal_room_members")
                          .select("user_id")
                          .eq("deal_room_id", dealRoomId);
                        const investorMembers = (members ?? []).filter((m: any) => m.user_id !== userId);
                        if (investorMembers.length > 0) {
                          supabase.from("notifications").insert(
                            investorMembers.map((m: any) => ({
                              user_id: m.user_id,
                              kind: "deal_activity",
                              title: "New document in this deal room",
                              body: `A document was shared with you in this deal room.`,
                              read: false,
                              action_url: `/app/deal-rooms/${dealRoomId}/documents`,
                              meta: { deal_room_id: dealRoomId },
                            }))
                          ).then(({ error: nErr }) => {
                            if (nErr) console.warn("[notification] deal_activity insert failed:", nErr.message);
                          });
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {(isInvestor || (isFounder && visibleInvestorDocs.length > 0)) && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-success/10 text-success px-2 py-0.5 text-[11px] font-semibold">
                  🔒 Investor Documents
                </span>
              </h3>
              <p className="text-[10px] text-gray-500 mt-0.5">
                {isInvestor
                  ? "Only you can upload here. Choose visibility per document."
                  : "Documents shared with you by the investor."}
              </p>
            </div>
          </div>

          {isInvestor && (
            <div className="mb-4">
              <Dropzone
                dealRoomId={dealRoomId}
                uploadedByRole="investor"
                onUploadComplete={() => {
                  queryClient.invalidateQueries({ queryKey: ["investor-documents", dealRoomId, userId] });
                }}
              />
            </div>
          )}

          {visibleInvestorDocs.length === 0 && isInvestor && (
            <div className="rounded-none border border-dashed border-[rgba(0,0,0,0.08)] p-8 text-center">
              <FileText className="h-8 w-8 mx-auto mb-2 text-[#71717A]" />
              <p className="text-sm text-gray-500">No investor documents</p>
            </div>
          )}

          <div className="space-y-2">
            {visibleInvestorDocs.map((doc: any) => {
              const rawName = doc.name || doc.storage_path?.split("/").pop() || "Document";
              const displayName = rawName.replace(/^\d{13}-/, "");
              const ext = displayName.split(".").pop()?.toLowerCase() ?? "";
              const { bg: iconBg, color: iconColor, Icon: FileIcon } = getFileTypeStyle(ext);
              const currentVisibility = investorDocVisibility[doc.id] ?? doc.visibility ?? "shared";

              return (
                <div key={doc.id} className="flex items-center gap-3 rounded-none border border-[rgba(0,0,0,0.08)] bg-card px-4 py-3 shadow-card border-l-4 border-l-success/60">
                  <div className={cn("grid h-9 w-9 place-items-center rounded-lg shrink-0", iconBg)}>
                    <FileIcon className={cn("h-4 w-4", iconColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{displayName}</div>
                    <div className="text-xs text-gray-500">
                      {doc.uploader?.full_name ?? "Investor"} · {new Date(doc.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  {isInvestor && (
                    <div className="flex items-center gap-1 rounded-lg bg-gray-100/60 p-0.5 shrink-0">
                      {(["shared", "private"] as const).map((v) => (
                        <button
                          key={v}
                          onClick={() => updateDocVisibility(doc.id, v)}
                          className={cn(
                            "px-2 py-1 rounded-md text-[10px] font-medium transition-colors",
                            currentVisibility === v
                              ? v === "shared"
                                ? "bg-success text-success-foreground shadow-sm"
                                : "bg-warning text-warning-foreground shadow-sm"
                              : "text-gray-500 hover:text-foreground"
                          )}
                        >
                          {v === "shared" ? "🌐 Shared" : "🔒 Private"}
                        </button>
                      ))}
                    </div>
                  )}
                  {isFounder && (
                    <span className="text-[10px] text-success bg-success/10 px-2 py-0.5 rounded-full shrink-0">
                      🌐 Shared
                    </span>
                  )}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleDownload(doc.storage_path)}
                      className="grid h-7 w-7 place-items-center rounded-md text-gray-500 hover:bg-accent hover:text-foreground"
                      title="Download"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    {isInvestor && (
                      <button
                        onClick={() => removeInvestorDoc(doc.id)}
                        className="grid h-7 w-7 place-items-center rounded-md text-gray-500 hover:text-destructive hover:bg-destructive/10"
                        title="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      </>)}

      {activeVaultTab === "links" && (
        <div className="mt-5 space-y-3">
          {(dealRoomLinks as any[]).length === 0 && (
            <div className="rounded-none border border-dashed border-[rgba(0,0,0,0.08)] p-10 text-center">
              <LinkIcon className="h-8 w-8 mx-auto mb-2 text-[#71717A]" />
              <p className="text-sm font-medium">No links</p>
              <p className="text-xs text-gray-500 mt-1">Add product videos, Loom recordings, external documents, or any URL</p>
              <button
                onClick={() => setShowAddLink(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-sm shadow-glow"
              >
                <Plus className="h-4 w-4" /> Add first link
              </button>
            </div>
          )}
          {(dealRoomLinks as any[]).map((link: any) => (
            <div key={link.id} className="flex items-center gap-3 rounded-none border border-[rgba(0,0,0,0.08)] bg-card px-4 py-3 shadow-card">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent shrink-0">
                <LinkIcon className="h-4 w-4 text-brand" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{link.name}</div>
                <div className="text-xs text-gray-500 truncate">{link.url}</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid h-7 w-7 place-items-center rounded-md text-gray-500 hover:bg-accent hover:text-foreground"
                  title="Open link"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                {link.uploader_id === userId && (
                  <button
                    onClick={() => removeLink(link.id)}
                    className="grid h-7 w-7 place-items-center rounded-md text-gray-500 hover:text-destructive hover:bg-destructive/10"
                    title="Remove link"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddLink && (
        <div
          className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm grid place-items-center p-4"
          onClick={() => setShowAddLink(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[rgba(0,0,0,0.08)] bg-card shadow-elev"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-[rgba(0,0,0,0.08)]">
              <div className="text-sm font-semibold">Add a link</div>
              <button onClick={() => setShowAddLink(false)} className="grid h-8 w-8 place-items-center rounded-md text-gray-500 hover:bg-gray-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Link name</label>
                <input
                  value={linkName}
                  onChange={(e) => setLinkName(e.target.value)}
                  placeholder="e.g. Product Demo Video, Financial Model..."
                  className="w-full rounded-md border border-[rgba(0,0,0,0.08)] bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">URL</label>
                <input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  type="url"
                  className="w-full rounded-md border border-[rgba(0,0,0,0.08)] bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setShowAddLink(false)} className="px-4 py-2 rounded-md border border-[rgba(0,0,0,0.08)] text-sm hover:bg-gray-100">
                  Cancel
                </button>
                <button
                  onClick={addLink}
                  disabled={!linkName.trim() || !linkUrl.trim() || addingLink}
                  className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-4 py-2 text-sm shadow-glow disabled:opacity-50"
                >
                  {addingLink ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Add link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {previewDoc && (
        <DocPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
      )}

      {viewingDoc && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setViewingDoc(null)}>
          <div className="bg-[#111118] border border-border rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "Syne, sans-serif" }}>{viewingDoc.title}</h2>
                <p className="text-xs text-gray-500 mt-1">
                  {viewingDoc.completeness_score}% complete · Updated {formatRelativeTime(viewingDoc.updated_at)}
                </p>
              </div>
              <button onClick={() => setViewingDoc(null)} className="text-gray-500 hover:text-foreground text-xl leading-none">×</button>
            </div>
            <div className="overflow-y-auto p-6 space-y-4 flex-1">
              {viewingDoc.content && Object.entries(viewingDoc.content as Record<string, string>)
                .filter(([, v]) => v && String(v).trim())
                .map(([key, value]) => (
                  <div key={key}>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{key.replace(/_/g, " ")}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{String(value)}</p>
                  </div>
                ))
              }
              {(!viewingDoc.content || Object.keys(viewingDoc.content).length === 0) && (
                <p className="text-gray-500 text-sm text-center py-8">No content available</p>
              )}
            </div>
            {viewingDoc.ai_feedback && (viewingDoc.ai_feedback as Record<string, unknown>).overall_score && (
              <div className="border-t border-border p-4 flex items-center gap-3 bg-white/[0.02]">
                <div className={cn(
                  "w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0",
                  (viewingDoc.ai_feedback as Record<string, unknown>).signal === "strong"
                    ? "border-green-500 text-green-400" : "border-amber-500 text-amber-400"
                )}>
                  {String((viewingDoc.ai_feedback as Record<string, unknown>).overall_score)}
                </div>
                <p className="text-xs text-gray-500 flex-1">
                  AI score: {String((viewingDoc.ai_feedback as Record<string, unknown>).summary ?? "").substring(0, 120)}...
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
