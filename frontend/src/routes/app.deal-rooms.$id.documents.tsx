import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FileText, Image, Film, Plus, X, Loader2, Eye, Download, Trash2, Sparkles,
  ChevronUp, ChevronDown, Upload, Link as LinkIcon, ExternalLink, Shield, CheckCircle2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { callAction } from "@/lib/actions/call";
import {
  docListRoom, docListLibrary, docListInvestor,
  docUpdate, docInsert, docViewInsert,
} from "@/lib/actions/deal-room-documents";
import { roomGetWorkflowState } from "@/lib/actions/deal-room-core";
import { cn } from "@/lib/utils";
import { LedgerTable, LedgerHead, LedgerBody, Th, Tr, Td } from "@/components/v2";
import { LcsButton, LcsStatusPill, LcsEmptyState } from "@/components/lcs";
import { Dropzone } from "@/components/app/Dropzone";
import { Stage2Gate } from "@/components/app/Stage2Gate";
import { generateDocSummary } from "@/lib/ai-secure-fn";
import { extractDocumentText } from "@/lib/document-extractor";
import { withTimeout, AITimeoutError } from "@/lib/with-timeout";
import { AI_TIMEOUT_MESSAGE } from "@/hooks/useTimedAI";
import { triggerDocumentUploadedEmail } from "@/lib/email/triggers";
import { useGeneratedNdaDocs } from "@/lib/store";
import { useDealRoom } from "@/hooks/useDealRoom";

export const Route = createFileRoute("/app/deal-rooms/$id/documents")({
  component: DocumentsPage,
});

const ALLOWED_UPLOAD_EXTENSIONS = new Set(["pdf", "pptx", "ppt", "xlsx", "xls", "docx", "doc", "csv", "png", "jpg", "jpeg"]);
const MAX_UPLOAD_SIZE = 50 * 1024 * 1024;

const TEXT_EXTS = new Set(["pdf", "docx", "doc", "xlsx", "xls", "csv", "pptx", "ppt", "txt"]);

function getFileTypeIcon(ext: string) {
  if (ext === "pdf") return FileText;
  if (["docx", "doc", "xlsx", "xls", "csv", "pptx", "ppt"].includes(ext)) return FileText;
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return Image;
  if (["mp4", "mov", "avi", "webm"].includes(ext)) return Film;
  return FileText;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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
  // Office types intentionally have no dedicated branch: preview routed through
  // docs.google.com/gview leaked documents to Google and was removed. They fall
  // through to the download-only path until in-platform Office rendering ships.

  useEffect(() => {
    supabase.storage.from("documents").createSignedUrl(doc.storage_path, 300).then(({ data }) => {
      if (data?.signedUrl) setUrl(data.signedUrl);
    });
  }, [doc.storage_path]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      style={{ background: "rgba(22,24,28,0.4)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl border overflow-hidden"
        style={{ background: "var(--lcs-white)", borderColor: "var(--lcs-line)", borderRadius: "var(--radius-lcs-control)", fontFamily: "var(--font-lcs-ui)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5" style={{ height: "40px", borderBottom: "1px solid var(--lcs-line)" }}>
          <div className="font-medium truncate" style={{ color: "var(--lcs-ink)", fontSize: "13.5px" }}>{displayName}</div>
          <LcsButton variant="text-link" onClick={onClose} style={{ height: "28px", padding: "0 6px" }}>
            <X className="h-4 w-4" />
          </LcsButton>
        </div>
        <div className="p-6">
          {!url ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--lcs-ink-muted)" }} />
            </div>
          ) : isImage ? (
            <img src={url} alt={displayName} className="max-w-full max-h-[60vh] object-contain mx-auto" style={{ borderRadius: "var(--radius-lcs-control)" }} />
          ) : isPdf ? (
            <iframe
              src={url}
              className="w-full h-[70vh] border"
              style={{ borderColor: "var(--lcs-line)", borderRadius: "var(--radius-lcs-control)" }}
              title={displayName}
            />
          ) : (
            // Office files (and any other non-image/PDF type) fall through to
            // download-only. The previous Office branch routed the signed URL
            // through docs.google.com/gview, which leaked confidential deal-room
            // documents to Google on every render — removed. In-platform Office
            // rendering is deferred (see step-6 evaluation); until then, no
            // preview is strictly better than a third-party-routed one, and the
            // download path is a recorded, in-platform action.
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="grid h-16 w-16 place-items-center" style={{ background: "var(--lcs-surface)", borderRadius: "var(--radius-lcs-control)" }}>
                <FileText className="h-8 w-8" style={{ color: "var(--lcs-ink-muted)" }} />
              </div>
              <p style={{ color: "var(--lcs-ink-muted)", fontSize: "13px" }}>Preview not available for this file type.</p>
              <a href={url} download={displayName}>
                <LcsButton variant="primary"><Download className="h-4 w-4" /> Download to view</LcsButton>
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
      // §B — future migration group: investor_profiles (profile/investor group).
      // Read stays a direct call; only the document_views write moves to the gateway.
      const { data: profile } = await supabase
        .from("investor_profiles")
        .select("your_name, fund_name")
        .eq("user_id", authUser.id)
        .maybeSingle();
      const viewerName = profile?.your_name ?? profile?.fund_name ?? "Investor";
      // viewer_id is derived server-side from the token (not passed).
      await callAction(docViewInsert, dealRoomId, {
        dealRoomId,
        documentId: params.documentId ?? null,
        founderDocumentId: params.founderDocumentId ?? null,
        startupId: startupId ?? null,
        viewerRole: "investor",
        viewerName,
        durationSeconds: 0,
      });
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
      // member of room; all docs; uploader{full_name} join (doc_list_room).
      const res = await callAction<{ documents: any[] }>(docListRoom, dealRoomId, { dealRoomId });
      return res.documents ?? [];
    },
  });

  const { data: libraryDocs = [], isLoading: libLoading } = useQuery({
    queryKey: ["library-docs", userId],
    enabled: showLibrary && !!userId,
    queryFn: async () => {
      // uploader-scoped: caller's own docs NOT in this room (doc_list_library).
      const res = await callAction<{ documents: any[] }>(docListLibrary, dealRoomId, { dealRoomId });
      return res.documents ?? [];
    },
  });

  const { data: dealRoomLinks = [] } = useQuery({
    queryKey: ["deal-room-links", dealRoomId],
    enabled: !!dealRoomId,
    queryFn: async () => {
      // §B — future migration group: deal_room_links (its own small group).
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
      // member of room; uploaded_by_role='investor'; uploader{full_name,avatar_url} (doc_list_investor).
      const res = await callAction<{ documents: any[] }>(docListInvestor, dealRoomId, { dealRoomId });
      return res.documents ?? [];
    },
  });

  const { data: platformDocs = [] } = useQuery({
    queryKey: ["platform-docs", startupId],
    enabled: !!startupId,
    queryFn: async () => {
      // §B — future migration group: founder_documents (profile/founder group;
      // couples to the investor group via discovery_requests — see AUTHZ_MAPPING.md).
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
      try {
        const res = await callAction<{ workflow: { workflow_stage: string | null; stage2_unlocked: boolean | null } }>(
          roomGetWorkflowState, dealRoomId, { dealRoomId },
        );
        return res.workflow;
      } catch (err) {
        if (err instanceof Error && err.message === "forbidden") return null;
        throw err;
      }
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
    try {
      await callAction(docUpdate, dealRoomId, { documentId: docId, patch: { visibility } });
    } catch (err: any) {
      console.error("[docs] visibility update failed:", err); toast.error("Could not change document visibility."); return;
    }
    queryClient.invalidateQueries({ queryKey: ["investor-documents", dealRoomId, userId] });
  };

  const removeInvestorDoc = async (docId: string) => {
    try {
      await callAction(docUpdate, dealRoomId, { documentId: docId, patch: { deal_room_id: null } });
    } catch (err: any) {
      console.error("[docs] remove failed:", err); toast.error("Could not remove document."); return;
    }
    queryClient.invalidateQueries({ queryKey: ["investor-documents", dealRoomId, userId] });
    toast.success("Document removed");
  };

  const addLink = async () => {
    if (!linkName.trim() || !linkUrl.trim() || !userId) return;
    setAddingLink(true);
    const url = linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`;
    // §B — future migration group: deal_room_links (its own small group).
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
    // §B — future migration group: deal_room_links (its own small group).
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
      try {
        await callAction(docUpdate, dealRoomId, { documentId: doc.id, patch: { deal_room_id: null } });
      } catch (err: any) {
        console.error("[docs] deferred remove failed:", err); toast.error(`Could not remove "${displayName}".`);
      }
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
    try {
      await callAction(docUpdate, dealRoomId, { documentId: docId, patch: { deal_room_id: dealRoomId } });
    } catch (err: any) {
      console.error("[docs] add from library failed:", err); toast.error("Could not add document."); setAddingFromLib(null); return;
    }
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
        // doc_update is uploader-only (documents_own) — same as current RLS, which
        // already only lets the uploader write ai_summary. Behaviour preserved.
        try {
          await callAction(docUpdate, dealRoomId, { documentId: doc.id, patch: { ai_summary: honestMessage } });
        } catch (err: any) { console.error("[docs] ai_summary placeholder save failed:", err); }
        queryClient.setQueryData(["documents", dealRoomId], (old: any[]) =>
          (old ?? []).map((d: any) => d.id === doc.id ? { ...d, ai_summary: honestMessage } : d)
        );
        queryClient.invalidateQueries({ queryKey: ["dd-docs", dealRoomId] });
        queryClient.invalidateQueries({ queryKey: ["documents", dealRoomId] });
        expandSummary(doc.id);
        toast.success("Document processed");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const aiData = await withTimeout(generateDocSummary({
        data: {
          userAccessToken: session?.access_token ?? "",
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

      await callAction(docUpdate, dealRoomId, { documentId: doc.id, patch: { ai_summary: summary } });
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
    <div className="p-8 max-w-5xl mx-auto" style={{ fontFamily: "var(--font-lcs-ui)", color: "var(--lcs-ink)" }}>
      <div className="flex items-center justify-between">
        {/* Segmented pill toggle — same treatment as the chip-rail tabs below
            (active = solid accent fill + white text, inactive = transparent),
            per Group 6 Phase-0's tab-grammar consistency decision. */}
        <div className="flex items-center gap-1 border p-1" style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-white)", borderRadius: "var(--radius-lcs-control)" }}>
          <button
            onClick={() => setActiveVaultTab("documents")}
            className="px-4 py-1.5 font-medium transition-colors"
            style={{
              borderRadius: "var(--radius-lcs-control)",
              fontSize: "13px",
              background: activeVaultTab === "documents" ? "var(--lcs-accent)" : "transparent",
              color: activeVaultTab === "documents" ? "var(--lcs-white)" : "var(--lcs-ink-muted)",
            }}
          >
            Documents
            <span className="ml-1.5" style={{ fontSize: "10px", opacity: 0.8 }}>({(docs as any[]).length})</span>
          </button>
          <button
            onClick={() => setActiveVaultTab("links")}
            className="px-4 py-1.5 font-medium transition-colors"
            style={{
              borderRadius: "var(--radius-lcs-control)",
              fontSize: "13px",
              background: activeVaultTab === "links" ? "var(--lcs-accent)" : "transparent",
              color: activeVaultTab === "links" ? "var(--lcs-white)" : "var(--lcs-ink-muted)",
            }}
          >
            Links
            <span className="ml-1.5" style={{ fontSize: "10px", opacity: 0.8 }}>({(dealRoomLinks as any[]).length})</span>
          </button>
        </div>
        <div className="flex gap-2">
          {activeVaultTab === "documents" && isFounder && (
            <LcsButton variant="secondary" onClick={() => setShowLibrary(true)}>
              <Plus className="h-4 w-4" /> Add from library
            </LcsButton>
          )}
          {activeVaultTab === "links" && (
            <LcsButton variant="primary" onClick={() => setShowAddLink(true)}>
              <Plus className="h-4 w-4" /> Add link
            </LcsButton>
          )}
        </div>
      </div>

      {activeVaultTab === "documents" && (<>

      {(platformDocs as any[]).length > 0 && (
        <div className="mt-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-medium" style={{ color: "var(--lcs-ink)", fontSize: "13.5px" }}>Platform documents</h3>
            <span style={{ color: "var(--lcs-ink-muted)", fontSize: "11px" }}>
              {(platformDocs as any[]).length} structured
            </span>
          </div>
          {isInvestor && <Stage2Gate stage2Unlocked={stage2Unlocked} />}
          {isInvestor && platformDocsSplit.stage1.length > 0 && (
            <div className="mb-2">
              <div className="uppercase font-medium mb-2" style={{ color: "var(--lcs-ink-muted)", fontSize: "11px", letterSpacing: "0.09em" }}>Stage 1 — Initial review</div>
              <PlatformDocList docs={platformDocsSplit.stage1} onView={(doc) => { setViewingDoc(doc); trackDocumentView({ founderDocumentId: doc.id }); }} />
            </div>
          )}
          {isInvestor && platformDocsSplit.stage2.length > 0 && stage2Unlocked && (
            <div>
              <div className="uppercase font-medium mb-2" style={{ color: "var(--lcs-ink-muted)", fontSize: "11px", letterSpacing: "0.09em" }}>Stage 2 — Full diligence</div>
              <PlatformDocList docs={platformDocsSplit.stage2} onView={(doc) => { setViewingDoc(doc); trackDocumentView({ founderDocumentId: doc.id }); }} />
            </div>
          )}
          {!isInvestor && (
            <PlatformDocList docs={platformDocs as any[]} onView={(doc) => { setViewingDoc(doc); trackDocumentView({ founderDocumentId: doc.id }); }} showStage />
          )}
        </div>
      )}

      {(platformDocs as any[]).length > 0 && (docs as any[]).length > 0 && (
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1" style={{ height: "1px", background: "var(--lcs-line)" }} />
          <span className="uppercase" style={{ color: "var(--lcs-ink-muted)", fontSize: "11px", letterSpacing: "0.09em" }}>Uploaded files</span>
          <div className="flex-1" style={{ height: "1px", background: "var(--lcs-line)" }} />
        </div>
      )}

      {isFounder && (
        <div className="mt-5 space-y-3">
          <div className="border px-4 py-3" style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-surface)", borderRadius: "var(--radius-lcs-control)" }}>
            <div style={{ color: "var(--lcs-ink-muted)", fontSize: "12px" }}>
              Documents shared here are visible to the investor and appear in their workstation automatically.
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {["PDF", "PPTX", "DOCX", "XLSX", "CSV", "PNG/JPG"].map((ext) => (
                <span key={ext} className="border px-1.5 py-0.5 font-medium uppercase" style={{ borderColor: "var(--lcs-line)", color: "var(--lcs-ink-muted)", borderRadius: "var(--radius-lcs-control)", fontSize: "10px" }}>{ext}</span>
              ))}
              <span style={{ color: "var(--lcs-ink-muted)", fontSize: "11px" }}>Max 50 MB per file</span>
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
                // §B — future migration group: deal_room_members read (deal-room-core group).
                supabase
                  .from("deal_room_members")
                  .select("user_id")
                  .eq("deal_room_id", dealRoomId)
                  .then(({ data: members }) => {
                    const investorMembers = (members ?? []).filter((m: any) => m.user_id !== userId);
                    if (investorMembers.length > 0) {
                      // §B — future migration group: notifications insert (notifications group).
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

      {/* Chip-rail tabs — same active/inactive treatment as the segmented
          pill toggle above (solid accent fill + white text when active,
          transparent + bordered when inactive), per Group 6 Phase-0's
          tab-grammar consistency decision. */}
      <div className="flex gap-1 mt-5 pb-2 overflow-x-auto" style={{ borderBottom: "1px solid var(--lcs-line)" }}>
        {DOC_CATEGORIES.map((cat) => {
          const count = cat === "All" ? (docs as any[]).length : (catCounts[cat] ?? 0);
          const active = activeDocTab === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveDocTab(cat)}
              className="shrink-0 inline-flex items-center gap-1 px-3 py-1 transition-colors"
              style={{
                fontFamily: "var(--font-lcs-ui)",
                borderRadius: "var(--radius-lcs-control)",
                fontSize: "12px",
                background: active ? "var(--lcs-accent)" : "transparent",
                color: active ? "var(--lcs-white)" : "var(--lcs-ink-muted)",
                border: active ? "none" : "1px solid var(--lcs-line)",
              }}
            >
              {cat}
              {count > 0 && (
                <span style={{ fontSize: "10px", fontWeight: 600, opacity: active ? 0.9 : 0.7 }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {showLibrary && (
        <div
          className="fixed inset-0 z-50 grid place-items-center p-4"
          style={{ background: "rgba(22,24,28,0.4)" }}
          onClick={() => setShowLibrary(false)}
        >
          <div
            className="w-full max-w-lg border"
            style={{ background: "var(--lcs-white)", borderColor: "var(--lcs-line)", borderRadius: "var(--radius-lcs-control)", fontFamily: "var(--font-lcs-ui)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5" style={{ height: "40px", borderBottom: "1px solid var(--lcs-line)" }}>
              <div className="font-medium" style={{ color: "var(--lcs-ink)", fontSize: "13.5px" }}>Add from document library</div>
              <LcsButton variant="text-link" onClick={() => setShowLibrary(false)} style={{ height: "28px", padding: "0 6px" }}>
                <X className="h-4 w-4" />
              </LcsButton>
            </div>
            <div className="p-3 max-h-80 overflow-y-auto">
              {libLoading && <div className="p-3" style={{ color: "var(--lcs-ink-muted)", fontSize: "13px" }}>Loading</div>}
              {!libLoading && (libraryDocs as any[]).length === 0 && (
                <div className="p-3 text-center py-6" style={{ color: "var(--lcs-ink-muted)", fontSize: "13px" }}>
                  <FileText className="h-8 w-8 mx-auto mb-2" />
                  No documents to add. Upload documents from the main documents page first.
                </div>
              )}
              {(libraryDocs as any[]).map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 p-3 hover:bg-[var(--lcs-progress-wash)]" style={{ borderRadius: "var(--radius-lcs-control)" }}>
                  <div className="grid h-8 w-8 place-items-center shrink-0" style={{ background: "var(--lcs-surface)", borderRadius: "var(--radius-lcs-control)" }}>
                    <FileText className="h-4 w-4" style={{ color: "var(--lcs-accent)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate" style={{ color: "var(--lcs-ink)", fontSize: "13px" }}>
                      {doc.name || doc.storage_path?.split("/").pop() || "Document"}
                    </div>
                    {doc.category && <div style={{ color: "var(--lcs-ink-muted)", fontSize: "11px" }}>{doc.category}</div>}
                  </div>
                  <LcsButton variant="primary" onClick={() => addFromLibrary(doc.id)} disabled={addingFromLib === doc.id} style={{ height: "28px", fontSize: "11px" }}>
                    {addingFromLib === doc.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                    Add
                  </LcsButton>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {ndaDocs.length > 0 && (
        <div className="mt-5">
          <div className="uppercase font-medium mb-2" style={{ color: "var(--lcs-ink-muted)", fontSize: "11px", letterSpacing: "0.09em" }}>System generated</div>
          <div className="border divide-y" style={{ background: "var(--lcs-white)", borderRadius: "var(--radius-lcs-control)", borderColor: "var(--lcs-line)" }}>
            {ndaDocs.map((d) => (
              <div key={d.name} className="flex items-center gap-3 px-5 py-3" style={{ borderColor: "var(--lcs-line)" }}>
                <div className="grid h-8 w-8 place-items-center" style={{ background: "var(--lcs-satisfied-wash)", borderRadius: "var(--radius-lcs-control)" }}>
                  <Shield className="h-4 w-4" style={{ color: "var(--lcs-satisfied)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate" style={{ color: "var(--lcs-ink)", fontSize: "13px" }}>{d.name}</div>
                  <div style={{ color: "var(--lcs-ink-muted)", fontSize: "11px" }}>Auto-generated NDA · {new Date(d.createdAt).toLocaleDateString()}</div>
                </div>
                <LcsStatusPill status="satisfied" label="Signed by all" />
                <LcsButton variant="text-link" style={{ height: "28px", padding: "0 6px" }}><Download className="h-4 w-4" /></LcsButton>
              </div>
            ))}
          </div>
        </div>
      )}

      {filteredDocs.length > 0 && (
        <div className="mt-5 overflow-x-auto">
          <LedgerTable>
            <LedgerHead>
              <Tr>
                <Th>Document</Th>
                <Th>Category</Th>
                <Th>Uploader</Th>
                <Th numeric>Size</Th>
                <Th aria-label="Actions" />
              </Tr>
            </LedgerHead>
            <LedgerBody>
              {filteredDocs.map((doc) => {
                const rawName = doc.name || doc.storage_path?.split("/").pop() || "Document";
                const displayName = rawName.replace(/^\d{13}-/, "");
                const ext = displayName.split(".").pop()?.toLowerCase() ?? "";
                const hasSummary = !!doc.ai_summary;
                const isGenerating = generatingSummaryId === doc.id;
                const isEditing = editingSummaryId === doc.id;
                const supportsAI = TEXT_EXTS.has(ext);
                const FileIcon = getFileTypeIcon(ext);
                const fileSize = formatFileSize(doc.file_size ?? null);
                const isPinned = activeDocTab === "All" && pitchDeckDoc?.id === doc.id;

                return (
                  <>
                    <Tr key={doc.id}>
                      <Td>
                        <div className="flex items-center gap-2">
                          <FileIcon className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--lcs-ink-muted)" }} />
                          <span className="font-medium truncate" style={{ color: "var(--lcs-ink)" }}>{displayName}</span>
                          {isPinned && <LcsStatusPill status="pending" label="Pinned" dot={false} />}
                        </div>
                        <div className="mt-0.5" style={{ color: "var(--lcs-ink-muted)", fontSize: "11px" }}>
                          {new Date(doc.created_at).toLocaleDateString()}
                        </div>
                      </Td>
                      <Td>{doc.category || "Other"}</Td>
                      <Td>{doc.uploader?.full_name ?? "Unknown"}</Td>
                      <Td numeric>{fileSize || "—"}</Td>
                      <Td numeric>
                        <div className="flex items-center justify-end gap-1">
                          <LcsButton
                            variant="text-link"
                            onClick={() => { setPreviewDoc(doc); trackDocumentView({ documentId: doc.id }); }}
                            style={{ height: "28px", padding: "0 6px" }}
                            title="Preview"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </LcsButton>
                          <LcsButton
                            variant="text-link"
                            onClick={() => handleDownload(doc.storage_path)}
                            style={{ height: "28px", padding: "0 6px" }}
                            title="Download"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </LcsButton>
                          {isFounder && (
                            <LcsButton
                              variant="text-link"
                              onClick={() => handleDocRemove(doc)}
                              style={{ height: "28px", padding: "0 6px" }}
                              title="Remove from deal room"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </LcsButton>
                          )}
                        </div>
                      </Td>
                    </Tr>
                    {supportsAI && (
                      <Tr>
                        <Td colSpan={5} style={{ padding: "0 16px 8px" }}>
                          {hasSummary ? (
                            <div>
                              <button
                                onClick={() => toggleSummary(doc.id)}
                                className="flex items-center gap-1.5 hover:underline w-full text-left"
                                style={{ color: "var(--lcs-accent)", fontFamily: "var(--font-lcs-ui)", fontSize: "11.5px" }}
                              >
                                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                                <span className="flex-1">AI summary</span>
                                <LcsStatusPill status="pending" label={doc.summary_edited ? "Edited" : "Generated"} dot={false} />
                                {isSummaryExpanded(doc.id)
                                  ? <ChevronUp className="h-3 w-3 shrink-0" />
                                  : <ChevronDown className="h-3 w-3 shrink-0" />}
                              </button>
                              {isSummaryExpanded(doc.id) && (
                                <div className="mt-2 px-3 py-3" style={{ background: "var(--lcs-surface)", borderInlineStart: "2px solid var(--lcs-accent)", borderRadius: "var(--radius-lcs-control)" }}>
                                  {isEditing ? (
                                    <div className="space-y-2">
                                      <textarea
                                        value={summaryEdits[doc.id] ?? ""}
                                        onChange={(e) => setSummaryEdits((s) => ({ ...s, [doc.id]: e.target.value }))}
                                        rows={4}
                                        className="w-full border px-3 py-2 resize-none focus:outline-none"
                                        style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-white)", color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)", borderRadius: "var(--radius-lcs-control)", fontSize: "12px" }}
                                      />
                                      <div className="flex gap-2">
                                        <LcsButton variant="text-link" onClick={() => setEditingSummaryId(null)} style={{ height: "26px", fontSize: "11px" }}>
                                          Cancel
                                        </LcsButton>
                                        <LcsButton
                                          variant="primary"
                                          style={{ height: "26px", fontSize: "11px" }}
                                          onClick={async () => {
                                            const text = summaryEdits[doc.id]?.trim();
                                            if (!text) return;
                                            try {
                                              await callAction(docUpdate, dealRoomId, { documentId: doc.id, patch: { ai_summary: text, summary_edited: true } });
                                            } catch { toast.error("Failed to save summary"); return; }
                                            queryClient.invalidateQueries({ queryKey: ["documents", dealRoomId] });
                                            queryClient.invalidateQueries({ queryKey: ["dd-docs", dealRoomId] });
                                            setEditingSummaryId(null);
                                            setSummaryEdits((s) => { const n = { ...s }; delete n[doc.id]; return n; });
                                            toast.success("Summary saved");
                                          }}
                                        >
                                          Save
                                        </LcsButton>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <p className="whitespace-pre-line" style={{ color: "var(--lcs-ink)", fontSize: "13px", lineHeight: 1.55 }}>
                                        {doc.ai_summary}
                                      </p>
                                      <div className="flex gap-2 mt-2">
                                        <LcsButton variant="text-link" onClick={() => generateSummary(doc)} disabled={isGenerating} style={{ height: "24px", fontSize: "10.5px" }}>
                                          {isGenerating ? "Regenerating" : "Regenerate"}
                                        </LcsButton>
                                        {isFounder && (
                                          <LcsButton
                                            variant="text-link"
                                            style={{ height: "24px", fontSize: "10.5px" }}
                                            onClick={() => {
                                              setEditingSummaryId(doc.id);
                                              setSummaryEdits((s) => ({ ...s, [doc.id]: doc.ai_summary! }));
                                            }}
                                          >
                                            Edit
                                          </LcsButton>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--lcs-accent)" }} />
                              <span className="font-medium flex-1" style={{ color: "var(--lcs-accent)", fontSize: "11.5px" }}>AI summary</span>
                              <span style={{ color: "var(--lcs-ink-muted)", fontSize: "11px" }}>Not generated</span>
                              <LcsButton variant="secondary" onClick={() => generateSummary(doc)} disabled={isGenerating} style={{ height: "26px", fontSize: "11px" }}>
                                {isGenerating
                                  ? <><Loader2 className="h-3 w-3 animate-spin" /> Generating</>
                                  : <><Sparkles className="h-3 w-3" /> Generate</>}
                              </LcsButton>
                            </div>
                          )}
                        </Td>
                      </Tr>
                    )}
                  </>
                );
              })}
            </LedgerBody>
          </LedgerTable>
        </div>
      )}

      {filteredDocs.length === 0 && activeDocTab === "All" && (
        <div className="flex flex-col items-center justify-center text-center">
          <LcsEmptyState title="No documents" text="Documents shared in this deal room appear here." />
          {isFounder && (
            <label className="-mt-4 cursor-pointer">
              <LcsButton variant="primary" style={{ pointerEvents: "none" }}>
                <Upload className="h-4 w-4" /> Upload
              </LcsButton>
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
                  // uploader_id derived server-side from the token (not passed).
                  try {
                    await callAction(docInsert, dealRoomId, {
                      dealRoomId, storagePath: path, fileName: file.name,
                      category: "Other", uploadedByRole: null, fileSize: file.size,
                    });
                  } catch (insErr: any) { console.error("[docs] insert after upload failed:", insErr); toast.error("Upload failed — please try again."); return; }
                  queryClient.invalidateQueries({ queryKey: ["documents", dealRoomId] });
                  toast.success("Uploaded");
                  e.target.value = "";
                  // §B — future migration group: deal_room_members read (deal-room-core group).
                  const { data: members } = await supabase
                    .from("deal_room_members")
                    .select("user_id")
                    .eq("deal_room_id", dealRoomId);
                  const investorMembers = (members ?? []).filter((m: any) => m.user_id !== userId);
                  if (investorMembers.length > 0) {
                    // §B — future migration group: notifications insert (notifications group).
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
          <div className="uppercase font-medium mb-2 mt-4" style={{ color: "var(--lcs-ink-muted)", fontSize: "11px", letterSpacing: "0.09em" }}>
            Recommended for this category
          </div>
          <div className="border divide-y overflow-hidden" style={{ borderRadius: "var(--radius-lcs-control)", borderStyle: "dashed", borderColor: "var(--lcs-line)" }}>
            {expectedForTab.map((expected) => (
              <div key={expected.name} className="flex items-center gap-3 px-4 py-3" style={{ background: "var(--lcs-surface)", borderColor: "var(--lcs-line)" }}>
                <div className="grid h-8 w-8 place-items-center border shrink-0" style={{ background: "var(--lcs-white)", borderColor: "var(--lcs-line)", borderRadius: "var(--radius-lcs-control)" }}>
                  <FileText className="h-4 w-4" style={{ color: "var(--lcs-ink-muted)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div style={{ color: "var(--lcs-ink-muted)", fontSize: "13px" }}>{expected.name}</div>
                  <LcsStatusPill status="attention" label="Not provided" dot={false} />
                </div>
                {isFounder && (
                  <label className="cursor-pointer shrink-0">
                    <LcsButton variant="secondary" style={{ pointerEvents: "none" }}>
                      <Upload className="h-3 w-3" /> Upload
                    </LcsButton>
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
                        // uploader_id derived server-side from the token (not passed).
                        try {
                          await callAction(docInsert, dealRoomId, {
                            dealRoomId, storagePath: path, fileName: file.name,
                            category: expected.category, uploadedByRole: null, fileSize: file.size,
                          });
                        } catch (insErr: any) { console.error("[docs] insert after upload failed:", insErr); toast.error("Upload failed — please try again."); return; }
                        queryClient.invalidateQueries({ queryKey: ["documents", dealRoomId] });
                        toast.success(`${file.name} uploaded`);
                        e.target.value = "";
                        // §B — future migration group: deal_room_members read (deal-room-core group).
                        const { data: members } = await supabase
                          .from("deal_room_members")
                          .select("user_id")
                          .eq("deal_room_id", dealRoomId);
                        const investorMembers = (members ?? []).filter((m: any) => m.user_id !== userId);
                        if (investorMembers.length > 0) {
                          // §B — future migration group: notifications insert (notifications group).
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
              <h3 className="font-medium flex items-center gap-2" style={{ color: "var(--lcs-ink)", fontSize: "13.5px" }}>
                <LcsStatusPill status="satisfied" label="Investor documents" dot={false} />
              </h3>
              <p className="mt-0.5" style={{ color: "var(--lcs-ink-muted)", fontSize: "11px" }}>
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
            <div className="border p-8 text-center" style={{ borderRadius: "var(--radius-lcs-control)", borderStyle: "dashed", borderColor: "var(--lcs-line)" }}>
              <FileText className="h-8 w-8 mx-auto mb-2" style={{ color: "var(--lcs-ink-muted)" }} />
              <p style={{ color: "var(--lcs-ink-muted)", fontSize: "13px" }}>No investor documents</p>
            </div>
          )}

          {visibleInvestorDocs.length > 0 && (
            <div className="overflow-x-auto">
              <LedgerTable>
                <LedgerHead>
                  <Tr>
                    <Th>Document</Th>
                    <Th>Uploader</Th>
                    <Th>Visibility</Th>
                    <Th aria-label="Actions" />
                  </Tr>
                </LedgerHead>
                <LedgerBody>
                  {visibleInvestorDocs.map((doc: any) => {
                    const rawName = doc.name || doc.storage_path?.split("/").pop() || "Document";
                    const displayName = rawName.replace(/^\d{13}-/, "");
                    const ext = displayName.split(".").pop()?.toLowerCase() ?? "";
                    const FileIcon = getFileTypeIcon(ext);
                    const currentVisibility = investorDocVisibility[doc.id] ?? doc.visibility ?? "shared";

                    return (
                      <Tr key={doc.id} status="satisfied">
                        <Td>
                          <div className="flex items-center gap-2">
                            <FileIcon className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--lcs-ink-muted)" }} />
                            <span className="font-medium truncate" style={{ color: "var(--lcs-ink)" }}>{displayName}</span>
                          </div>
                          <div className="mt-0.5" style={{ color: "var(--lcs-ink-muted)", fontSize: "11px" }}>
                            {new Date(doc.created_at).toLocaleDateString()}
                          </div>
                        </Td>
                        <Td>{doc.uploader?.full_name ?? "Investor"}</Td>
                        <Td>
                          {isInvestor ? (
                            <div className="flex items-center gap-1">
                              {(["shared", "private"] as const).map((v) => (
                                <button
                                  key={v}
                                  onClick={() => updateDocVisibility(doc.id, v)}
                                  className="px-2 py-1 font-medium transition-colors"
                                  style={{
                                    fontFamily: "var(--font-lcs-ui)",
                                    borderRadius: "var(--radius-lcs-control)",
                                    fontSize: "10.5px",
                                    background: currentVisibility === v ? "var(--lcs-progress-wash)" : "transparent",
                                    color: currentVisibility === v ? "var(--lcs-accent)" : "var(--lcs-ink-muted)",
                                    border: currentVisibility === v ? "1px solid var(--lcs-accent)" : "1px solid transparent",
                                  }}
                                >
                                  {v === "shared" ? "Shared" : "Private"}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <LcsStatusPill status="satisfied" label="Shared" dot={false} />
                          )}
                        </Td>
                        <Td numeric>
                          <div className="flex items-center justify-end gap-1">
                            <LcsButton variant="text-link" onClick={() => handleDownload(doc.storage_path)} style={{ height: "28px", padding: "0 6px" }} title="Download">
                              <Download className="h-3.5 w-3.5" />
                            </LcsButton>
                            {isInvestor && (
                              <LcsButton variant="text-link" onClick={() => removeInvestorDoc(doc.id)} style={{ height: "28px", padding: "0 6px" }} title="Remove">
                                <Trash2 className="h-3.5 w-3.5" />
                              </LcsButton>
                            )}
                          </div>
                        </Td>
                      </Tr>
                    );
                  })}
                </LedgerBody>
              </LedgerTable>
            </div>
          )}
        </div>
      )}
      </>)}

      {activeVaultTab === "links" && (
        <div className="mt-5">
          {(dealRoomLinks as any[]).length === 0 && (
            <div className="border p-10 text-center" style={{ borderRadius: "var(--radius-lcs-control)", borderStyle: "dashed", borderColor: "var(--lcs-line)" }}>
              <LinkIcon className="h-8 w-8 mx-auto mb-2" style={{ color: "var(--lcs-ink-muted)" }} />
              <p className="font-medium" style={{ color: "var(--lcs-ink)", fontSize: "13.5px" }}>No links</p>
              <p className="mt-1" style={{ color: "var(--lcs-ink-muted)", fontSize: "12px" }}>Add product videos, recordings, external documents, or any URL.</p>
              <div className="mt-4">
                <LcsButton variant="primary" onClick={() => setShowAddLink(true)}>
                  <Plus className="h-4 w-4" /> Add first link
                </LcsButton>
              </div>
            </div>
          )}
          {(dealRoomLinks as any[]).length > 0 && (
            <div className="overflow-x-auto">
              <LedgerTable>
                <LedgerHead>
                  <Tr>
                    <Th>Link</Th>
                    <Th>URL</Th>
                    <Th aria-label="Actions" />
                  </Tr>
                </LedgerHead>
                <LedgerBody>
                  {(dealRoomLinks as any[]).map((link: any) => (
                    <Tr key={link.id}>
                      <Td>
                        <div className="flex items-center gap-2">
                          <LinkIcon className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--lcs-ink-muted)" }} />
                          <span className="font-medium truncate" style={{ color: "var(--lcs-ink)" }}>{link.name}</span>
                        </div>
                      </Td>
                      <Td>
                        <span className="truncate block" style={{ color: "var(--lcs-ink-muted)" }}>{link.url}</span>
                      </Td>
                      <Td numeric>
                        <div className="flex items-center justify-end gap-1">
                          <a href={link.url} target="_blank" rel="noopener noreferrer" title="Open link">
                            <LcsButton variant="text-link" style={{ height: "28px", padding: "0 6px", pointerEvents: "none" }}>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </LcsButton>
                          </a>
                          {link.uploader_id === userId && (
                            <LcsButton variant="text-link" onClick={() => removeLink(link.id)} style={{ height: "28px", padding: "0 6px" }} title="Remove link">
                              <Trash2 className="h-3.5 w-3.5" />
                            </LcsButton>
                          )}
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </LedgerBody>
              </LedgerTable>
            </div>
          )}
        </div>
      )}

      {showAddLink && (
        <div
          className="fixed inset-0 z-50 grid place-items-center p-4"
          style={{ background: "rgba(22,24,28,0.4)" }}
          onClick={() => setShowAddLink(false)}
        >
          <div
            className="w-full max-w-md border"
            style={{ background: "var(--lcs-white)", borderColor: "var(--lcs-line)", borderRadius: "var(--radius-lcs-control)", fontFamily: "var(--font-lcs-ui)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5" style={{ height: "40px", borderBottom: "1px solid var(--lcs-line)" }}>
              <div className="font-medium" style={{ color: "var(--lcs-ink)", fontSize: "13.5px" }}>Add a link</div>
              <LcsButton variant="text-link" onClick={() => setShowAddLink(false)} style={{ height: "28px", padding: "0 6px" }}>
                <X className="h-4 w-4" />
              </LcsButton>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="uppercase mb-1.5 block" style={{ color: "var(--lcs-ink-muted)", fontSize: "11px", letterSpacing: "0.09em" }}>Link name</label>
                <input
                  value={linkName}
                  onChange={(e) => setLinkName(e.target.value)}
                  placeholder="e.g. Product demo video, financial model"
                  className="w-full border px-3 focus:outline-none"
                  style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-white)", color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)", height: "36px", borderRadius: "var(--radius-lcs-control)", fontSize: "13.5px" }}
                />
              </div>
              <div>
                <label className="uppercase mb-1.5 block" style={{ color: "var(--lcs-ink-muted)", fontSize: "11px", letterSpacing: "0.09em" }}>URL</label>
                <input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://"
                  type="url"
                  className="w-full border px-3 focus:outline-none"
                  style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-white)", color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)", height: "36px", borderRadius: "var(--radius-lcs-control)", fontSize: "13.5px" }}
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <LcsButton variant="secondary" onClick={() => setShowAddLink(false)}>Cancel</LcsButton>
                <LcsButton variant="primary" onClick={addLink} disabled={!linkName.trim() || !linkUrl.trim() || addingLink}>
                  {addingLink ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Add link
                </LcsButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {previewDoc && (
        <DocPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
      )}

      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(22,24,28,0.4)" }}
          onClick={() => setViewingDoc(null)}>
          <div className="border w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
            style={{ background: "var(--lcs-white)", borderColor: "var(--lcs-line)", borderRadius: "var(--radius-lcs-control)", fontFamily: "var(--font-lcs-ui)" }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6" style={{ borderBottom: "1px solid var(--lcs-line)" }}>
              <div>
                <h2 className="font-medium" style={{ color: "var(--lcs-ink)", fontSize: "15px" }}>{viewingDoc.title}</h2>
                <p className="mt-1" style={{ color: "var(--lcs-ink-muted)", fontSize: "11px" }}>
                  {viewingDoc.completeness_score}% complete · Updated {formatRelativeTime(viewingDoc.updated_at)}
                </p>
              </div>
              <LcsButton variant="text-link" onClick={() => setViewingDoc(null)} style={{ height: "28px", padding: "0 6px" }}>
                <X className="h-4 w-4" />
              </LcsButton>
            </div>
            <div className="overflow-y-auto p-6 space-y-4 flex-1">
              {viewingDoc.content && Object.entries(viewingDoc.content as Record<string, string>)
                .filter(([, v]) => v && String(v).trim())
                .map(([key, value]) => (
                  <div key={key}>
                    <p className="uppercase mb-1" style={{ color: "var(--lcs-ink-muted)", fontSize: "11px", letterSpacing: "0.09em" }}>{key.replace(/_/g, " ")}</p>
                    <p className="whitespace-pre-wrap" style={{ color: "var(--lcs-ink-muted)", fontSize: "13px", lineHeight: 1.55 }}>{String(value)}</p>
                  </div>
                ))
              }
              {(!viewingDoc.content || Object.keys(viewingDoc.content).length === 0) && (
                <p className="text-center py-8" style={{ color: "var(--lcs-ink-muted)", fontSize: "13px" }}>No content available</p>
              )}
            </div>
            {viewingDoc.ai_feedback && (viewingDoc.ai_feedback as Record<string, unknown>).overall_score && (
              <div className="p-4 flex items-center gap-3" style={{ borderTop: "1px solid var(--lcs-line)" }}>
                <div style={{ color: "var(--lcs-ink-muted)", fontSize: "11.5px" }}>
                  {String((viewingDoc.ai_feedback as Record<string, unknown>).summary ?? "").substring(0, 120)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// §B — future migration group: founder_documents (profile/founder group).
// Presentation of a list already re-skinned onto v2; the data source itself is
// unchanged. Extracted only to avoid repeating the three near-identical blocks
// that existed in the original (stage1 / stage2 / non-investor).
function PlatformDocList({ docs, onView, showStage }: { docs: any[]; onView: (doc: any) => void; showStage?: boolean }) {
  return (
    <div className="space-y-2">
      {docs.map((doc: any) => (
        <div key={doc.id}
          className="flex items-center justify-between px-4 py-3 border transition-colors hover:bg-[var(--lcs-progress-wash)]"
          style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-white)", borderRadius: "var(--radius-lcs-control)" }}>
          <div className="flex items-center gap-3 min-w-0">
            {/* Decorative "≡" glyph replaced with a real icon — CLAUDE.md §13
                bans decorative iconography regardless of colour, same standard
                already applied to Group 1's search-modal type-icons. */}
            <div className="w-8 h-8 flex items-center justify-center shrink-0" style={{ background: "var(--lcs-progress-wash)", color: "var(--lcs-accent)", borderRadius: "var(--radius-lcs-control)" }}>
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate" style={{ color: "var(--lcs-ink)", fontSize: "13px" }}>{doc.title}</p>
              <p className="mt-0.5" style={{ color: "var(--lcs-ink-muted)", fontSize: "11px" }}>
                {doc.document_templates?.category
                  ? doc.document_templates.category.charAt(0).toUpperCase() + doc.document_templates.category.slice(1)
                  : "Document"}
                {" · "}Updated {formatRelativeTime(doc.updated_at)}
                {showStage && (
                  <> {" · "}<span className="font-medium" style={{ color: "var(--lcs-accent)" }}>
                    Stage {(doc.deal_room_stage ?? 1) === 2 ? "2 — Full diligence" : "1 — Initial review"}
                  </span></>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <LcsStatusPill status={doc.status === "complete" ? "satisfied" : "attention"} label={doc.status === "complete" ? "Complete" : "In progress"} dot={false} />
            <LcsButton variant="secondary" onClick={() => onView(doc)} style={{ height: "28px", fontSize: "11px" }}>
              View
            </LcsButton>
          </div>
        </div>
      ))}
    </div>
  );
}
